import { useState } from 'react';
import { activeOutcomes, normalisedProbs } from '../lib/combinatorics';
import type { Game, Outcome } from '../lib/types';
import { OUTCOMES, OUTCOME_NAME, OUTCOME_SYMBOL } from '../lib/types';
import { Button, Icon, ICONS, OUTCOME_STYLES } from './ui';

interface Props {
  games: Game[];
  onChange: (games: Game[]) => void;
  onAdd: (count?: number) => void;
  onLoadSample: () => void;
  onClear: () => void;
}

export function GameSidebar({ games, onChange, onAdd, onLoadSample, onClear }: Props) {
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
  const [showWeights, setShowWeights] = useState(false);
  const activeCount = activeOutcomes(game).length;
  const probs = normalisedProbs(game);
  const customWeights = !(game.weights[0] === game.weights[1] && game.weights[1] === game.weights[2]);

  const trusted = game.trusted === 0 || game.trusted === 2 ? game.trusted : null;
  const trustedName = trusted === null ? '' : (trusted === 0 ? game.home || 'Home' : game.away || 'Away');
  const toggleTrust = (side: 0 | 2) => onUpdate({ trusted: trusted === side ? null : side });

  const toggle = (o: Outcome) => {
    if (trusted !== null) return; // locked by the trust badge
    if (game.active[o] && activeCount === 1) return; // keep at least one outcome
    const active = [...game.active] as Game['active'];
    active[o] = !active[o];
    onUpdate({ active });
  };

  const setWeight = (o: Outcome, v: string) => {
    const weights = [...game.weights] as Game['weights'];
    const n = Number(v);
    weights[o] = Number.isFinite(n) && n >= 0 ? n : 0;
    onUpdate({ weights });
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
              <Icon d={ICONS.lock} className="size-2.5" /> {trustedName} win in every slip
            </span>
          ) : (
            <span className="ml-1.5 font-normal">· {activeCount} outcome{activeCount === 1 ? '' : 's'}</span>
          )}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="-m-1 rounded-md p-2 text-ink-400 hover:bg-flame-50 hover:text-flame-600 dark:hover:bg-flame-950/50"
          aria-label={`Remove game ${index + 1}`}
        >
          <Icon d={ICONS.trash} className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        {([0, 2] as const).map((side) => {
          const isTrusted = trusted === side;
          const name = side === 0 ? game.home : game.away;
          const label = side === 0 ? 'Home' : 'Away';
          return (
            <div key={side} className={`relative min-w-0 flex-1 ${side === 2 ? 'order-3' : ''}`}>
              <input
                className={`${inputCls} pr-10 sm:pr-8 ${isTrusted ? '!border-brand-500 font-semibold ring-2 ring-brand-500/25' : ''}`}
                placeholder={`${label} team`}
                value={name}
                onChange={(e) => onUpdate(side === 0 ? { home: e.target.value } : { away: e.target.value })}
                aria-label={`Game ${index + 1} ${label.toLowerCase()} team`}
              />
              <button
                type="button"
                onClick={() => toggleTrust(side)}
                aria-pressed={isTrusted}
                aria-label={`${isTrusted ? 'Remove trust from' : 'Trust'} ${name || label}`}
                title={isTrusted ? `Trusted: ${name || label} win is in every slip. Tap to remove.` : `Trust ${name || label} — lock their win into every slip`}
                className={`absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md transition-colors sm:size-6 ${
                  isTrusted
                    ? 'bg-brand-500 text-ink-950'
                    : 'text-ink-300 hover:bg-ink-100 hover:text-ink-600 dark:text-ink-600 dark:hover:bg-ink-800 dark:hover:text-ink-300'
                }`}
              >
                <Icon d={isTrusted ? ICONS.shieldCheck : ICONS.shield} className="size-4 sm:size-3.5" />
              </button>
            </div>
          );
        })}
        <span className="order-2 text-xs text-ink-400">vs</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {OUTCOMES.map((o) => {
          const on = trusted !== null ? trusted === o : game.active[o];
          const locked = trusted !== null;
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              aria-pressed={on}
              aria-disabled={locked}
              title={locked ? `Locked by the trust badge on ${trustedName}` : `${OUTCOME_NAME[o]} — ${on ? 'included' : 'excluded'}`}
              className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border text-sm font-semibold sm:h-8 sm:rounded-md sm:text-xs transition-colors ${
                on
                  ? OUTCOME_STYLES[o].solid
                  : locked
                    ? 'cursor-not-allowed border-dashed border-ink-200 bg-transparent text-ink-300 dark:border-ink-800 dark:text-ink-600'
                    : 'border-ink-300 bg-transparent text-ink-400 line-through dark:border-ink-700 dark:text-ink-500'
              }`}
            >
              {locked && on && <Icon d={ICONS.lock} className="size-3" />}
              {OUTCOME_SYMBOL[o]}
              <span className="font-normal">{o === 0 ? 'Home' : o === 1 ? 'Draw' : 'Away'}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowWeights((s) => !s)}
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg border sm:size-8 sm:rounded-md ${
            customWeights
              ? 'border-brand-500 text-brand-700 dark:text-brand-300'
              : 'border-ink-300 text-ink-500 dark:border-ink-700'
          } hover:bg-ink-100 dark:hover:bg-ink-800`}
          aria-expanded={showWeights}
          title="Custom outcome weights"
        >
          <Icon d={ICONS.sliders} className="size-3.5" />
        </button>
      </div>
      {showWeights && (
        <div className="mt-2 rounded-lg bg-ink-50 p-2 dark:bg-ink-950/60">
          <p className="mb-1.5 text-[11px] text-ink-500 dark:text-ink-400">
            Relative weights (e.g. 50 / 30 / 20). Only included outcomes count.
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {OUTCOMES.map((o) => (
              <label key={o} className={`text-[11px] ${game.active[o] ? '' : 'opacity-40'}`}>
                <span className="mb-0.5 block font-medium">
                  {OUTCOME_SYMBOL[o]} · {(probs[o] * 100).toFixed(1)}%
                </span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  disabled={!game.active[o]}
                  className={inputCls}
                  value={game.weights[o]}
                  onChange={(e) => setWeight(o, e.target.value)}
                />
              </label>
            ))}
          </div>
          {customWeights && (
            <button
              type="button"
              className="mt-1.5 text-[11px] text-brand-800 hover:underline dark:text-brand-300"
              onClick={() => onUpdate({ weights: [1, 1, 1] })}
            >
              Reset to equal
            </button>
          )}
        </div>
      )}
    </div>
  );
}
