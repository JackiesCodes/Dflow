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
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold">Games</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
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
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
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

      <div className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <Button variant="secondary" className="flex-1 !h-11 sm:!h-9 lg:!bg-indigo-600 lg:!text-white lg:hover:!bg-indigo-500 lg:!border-transparent" onClick={() => onAdd(1)}>
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

  const toggle = (o: Outcome) => {
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
    'h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 text-base sm:h-8 sm:rounded-md sm:px-2 sm:text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Game {index + 1}
          <span className="ml-1.5 font-normal">· {activeCount} outcome{activeCount === 1 ? '' : 's'}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="-m-1 rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
          aria-label={`Remove game ${index + 1}`}
        >
          <Icon d={ICONS.trash} className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          className={inputCls}
          placeholder="Home team"
          value={game.home}
          onChange={(e) => onUpdate({ home: e.target.value })}
          aria-label={`Game ${index + 1} home team`}
        />
        <span className="text-xs text-slate-400">vs</span>
        <input
          className={inputCls}
          placeholder="Away team"
          value={game.away}
          onChange={(e) => onUpdate({ away: e.target.value })}
          aria-label={`Game ${index + 1} away team`}
        />
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {OUTCOMES.map((o) => {
          const on = game.active[o];
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              aria-pressed={on}
              title={`${OUTCOME_NAME[o]} — ${on ? 'included' : 'excluded'}`}
              className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-lg border text-sm font-semibold sm:h-8 sm:rounded-md sm:text-xs transition-colors ${
                on
                  ? OUTCOME_STYLES[o].solid
                  : 'border-slate-300 bg-transparent text-slate-400 line-through dark:border-slate-700 dark:text-slate-500'
              }`}
            >
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
              ? 'border-indigo-400 text-indigo-600 dark:text-indigo-300'
              : 'border-slate-300 text-slate-500 dark:border-slate-700'
          } hover:bg-slate-100 dark:hover:bg-slate-800`}
          aria-expanded={showWeights}
          title="Custom outcome weights"
        >
          <Icon d={ICONS.sliders} className="size-3.5" />
        </button>
      </div>
      {showWeights && (
        <div className="mt-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-950/60">
          <p className="mb-1.5 text-[11px] text-slate-500 dark:text-slate-400">
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
              className="mt-1.5 text-[11px] text-indigo-600 hover:underline dark:text-indigo-300"
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
