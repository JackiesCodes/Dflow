import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import {
  HARD_LIMIT,
  WARN_THRESHOLD,
  countCombinations,
  formatBig,
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
import { Button, Icon, ICONS, OutcomePill, Stat } from './components/ui';

type Tab = 'graph' | 'table' | 'prob';
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
  JSON.stringify(games.map((g) => [g.home, g.away, g.active, g.weights]));

export default function App() {
  const [games, setGames] = useState<Game[]>(loadGames);
  const [gen, setGen] = useState<Generated | null>(null);
  const [picks, setPicks] = useState<Outcome[]>([]);
  const [tab, setTab] = useState<Tab>(() => (loadPref('tab') as Tab) || 'graph');
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmLarge, setConfirmLarge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const wide = useMediaQuery('(min-width: 1280px)');
  const toastId = useRef(0);

  useEffect(() => saveGames(games), [games]);
  useEffect(() => savePref('tab', tab), [tab]);
  useEffect(() => {
    if (wide && tab === 'prob') setTab('graph');
  }, [wide, tab]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    savePref('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toast = useCallback((msg: string, kind: Toast['kind'] = 'info', ms = 2600) => {
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
    (list: Game[]) => {
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

  const onGenerate = () => {
    if (games.length === 0) return runGenerate([]);
    if (tooMany) {
      toast(`${formatBig(total)} combinations is above the ${HARD_LIMIT.toLocaleString()} limit. Remove games or outcomes.`, 'error', 5000);
      return;
    }
    if (total > WARN_THRESHOLD) setConfirmLarge(true);
    else runGenerate(games);
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
    />
  );

  const tabs: { id: Tab; label: string; className?: string }[] = [
    { id: 'graph', label: 'Graph view' },
    { id: 'table', label: 'Table view' },
    { id: 'prob', label: 'Probability', className: 'xl:hidden' },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="rounded-md p-1.5 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
            onClick={() => setDrawer(true)}
            aria-label="Open games panel"
          >
            <Icon d={ICONS.menu} className="size-5" />
          </button>
          <img src="./favicon.svg" alt="" className="size-7" />
          <div className="leading-tight">
            <h1 className="text-lg font-bold tracking-tight">Dflow</h1>
            <p className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">Betting slip outcome explorer</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Stat label="Games" value={games.length} />
          <Stat
            label="Total combinations"
            value={games.length === 0 ? '0' : formatBig(total)}
            tone={tooMany ? 'error' : total > WARN_THRESHOLD ? 'warn' : undefined}
          />
          {games.length > 0 && (
            <span className="hidden text-xs text-slate-400 md:inline" title="Product of active outcomes per game">
              = {games.map((g) => g.active.filter(Boolean).length).join(' × ')}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {stale && <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 sm:inline dark:bg-amber-950 dark:text-amber-300">Inputs changed</span>}
          <Button variant="primary" onClick={onGenerate} disabled={busy}>
            <Icon d={ICONS.play} className="size-3.5" /> {busy ? 'Generating…' : 'Generate'}
          </Button>
          <Button variant="ghost" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" title="Toggle dark mode">
            <Icon d={dark ? ICONS.sun : ICONS.moon} />
          </Button>
        </div>
      </header>

      {total > WARN_THRESHOLD && (
        <div className={`flex items-center gap-2 px-4 py-1.5 text-xs ${tooMany ? 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'}`}>
          <Icon d={ICONS.alert} className="size-3.5 shrink-0" />
          {tooMany
            ? `${formatBig(total)} combinations exceeds the ${HARD_LIMIT.toLocaleString()} limit. Remove games or untick some outcomes.`
            : `${formatBig(total)} combinations is a lot (over ${WARN_THRESHOLD.toLocaleString()}). Consider reducing games or outcomes — generation and filtering may be slow.`}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-[340px] shrink-0 border-r border-slate-200 bg-slate-50 lg:block dark:border-slate-800 dark:bg-slate-900/50">
          {sidebar}
        </aside>

        {/* Sidebar (mobile drawer) */}
        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawer(false)} />
            <div className="absolute inset-y-0 left-0 w-[min(360px,92vw)] bg-slate-50 pt-10 shadow-xl dark:bg-slate-900">
              <button
                type="button"
                className="absolute right-2 top-1.5 z-10 rounded-md p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800"
                onClick={() => setDrawer(false)}
                aria-label="Close games panel"
              >
                <Icon d={ICONS.x} />
              </button>
              {sidebar}
            </div>
          </div>
        )}

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${t.className ?? ''} ${
                  tab === t.id
                    ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {gen && picks.length === gen.games.length && (
            <SlipBar gen={gen} picks={picks} row={selectedRow} onRandom={randomSlip} />
          )}

          <div className="min-h-0 flex-1 bg-white dark:bg-slate-950">
            {!gen ? (
              <EmptyState hasGames={games.length > 0} onAdd={() => setGames([makeGame()])} onSample={() => setGames(sampleGames())} onGenerate={onGenerate} />
            ) : tab === 'graph' ? (
              <ReactFlowProvider>
                <GraphView gen={gen} picks={picks} onSelect={setPicks} dark={dark} />
              </ReactFlowProvider>
            ) : tab === 'table' ? (
              <TableView gen={gen} selectedRow={selectedRow} onSelectRow={(r) => setPicks(rowPicks(gen, r))} onToast={(m) => toast(m)} />
            ) : (
              <div className="h-full overflow-y-auto">
                <ProbabilityPanel gen={gen} picks={picks} />
              </div>
            )}
          </div>
        </main>

        {/* Probability rail (wide screens) */}
        {gen && picks.length === gen.games.length && (
          <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50 xl:block dark:border-slate-800 dark:bg-slate-900/50">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold">Probability</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Equal odds unless you set custom weights</p>
            </div>
            <ProbabilityPanel gen={gen} picks={picks} />
          </aside>
        )}
      </div>

      {/* Confirm large generation */}
      {confirmLarge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="warn-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Icon d={ICONS.alert} className="size-5" />
              </div>
              <div>
                <h2 id="warn-title" className="font-semibold">Generate {formatBig(total)} combinations?</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  That's more than {WARN_THRESHOLD.toLocaleString()}. It will work, but the table may be slow to sort and filter, and the graph will use the compact layered view.
                  Consider removing a game or unticking outcomes you're confident about.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setConfirmLarge(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => runGenerate(games)}>
                Generate anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast pointer-events-auto flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm shadow-lg ${
              t.kind === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
            }`}
          >
            {t.kind === 'loading' && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlipBar({ gen, picks, row, onRandom }: { gen: Generated; picks: Outcome[]; row: number; onRandom: () => void }) {
  const shown = picks.slice(0, 12);
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-indigo-50/60 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-indigo-950/30">
      <span className="shrink-0 font-semibold text-indigo-800 dark:text-indigo-200">Slip #{(row + 1).toLocaleString()}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5">
        {shown.map((o, g) => (
          <OutcomePill key={g} outcome={o} className="shrink-0" label={`${OUTCOME_SYMBOL[o]} ${pickLabel(gen.games[g], o)}`} />
        ))}
        {picks.length > shown.length && <span className="text-slate-500">+{picks.length - shown.length} more</span>}
      </div>
      <span className="hidden shrink-0 tabular-nums text-slate-600 sm:inline dark:text-slate-300">
        P = {formatPct(gen.rowProb[row] ?? 0)}
      </span>
      <Button size="sm" variant="ghost" onClick={onRandom} title="Pick a random slip">
        <Icon d={ICONS.shuffle} className="size-3.5" />
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
          <span className="size-3 rounded-full bg-green-500" />
          <span className="size-3 rounded-full bg-amber-500" />
          <span className="size-3 rounded-full bg-blue-500" />
        </div>
        <h2 className="text-lg font-semibold">{hasGames ? 'Ready when you are' : 'No games yet'}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {hasGames
            ? 'Press Generate to build every combination of your games.'
            : 'Add games in the sidebar, or load the five sample fixtures to see the 243-combination graph.'}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {hasGames ? (
            <Button variant="primary" onClick={onGenerate}>Generate</Button>
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
