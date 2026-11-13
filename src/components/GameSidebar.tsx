import { useState } from 'react';
import { activeOutcomes, formatMoney, gameHasOdds, isBtts, normalisedProbs, outcomeSymbol, validOdds } from '../lib/combinatorics';
import type { Game, Outcome } from '../lib/types';
import { OUTCOMES, OUTCOME_NAME } from '../lib/types';
import { Button, Icon, ICONS, OUTCOME_STYLES } from './ui';

interface Props {
  games: Game[];
  onChange: (games: Game[]) => void;
  onAdd: (count?: number) => void;
  onLoadSample: () => void;
  onClear: () => void;
  balance: number;
  onBalanceChange: (balance: number) => void;
  /** Total slips for the current inputs, used to show the stake per slip. */
  totalSlips: number;
}

export function GameSidebar({ games, onChange, onAdd, onLoadSample, onClear, balance, onBalanceChange, totalSlips }: Props) {
  const update = (id: string, patch: Partial<Game>) =>
    onChange(games.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-ink-200 px-4 py-3 dark:border-ink-800">
        <div>
          <h2 className="text-sm font-semibold">Games</h2>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {games.length} {games.length === 1 ? 'game' : 'games'} · pick outcomes to include
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onLoadSample} title="Replace with the 5 sample games">
            Sample
          </Button>
          <Button size="sm" variant="danger" onClick={onClear} disabled={games.length === 0} title="Remove all games">
            Clear
          </Button>
        </div>
      </div>

      <BalanceInput balance={balance} onChange={onBalanceChange} totalSlips={totalSlips} />

      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
        {games.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink-300 p-6 text-center text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400">
            No games yet. Add one to start building your slip.
          </div>
        )}
        {games.map((g, i) => (
          <GameCard
            key={g.id}
            index={i}
            game={g}
            onUpdate={(patch) => update(g.id, patch)}
            onRemove={() => onChange(games.filter((x) => x.id !== g.id))}
          />
        ))}
      </div>

      <div className="flex gap-2 border-t border-ink-200 p-3 dark:border-ink-800">
        <Button variant="secondary" className="flex-1 !h-11 sm:!h-9 lg:!border-transparent lg:!bg-ink-900 lg:!text-white lg:hover:!bg-ink-700 dark:lg:!bg-brand-500 dark:lg:!text-ink-950 dark:lg:hover:!bg-brand-400" onClick={() => onAdd(1)}>
          <Icon d={ICONS.plus} /> Add game
        </Button>
        <Button className="!h-11 sm:!h-9" onClick={() => onAdd(5)} title="Add 5 empty games">
          +5
        </Button>
      </div>
    </div>
  );
}

function GameCard({
  index,
  game,
  onUpdate,
  onRemove,
}: {
  index: number;
  game: Game;
  onUpdate: (patch: Partial<Game>) => void;
  onRemove: () => void;
}) {
  const activeCount = activeOutcomes(game).length;
  const probs = normalisedProbs(game);

  const btts = isBtts(game);
  const trusted: Outcome | null = !btts && (game.trusted === 0 || game.trusted === 1 || game.trusted === 2) ? game.trusted : null;
  const setMarket = (market: '1x2' | 'btts') => onUpdate({ market, trusted: null });
  const trustedName = trusted === 0 ? game.home || 'Home' : trusted === 2 ? game.away || 'Away' : '';
  const trustLabel = trusted === 1 ? 'Draw in every slip' : `${trustedName} win or draw`;
  const toggleTrust = (o: Outcome) => onUpdate({ trusted: trusted === o ? null : o });
  const drawTrusted = trusted === 1;

  const toggle = (o: Outcome) => {
    if (trusted !== null) return; // locked by the trust badge
    if (game.active[o] && activeCount === 1) return; // keep at least one outcome
    const active = [...game.active] as Game['active'];
    active[o] = !active[o];
    onUpdate({ active });
  };

  const inputCls =
    'h-10 w-full min-w-0 rounded-lg border border-ink-300 bg-white px-2.5 text-base sm:h-8 sm:rounded-md sm:px-2 sm:text-sm placeholder:text-ink-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30 dark:border-ink-700 dark:bg-ink-950';

  return (
    <div
      className={`rounded-xl border bg-white p-3 shadow-sm dark:bg-ink-900 ${
        trusted !== null ? 'border-brand-500 ring-1 ring-brand-500/40' : 'border-ink-200 dark:border-ink-800'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold text-ink-500 dark:text-ink-400">
          Game {index + 1}
          {trusted !== null ? (
            <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-ink-950">
              <Icon d={ICONS.shieldCheck} className="size-2.5" /> {trustLabel}
            </span>
          ) : (
            <span className="ml-1.5 font-normal">· {activeCount} outcome{activeCount === 1 ? '' : 's'}</span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <div className="inline-flex rounded-md border border-ink-200 p-0.5 text-[11px] font-semibold dark:border-ink-700" role="group" aria-label="Market">
            {([['1x2', '1X2'], ['btts', 'Both score']] as const).map(([m, label]) => {
              const on = (game.market ?? '1x2') === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMarket(m)}
                  aria-pressed={on}
                  title={m === 'btts' ? 'Both teams to score: GG (yes) or NG (no)' : 'Match result: 1 / X / 2'}
                  className={`rounded px-2 py-1 sm:py-0.5 ${on ? 'bg-ink-900 text-white dark:bg-brand-500 dark:text-ink-950' : 'text-ink-500 dark:text-ink-400'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-2 text-ink-400 hover:bg-flame-50 hover:text-flame-600 dark:hover:bg-flame-950/50"
            aria-label={`Remove game ${index + 1}`}
          >
            <Icon d={ICONS.trash} className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {([0, 2] as const).map((side) => {
          const isTrusted = trusted === side;
          const name = side === 0 ? game.home : game.away;
          const label = side === 0 ? 'Home' : 'Away';
          return (
            <div key={side} className={`relative min-w-0 flex-1 ${side === 2 ? 'order-3' : ''}`}>
              <input
                className={`${inputCls} ${btts ? '' : 'pr-10 sm:pr-8'} ${isTrusted ? '!border-brand-500 font-semibold ring-2 ring-brand-500/25' : ''}`}
                placeholder={`${label} team`}
                value={name}
                onChange={(e) => onUpdate(side === 0 ? { home: e.target.value } : { away: e.target.value })}
                aria-label={`Game ${index + 1} ${label.toLowerCase()} team`}
              />
              {!btts && <button
                type="button"
                onClick={() => toggleTrust(side)}
                aria-pressed={isTrusted}
                aria-label={`${isTrusted ? 'Remove trust from' : 'Trust'} ${name || label}`}
                title={isTrusted ? `Trusted: ${name || label} won't lose (win or draw). Tap to remove.` : `Trust ${name || label} — they won't lose (win or draw in every slip)`}
                className={`absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors sm:size-6 ${
                  isTrusted
                    ? 'bg-brand-500 text-ink-950'
                    : 'text-ink-300 hover:bg-ink-100 hover:text-ink-600 dark:text-ink-600 dark:hover:bg-ink-800 dark:hover:text-ink-300'
                }`}
              >
                <Icon d={isTrusted ? ICONS.shieldCheck : ICONS.shield} className="size-4 sm:size-3.5" />
              </button>}
            </div>
          );
        })}
        {btts ? (
          <span className="order-2 text-xs text-ink-400">vs</span>
        ) : (
        <button
          type="button"
          onClick={() => toggleTrust(1)}
          aria-pressed={drawTrusted}
          aria-label={drawTrusted ? 'Remove trust from the draw' : 'Trust the draw'}
          title={drawTrusted ? 'Trusted: this game ends in a draw in every slip. Tap to remove.' : 'Trust the draw — this game is a draw in every slip'}
          className={`order-2 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-bold leading-none transition-colors sm:h-8 sm:w-8 ${
            drawTrusted
              ? 'bg-white text-ink-950 ring-2 ring-brand-500 dark:bg-white'
              : 'text-ink-400 hover:bg-ink-100 hover:text-ink-600 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-300'
          }`}
        >
          <DrawShield active={drawTrusted} />
          <span className="mt-0.5 sm:hidden">vs</span>
        </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {(btts ? ([0, 2] as Outcome[]) : OUTCOMES).map((o) => {
          const on = trusted !== null ? activeOutcomes(game).includes(o) : game.active[o];
          const locked = trusted !== null;
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              aria-pressed={on}
              aria-disabled={locked}
              title={locked ? `${on ? 'Included' : 'Excluded'}: ${drawTrusted ? 'the draw is trusted' : `${trustedName} is trusted not to lose`}` : `${btts ? (o === 0 ? 'Both teams score' : 'Not both teams score') : OUTCOME_NAME[o]} — ${on ? 'included' : 'excluded'}`}
              className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border text-sm font-semibold sm:h-8 sm:rounded-md sm:text-xs transition-colors ${
                on
                  ? OUTCOME_STYLES[o].solid
                  : locked
                    ? 'cursor-not-allowed border-dashed border-ink-200 bg-transparent text-ink-300 dark:border-ink-800 dark:text-ink-600'
                    : 'border-ink-300 bg-transparent text-ink-400 line-through dark:border-ink-700 dark:text-ink-500'
              }`}
            >
              {locked && on && <Icon d={ICONS.lock} className="size-3" />}
              {outcomeSymbol(game, o)}
              <span className="font-normal">{btts ? (o === 0 ? 'Yes' : 'No') : o === 0 ? 'Home' : o === 1 ? 'Draw' : 'Away'}</span>
            </button>
          );
        })}
      </div>
      <OddsDropdown game={game} probs={probs} onUpdate={onUpdate} inputCls={inputCls} />
    </div>
  );
}

/** Betting balance: every slip stakes this full amount. */
function BalanceInput({ balance, onChange, totalSlips }: { balance: number; onChange: (b: number) => void; totalSlips: number }) {
  return (
    <div className="border-b border-ink-200 px-3 py-2.5 dark:border-ink-800">
      <label className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-semibold text-ink-700 dark:text-ink-200">Betting balance</span>
        <span className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-semibold text-ink-400 sm:text-sm">$</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={Number.isFinite(balance) ? balance : ''}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
            className="h-10 w-full rounded-lg border border-ink-300 bg-white pl-6 pr-2.5 text-right text-base font-semibold tabular-nums focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 sm:h-8 sm:text-sm dark:border-ink-700 dark:bg-ink-950"
            aria-label="Betting balance in dollars"
          />
        </span>
      </label>
      <p className="mt-1 text-right text-[11px] tabular-nums text-ink-500 dark:text-ink-400">
        Each slip stakes the full <span className="font-semibold text-ink-800 dark:text-ink-100">{formatMoney(balance)}</span>
        {totalSlips > 1 && <> · all {totalSlips.toLocaleString()} slips = {formatMoney(balance * totalSlips)}</>}
      </p>
    </div>
  );
}

/** Collapsible odds row: a summary when closed, 1 / X / 2 inputs when open. */
function OddsDropdown({
  game,
  probs,
  onUpdate,
  inputCls,
}: {
  game: Game;
  probs: number[];
  onUpdate: (patch: Partial<Game>) => void;
  inputCls: string;
}) {
  const [open, setOpen] = useState(false);
  const odds = game.odds ?? [null, null, null];
  const act = activeOutcomes(game);
  const complete = gameHasOdds(game);
  const anyOdds = odds.some((x) => validOdds(x));
  const setOdd = (o: Outcome, v: string) => {
    const next = [...odds] as NonNullable<Game['odds']>;
    const n = Number(v);
    next[o] = v === '' || !Number.isFinite(n) ? null : n;
    onUpdate({ odds: next });
  };
  const btts = isBtts(game);
  const label = (o: Outcome) =>
    btts ? (o === 0 ? 'Both score' : 'Not both') : o === 1 ? 'Draw' : o === 0 ? game.home || 'Home' : game.away || 'Away';
  const ALL: Outcome[] = btts ? [0, 2] : [0, 1, 2];

  return (
    <div className="mt-2 rounded-lg border border-ink-200 dark:border-ink-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-2 px-2.5 text-left text-xs sm:h-8"
      >
        <span className="font-semibold text-ink-700 dark:text-ink-200">Odds</span>
        <span className="min-w-0 flex-1 truncate tabular-nums text-ink-500 dark:text-ink-400">
          {anyOdds
            ? ALL.map((o) => `${outcomeSymbol(game, o)} ${validOdds(odds[o]) ? (odds[o] as number).toFixed(2) : '–'}`).join('   ')
            : 'Tap to add odds'}
        </span>
        {anyOdds && !complete && (
          <span className="rounded bg-gold-100 px-1 text-[10px] font-semibold text-gold-800 dark:bg-gold-950 dark:text-gold-300">
            incomplete
          </span>
        )}
        <Icon d={ICONS.chevronDown} className={`size-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-ink-200 p-2 dark:border-ink-800">
          <div className={`grid gap-1.5 ${btts ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {ALL.map((o) => {
              const inSlips = act.includes(o);
              return (
                <label key={o} className={`min-w-0 text-[11px] ${inSlips ? '' : 'opacity-40'}`}>
                  <span className="mb-0.5 flex items-center gap-1 font-medium text-ink-600 dark:text-ink-300">
                    <span className={`inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded border px-0.5 text-[9px] font-bold ${OUTCOME_STYLES[o].solid}`}>
                      {outcomeSymbol(game, o)}
                    </span>
                    <span className="truncate">{label(o)}</span>
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1.01}
                    step="0.01"
                    placeholder="2.10"
                    className={`${inputCls} text-center tabular-nums`}
                    value={odds[o] ?? ''}
                    onChange={(e) => setOdd(o, e.target.value)}
                    aria-label={`Odds for ${label(o)}`}
                  />
                  <span className="mt-0.5 block text-center tabular-nums text-ink-400">
                    {complete && inSlips ? `${(probs[o] * 100).toFixed(0)}% chance` : ' '}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-400">
            Decimal odds. Once every included outcome has odds, they also set the probabilities.
          </p>
        </div>
      )}
    </div>
  );
}

/** Shield with an "X" — the trust badge for the draw. */
function DrawShield({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5 sm:size-[18px]" aria-hidden>
      <path
        d="M12 2.5l7.5 3.2v5.8c0 4.8-3.1 8.3-7.5 10-4.4-1.7-7.5-5.2-7.5-10V5.7z"
        fill={active ? '#8bc43f' : 'none'}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path d="M9.3 8.8l5.4 5.4M14.7 8.8l-5.4 5.4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
