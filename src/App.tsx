import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import {
  HARD_LIMIT,
  activeOutcomes,
  WARN_THRESHOLD,
  countCombinations,
  formatBig,
  formatMoney,
  formatOdds,
  formatPct,
  generate,
  pickLabel,
  rowIndexOf,
  rowPicks,
} from './lib/combinatorics';
import { loadGames, loadPref, makeGame, sampleGames, saveGames, savePref } from './lib/storage';
import type { Game, Generated, Outcome } from './lib/types';
import { OUTCOME_SYMBOL } from './lib/types';
import { GameSidebar } from './components/GameSidebar';
import { GraphView } from './components/GraphView';
import { TableView } from './components/TableView';
import { ProbabilityPanel } from './components/ProbabilityPanel';
import { Button, Icon, ICONS, OutcomePill, SlipChips, Stat } from './components/ui';

type Tab = 'games' | 'graph' | 'table' | 'prob';
interface Toast {
  id: number;
  msg: string;
  kind: 'info' | 'loading' | 'error';
}

function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

const gamesSignature = (games: Game[]) =>
  JSON.stringify(games.map((g) => [g.home, g.away, g.active, g.trusted ?? null, g.odds ?? null]));

const TAB_IDS: Tab[] = ['games', 'graph', 'table', 'prob'];

export default function App() {
  const [games, setGames] = useState<Game[]>(loadGames);
  const [gen, setGen] = useState<Generated | null>(null);
  const [picks, setPicks] = useState<Outcome[]>([]);
  const [tab, setTab] = useState<Tab>(() => {
    const t = loadPref('tab') as Tab;
    return TAB_IDS.includes(t) ? t : 'graph';
  });
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmLarge, setConfirmLarge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number>(() => {
    const v = Number(loadPref('balance'));
    return Number.isFinite(v) && v > 0 ? v : 100;
  });
  useEffect(() => savePref('balance', String(balance)), [balance]);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const wide = useMediaQuery('(min-width: 1280px)');
  const toastId = useRef(0);

  // On desktop the games list is a sidebar and (on wide screens) probability is a side rail,
  // so those "tabs" only exist on smaller screens.
  const view: Tab = (desktop && tab === 'games') || (wide && tab === 'prob') ? 'graph' : tab;

  useEffect(() => saveGames(games), [games]);
  useEffect(() => savePref('tab', tab), [tab]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    savePref('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toast = useCallback((msg: string, kind: Toast['kind'] = 'info', ms = 2400) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, kind }]);
    if (ms > 0) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
    return id;
  }, []);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const total = useMemo(() => countCombinations(games), [games]);
  const stale = gen !== null && gamesSignature(gen.games) !== gamesSignature(games);
  const tooMany = !Number.isFinite(total) || total > HARD_LIMIT;

  const runGenerate = useCallback(
    (list: Game[], onDone?: () => void) => {
      setConfirmLarge(false);
      if (list.length === 0) {
        setGen(null);
        setPicks([]);
        return;
      }
      setBusy(true);
      const big = countCombinations(list) > 20_000;
      const loadingId = big ? toast(`Generating ${formatBig(countCombinations(list))} combinations…`, 'loading', 0) : -1;
      // Let the loading toast paint before the (synchronous) generation runs.
      setTimeout(() => {
        try {
          const g = generate(list);
          setGen(g);
          setPicks(rowPicks(g, 0));
          toast(`Generated ${g.total.toLocaleString()} combinations in ${g.elapsedMs.toFixed(0)} ms`);
          onDone?.();
        } catch (e) {
          toast((e as Error).message, 'error', 5000);
        } finally {
          if (loadingId >= 0) dismiss(loadingId);
          setBusy(false);
        }
      }, big ? 50 : 0);
    },
    [toast],
  );

  // On phones, generating from the Games tab jumps to the graph so you see the result.
  const afterGenerate = () => {
    if (!desktop && tab === 'games') setTab('graph');
  };

  const onGenerate = () => {
    if (games.length === 0) return runGenerate([]);
    if (tooMany) {
      toast(`${formatBig(total)} combinations is above the ${HARD_LIMIT.toLocaleString()} limit. Remove games or outcomes.`, 'error', 5000);
      return;
    }
    if (total > WARN_THRESHOLD) setConfirmLarge(true);
    else runGenerate(games, afterGenerate);
  };

  // Generate the preloaded sample immediately on first load.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const t = countCombinations(games);
    if (games.length > 0 && t <= WARN_THRESHOLD) runGenerate(games);
  }, [games, runGenerate]);

  const selectedRow = gen ? rowIndexOf(gen, picks) : -1;
  const hasSlip = gen !== null && picks.length === gen.games.length;

  const randomSlip = () => {
    if (!gen) return;
    setPicks(rowPicks(gen, Math.floor(Math.random() * gen.total)));
  };

  const sidebar = (
    <GameSidebar
      games={games}
      onChange={setGames}
      onAdd={(count = 1) => setGames((g) => [...g, ...Array.from({ length: count }, () => makeGame())])}
      onLoadSample={() => setGames(sampleGames())}
      onClear={() => setGames([])}
      balance={balance}
      onBalanceChange={setBalance}
      totalSlips={Number.isFinite(total) ? total : 0}
    />
  );

  const desktopTabs: { id: Tab; label: string; className?: string }[] = [
    { id: 'graph', label: 'Graph view' },
    { id: 'table', label: 'Table view' },
    { id: 'prob', label: 'Probability', className: 'xl:hidden' },
  ];
  const mobileTabs: { id: Tab; label: string; icon: string; badge?: string }[] = [
    { id: 'games', label: 'Games', icon: ICONS.list, badge: stale ? '•' : String(games.length) },
    { id: 'graph', label: 'Graph', icon: ICONS.graph },
    { id: 'table', label: 'Slips', icon: ICONS.table },
    { id: 'prob', label: 'Odds', icon: ICONS.percent },
  ];

  const comboLabel = games.length === 0 ? '0' : formatBig(total);
  const comboTone = tooMany ? 'error' : total > WARN_THRESHOLD ? 'warn' : undefined;
  const showMobileGenerate = !desktop && (view === 'games' || stale || !gen);

  let content: React.ReactNode;
  if (view === 'games') {
    content = sidebar;
  } else if (!gen) {
    content = (
      <EmptyState
        hasGames={games.length > 0}
        onAdd={() => {
          setGames([makeGame()]);
          if (!desktop) setTab('games');
        }}
        onSample={() => setGames(sampleGames())}
        onGenerate={onGenerate}
      />
    );
  } else if (view === 'graph') {
    content = (
      <ReactFlowProvider>
        <GraphView gen={gen} picks={picks} onSelect={setPicks} dark={dark} vertical={!desktop} />
      </ReactFlowProvider>
    );
  } else if (view === 'table') {
    content = (
      <TableView
        gen={gen}
        balance={balance}
        compact={!desktop}
        selectedRow={selectedRow}
        onSelectRow={(r) => setPicks(rowPicks(gen, r))}
        onToast={(m) => toast(m)}
      />
    );
  } else {
    content = (
      <div className="h-full overflow-y-auto">
        <ProbabilityPanel gen={gen} picks={picks} balance={balance} />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-ink-950 bg-ink-900 px-3 py-2 text-white sm:px-4 sm:py-2.5 dark:border-ink-800 dark:bg-ink-950">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src="./favicon.svg" alt="" className="size-8 shrink-0" />
          <div className="min-w-0 leading-tight">
            <h1 className="text-lg font-bold tracking-tight">Dflow</h1>
            <p className="truncate text-[11px] text-ink-400">Betting slip outcome explorer</p>
          </div>
        </div>

        {/* Desktop stats */}
        <div className="ml-4 hidden items-center gap-5 lg:flex">
          <Stat label="Games" value={games.length} />
          <Stat label="Total combinations" value={comboLabel} tone={comboTone} />
          {games.length > 0 && (
            <span className="hidden text-xs text-ink-400 xl:inline" title="Product of active outcomes per game">
              = {games.map((g) => activeOutcomes(g).length).join(' × ')}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Mobile combinations pill */}
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums lg:hidden ${
              comboTone === 'error'
                ? 'bg-flame-600 text-white'
                : comboTone === 'warn'
                  ? 'bg-gold-400 text-ink-950'
                  : 'bg-white/10 text-white ring-1 ring-white/15'
            }`}
            title="Total combinations"
          >
            {comboLabel} slips
          </span>
          {stale && (
            <span className="hidden rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-medium text-brand-300 ring-1 ring-brand-500/30 lg:inline">
              Inputs changed
            </span>
          )}
          <span className="hidden lg:contents">
            <Button variant="cta" onClick={onGenerate} disabled={busy}>
              <Icon d={ICONS.play} className="size-3.5" /> {busy ? 'Generating…' : 'Generate'}
            </Button>
          </span>
          <Button variant="ghost" className="!px-2.5 !text-ink-200 hover:!bg-white/10" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" title="Toggle dark mode">
            <Icon d={dark ? ICONS.sun : ICONS.moon} />
          </Button>
        </div>
      </header>

      {total > WARN_THRESHOLD && (
        <div
          className={`flex items-start gap-2 px-4 py-1.5 text-xs ${
            tooMany ? 'bg-flame-50 text-flame-800 dark:bg-flame-950/60 dark:text-flame-200' : 'bg-gold-50 text-gold-900 dark:bg-gold-950/50 dark:text-gold-200'
          }`}
        >
          <Icon d={ICONS.alert} className="mt-px size-3.5 shrink-0" />
          {tooMany
            ? `${formatBig(total)} combinations is over the ${HARD_LIMIT.toLocaleString()} limit. Remove games or untick outcomes.`
            : `${formatBig(total)} combinations is a lot — generating and filtering may be slow. Consider fewer games or outcomes.`}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-[340px] shrink-0 border-r border-ink-200 bg-ink-50 lg:block dark:border-ink-800 dark:bg-ink-900/50">
          {sidebar}
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="hidden items-center gap-1 border-b border-ink-200 bg-white px-3 lg:flex dark:border-ink-800 dark:bg-ink-900" role="tablist">
            {desktopTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={view === t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${t.className ?? ''} ${
                  view === t.id
                    ? 'border-brand-500 text-ink-900 dark:border-brand-500 dark:text-white'
                    : 'border-transparent text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {hasSlip && view !== 'games' && <SlipBar gen={gen} picks={picks} row={selectedRow} balance={balance} onRandom={randomSlip} />}

          <div className={`min-h-0 flex-1 ${view === 'games' ? 'bg-ink-50 dark:bg-ink-950' : 'bg-white dark:bg-ink-950'}`}>{content}</div>
        </main>

        {/* Probability rail (wide screens) */}
        {hasSlip && (
          <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-ink-200 bg-ink-50 xl:block dark:border-ink-800 dark:bg-ink-900/50">
            <div className="border-b border-ink-200 px-4 py-3 dark:border-ink-800">
              <h2 className="text-sm font-semibold">Probability</h2>
              <p className="text-xs text-ink-500 dark:text-ink-400">From your odds, or equal chances where a game has none</p>
            </div>
            <ProbabilityPanel gen={gen} picks={picks} balance={balance} />
          </aside>
        )}
      </div>

      {/* Mobile: generate bar + bottom navigation */}
      {showMobileGenerate && (
        <div className="border-t border-ink-200 bg-white px-3 py-2 lg:hidden dark:border-ink-800 dark:bg-ink-900">
          <Button variant="cta" className="!h-11 w-full !text-base" onClick={onGenerate} disabled={busy || games.length === 0 || tooMany}>
            <Icon d={ICONS.play} className="size-4" />
            {busy
              ? 'Generating…'
              : games.length === 0
                ? 'Add a game to start'
                : tooMany
                  ? 'Too many combinations'
                  : `${stale ? 'Update' : 'Generate'} ${comboLabel} slips`}
          </Button>
        </div>
      )}
      <nav
        className="grid grid-cols-4 border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-ink-800 dark:bg-ink-900"
        role="tablist"
        aria-label="Sections"
      >
        {mobileTabs.map((t) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? 'text-ink-900 dark:text-white' : 'text-ink-500 dark:text-ink-400'
              }`}
            >
              {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-brand-500" />}
              <span className="relative">
                <Icon d={t.icon} className="size-5" />
                {t.badge && (
                  <span
                    className={`absolute -right-3 -top-1.5 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-bold ${
                      t.badge === '•' ? 'bg-brand-500 text-ink-950' : 'bg-ink-200 text-ink-700 dark:bg-ink-700 dark:text-ink-200'
                    }`}
                  >
                    {t.badge === '•' ? '!' : t.badge}
                  </span>
                )}
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Confirm large generation */}
      {confirmLarge && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="warn-title">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:pb-5 dark:bg-ink-900">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-gold-100 p-2 text-gold-700 dark:bg-gold-950 dark:text-gold-300">
                <Icon d={ICONS.alert} className="size-5" />
              </div>
              <div>
                <h2 id="warn-title" className="font-semibold">Generate {formatBig(total)} combinations?</h2>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                  That's more than {WARN_THRESHOLD.toLocaleString()}. It will work, but the table may be slow to sort and filter, and the graph will use the compact layered view.
                  Consider removing a game or unticking outcomes you're confident about.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button className="!h-11 sm:!h-9" onClick={() => setConfirmLarge(false)}>
                Cancel
              </Button>
              <Button variant="cta" className="!h-11 sm:!h-9" onClick={() => runGenerate(games, afterGenerate)}>
                Generate anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts: under the header on phones, bottom-centre on desktop */}
      <div className="pointer-events-none fixed inset-x-3 top-16 z-50 flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-4 lg:left-1/2 lg:top-auto lg:-tranink-x-1/2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast pointer-events-auto flex max-w-full items-center gap-2 rounded-lg px-3.5 py-2 text-sm shadow-lg ${
              t.kind === 'error' ? 'bg-flame-600 text-white' : 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900'
            }`}
          >
            {t.kind === 'loading' && <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlipBar({
  gen,
  picks,
  row,
  balance,
  onRandom,
}: {
  gen: Generated;
  picks: Outcome[];
  row: number;
  balance: number;
  onRandom: () => void;
}) {
  const shown = picks.slice(0, 12);
  const odds = gen.rowOdds[row];
  const ret = balance * odds;
  const money = gen.hasOdds && Number.isFinite(odds);
  return (
    <div className="flex items-center gap-2 border-b border-ink-200 bg-brand-50/70 px-3 py-1.5 text-xs dark:border-ink-800 dark:bg-brand-950/30">
      <div className="flex shrink-0 flex-col leading-tight lg:flex-row lg:items-center lg:gap-2">
        <span className="font-semibold text-ink-900 dark:text-white">Slip #{(row + 1).toLocaleString()}</span>
        <span className="tabular-nums text-ink-500 lg:hidden dark:text-ink-400">
          {money ? `@ ${formatOdds(odds)}` : formatPct(gen.rowProb[row] ?? 0)}
        </span>
      </div>
      {/* Phones: compact coloured chips. Desktop: full pick names. */}
      <SlipChips picks={picks} className="min-w-0 flex-1 lg:hidden" />
      <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5 lg:flex">
        {shown.map((o, g) => (
          <OutcomePill key={g} outcome={o} className="shrink-0" label={`${OUTCOME_SYMBOL[o]} ${pickLabel(gen.games[g], o)}`} />
        ))}
        {picks.length > shown.length && <span className="shrink-0 text-ink-500">+{picks.length - shown.length} more</span>}
      </div>
      {money ? (
        <span className="shrink-0 text-right leading-tight tabular-nums">
          <span className="hidden text-ink-500 lg:inline dark:text-ink-400">Odds {formatOdds(odds)} · </span>
          <span className="block text-[10px] text-ink-500 lg:hidden dark:text-ink-400">returns</span>
          <span className="font-semibold text-brand-700 dark:text-brand-400">
            <span className="hidden lg:inline">Returns </span>
            {formatMoney(ret)}
          </span>
        </span>
      ) : (
        <span className="hidden shrink-0 tabular-nums text-ink-600 lg:inline dark:text-ink-300">P = {formatPct(gen.rowProb[row] ?? 0)}</span>
      )}
      <Button size="sm" variant="ghost" className="!h-9 lg:!h-8" onClick={onRandom} title="Pick a random slip" aria-label="Pick a random slip">
        <Icon d={ICONS.shuffle} className="size-4 lg:size-3.5" />
        <span className="hidden sm:inline">Random</span>
      </Button>
    </div>
  );
}

function EmptyState({ hasGames, onAdd, onSample, onGenerate }: { hasGames: boolean; onAdd: () => void; onSample: () => void; onGenerate: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex w-fit gap-2">
          <span className="size-3 rounded-full bg-brand-500" />
          <span className="size-3 rounded-full bg-white ring-1 ring-ink-400" />
          <span className="size-3 rounded-full bg-ink-900 dark:ring-1 dark:ring-ink-400" />
        </div>
        <h2 className="text-lg font-semibold">{hasGames ? 'Ready when you are' : 'No games yet'}</h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          {hasGames
            ? 'Press Generate to build every combination of your games.'
            : 'Add games, or load the five sample fixtures to see the 243-combination graph.'}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {hasGames ? (
            <Button variant="cta" onClick={onGenerate}>Generate</Button>
          ) : (
            <>
              <Button variant="primary" onClick={onSample}>Load sample games</Button>
              <Button onClick={onAdd}>Add a game</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
