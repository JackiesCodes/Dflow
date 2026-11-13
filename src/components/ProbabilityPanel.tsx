import { useMemo } from 'react';
import { correctPicksDistribution, formatMoney, formatOdds, formatOneIn, formatPct, moneySummary, pickLabel, rowIndexOf } from '../lib/combinatorics';
import type { Generated, Outcome } from '../lib/types';
import { OUTCOME_SYMBOL } from '../lib/types';
import { OutcomePill } from './ui';

interface Props {
  gen: Generated;
  picks: Outcome[];
  balance: number;
}

export function ProbabilityPanel({ gen, picks, balance }: Props) {
  const n = gen.games.length;
  const row = rowIndexOf(gen, picks);
  const slipProb = row >= 0 ? gen.rowProb[row] : 0;
  const dist = useMemo(() => correctPicksDistribution(gen, picks), [gen, picks]);
  const uniform = gen.probs.every((p) => {
    const act = p.filter((x) => x > 0);
    return act.every((x) => Math.abs(x - act[0]) < 1e-12);
  });
  const maxProb = Math.max(...dist.map((d) => d.prob));

  // Most-likely slip: best outcome per game.
  const best = gen.probs.map((p, g) => gen.activeByGame[g].reduce((a, b) => (p[b] > p[a] ? b : a)));
  const bestProb = best.reduce<number>((acc, o, g) => acc * gen.probs[g][o], 1);

  const money = useMemo(() => (gen.hasOdds ? moneySummary(gen, balance, row) : null), [gen, balance, row]);

  return (
    <div className="space-y-4 p-4 text-sm">
      {money ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Your stake</h3>
          <div className="rounded-xl bg-ink-900 p-3 text-white dark:bg-ink-800">
            <div className="flex items-baseline justify-between gap-2 text-xs text-ink-300">
              <span>
                {formatMoney(balance)} on slip #{(row + 1).toLocaleString()}
              </span>
              <span className="tabular-nums">odds {formatOdds(money.odds)}</span>
            </div>
            <div className="mt-2 text-xs text-ink-300">If it wins</div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-bold tabular-nums">{formatMoney(money.ret)}</span>
              <span className="text-sm font-semibold tabular-nums text-brand-400">+{formatMoney(money.profit)} profit</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/10 pt-2 text-[11px] text-ink-300">
              <div>
                <div>Win chance</div>
                <div className="text-sm font-semibold tabular-nums text-white">{formatPct(money.chance)}</div>
              </div>
              <div>
                <div>Expected return</div>
                <div className={`text-sm font-semibold tabular-nums ${money.expected >= balance ? 'text-brand-400' : 'text-flame-400'}`}>
                  {formatMoney(money.expected)}
                </div>
              </div>
              <div className="col-span-2">
                <div>Returns across all {gen.total.toLocaleString()} slips</div>
                <div className="text-sm font-semibold tabular-nums text-white">
                  {formatMoney(money.minRet)} – {formatMoney(money.maxRet)}
                </div>
              </div>
            </div>
            <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-ink-400">
              Each slip stakes your full balance. Placing all {gen.total.toLocaleString()} slips would stake {formatMoney(money.totalCost)}.
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-ink-300 p-3 text-xs text-ink-500 dark:border-ink-700 dark:text-ink-400">
          Add odds to every game (Games → Odds) to see what a {formatMoney(balance)} stake returns.
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Selected slip</h3>
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-900 dark:bg-brand-950/50">
          <div className="text-xs text-brand-800 dark:text-brand-300">Chance of winning slip #{(row + 1).toLocaleString()}</div>
          <div className="text-2xl font-bold tabular-nums text-brand-900 dark:text-white">{formatPct(slipProb)}</div>
          <div className="text-xs text-brand-800/80 dark:text-brand-300/80">{formatOneIn(slipProb)}</div>
        </div>
        <ul className="mt-2 space-y-1">
          {gen.games.map((game, g) => (
            <li key={game.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-ink-500 dark:text-ink-400">
                G{g + 1} {game.home || 'Home'} v {game.away || 'Away'}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <OutcomePill outcome={picks[g]} label={`${OUTCOME_SYMBOL[picks[g]]} ${pickLabel(game, picks[g])}`} />
                <span className="w-11 text-right tabular-nums text-ink-500">
                  {gen.hasOdds ? `@${formatOdds(game.odds?.[picks[g]] ?? NaN)}` : `${(gen.probs[g][picks[g]] * 100).toFixed(1)}%`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Metric label="Combinations" value={gen.total.toLocaleString()} />
        <Metric
          label={uniform ? 'Each combination' : 'Equal-odds slip'}
          value={uniform ? formatPct(1 / gen.total) : formatPct(gen.activeByGame.reduce<number>((a, act) => a / act.length, 1))}
          hint={uniform ? `Π (1 / active outcomes)` : 'if all outcomes were equal'}
        />
        {!uniform && <Metric label="Most likely slip" value={formatPct(bestProb)} hint={best.map((o) => OUTCOME_SYMBOL[o]).join('-')} />}
        <Metric label="Play every slip" value="100%" hint={`${gen.total.toLocaleString()} slips guarantee a winner`} />
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
          Exactly K correct picks
        </h3>
        <p className="mb-2 text-xs text-ink-500 dark:text-ink-400">
          For the selected slip: how many of the {gen.total.toLocaleString()} possible results give exactly K hits, and how likely that is.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-ink-500 dark:text-ink-400">
              <th className="py-1 font-medium">K</th>
              <th className="py-1 text-right font-medium">Results</th>
              <th className="py-1 pl-3 font-medium">Chance</th>
            </tr>
          </thead>
          <tbody>
            {[...dist].reverse().map((d) => (
              <tr key={d.k} className="border-t border-ink-100 dark:border-ink-800">
                <td className="py-1 font-semibold tabular-nums">
                  {d.k}/{n}
                  {d.k === n && <span className="ml-1 text-[10px] font-normal text-brand-700 dark:text-brand-400">win</span>}
                </td>
                <td className="py-1 text-right tabular-nums">{d.count.toLocaleString()}</td>
                <td className="py-1 pl-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div
                        className={`h-full rounded-full ${d.k === n ? 'bg-brand-500' : 'bg-ink-900 dark:bg-ink-300'}`}
                        style={{ width: `${maxProb ? (d.prob / maxProb) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-[4.5rem] whitespace-nowrap text-right tabular-nums">{formatPct(d.prob)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-ink-200 p-2.5 dark:border-ink-800">
      <div className="text-[11px] text-ink-500 dark:text-ink-400">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
      {hint && <div className="truncate text-[10px] text-ink-400" title={hint}>{hint}</div>}
    </div>
  );
}
