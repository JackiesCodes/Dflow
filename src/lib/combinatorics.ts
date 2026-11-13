import type { Game, Generated, Outcome } from './types';
import { OUTCOMES, OUTCOME_SYMBOL } from './types';

export const WARN_THRESHOLD = 100_000;
export const HARD_LIMIT = 1_000_000;

export function activeOutcomes(game: Game): Outcome[] {
  // Trusted team won't lose: their win or the draw, never the loss.
  if (game.trusted === 0) return [0, 1];
  if (game.trusted === 2) return [1, 2];
  // Trusted draw: the game ends level in every slip.
  if (game.trusted === 1) return [1];
  return OUTCOMES.filter((o) => game.active[o]);
}

/** Product of active outcome counts. Returns Infinity past Number.MAX_SAFE_INTEGER. */
export function countCombinations(games: Game[]): number {
  if (games.length === 0) return 0;
  let total = 1;
  for (const g of games) {
    total *= activeOutcomes(g).length;
    if (total > Number.MAX_SAFE_INTEGER) return Infinity;
  }
  return total;
}

export function validOdds(x: number | null | undefined): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x > 1;
}

/** True when every active outcome of the game has odds entered. */
export function gameHasOdds(game: Game): boolean {
  return activeOutcomes(game).every((o) => validOdds(game.odds?.[o]));
}

/**
 * Normalised probabilities over active outcomes. When odds are entered they set the
 * probabilities (implied 1/odds, rescaled to remove the bookmaker margin); otherwise
 * the custom weights do (equal if all weights are 0).
 */
export function normalisedProbs(game: Game): number[] {
  const act = activeOutcomes(game);
  const useOdds = gameHasOdds(game);
  const w = (o: Outcome) => (useOdds ? 1 / (game.odds![o] as number) : Math.max(0, game.weights[o] || 0));
  const sum = act.reduce<number>((s, o) => s + w(o), 0);
  return OUTCOMES.map((o) => {
    if (!act.includes(o)) return 0;
    return sum > 0 ? w(o) / sum : 1 / act.length;
  });
}

/**
 * Generates the full Cartesian product of active outcomes.
 * Game 1 is the most significant "digit", so row order is 1…1, 1…X, 1…2, …
 */
export function generate(games: Game[]): Generated {
  const t0 = performance.now();
  const n = games.length;
  const activeByGame = games.map(activeOutcomes);
  const probs = games.map(normalisedProbs);
  const total = countCombinations(games);
  if (!Number.isFinite(total) || total > HARD_LIMIT) {
    throw new Error(`Too many combinations (${formatBig(total)}). The limit is ${HARD_LIMIT.toLocaleString()}.`);
  }
  const codes = new Uint8Array(total * n);
  const rowProb = new Float64Array(total);
  const rowOdds = new Float64Array(total);
  const oddsByGame = games.map((g) => OUTCOMES.map((o) => (validOdds(g.odds?.[o]) ? (g.odds![o] as number) : NaN)));
  // Odometer-style iteration: increment the last digit and carry left.
  const digits = new Array<number>(n).fill(0);
  for (let r = 0; r < total; r++) {
    let p = 1;
    let odds = 1;
    const base = r * n;
    for (let g = 0; g < n; g++) {
      const o = activeByGame[g][digits[g]];
      codes[base + g] = o;
      p *= probs[g][o];
      odds *= oddsByGame[g][o];
    }
    rowProb[r] = p;
    rowOdds[r] = odds;
    for (let g = n - 1; g >= 0; g--) {
      if (++digits[g] < activeByGame[g].length) break;
      digits[g] = 0;
    }
  }
  return {
    games: structuredClone(games),
    activeByGame,
    probs,
    total,
    codes,
    rowProb,
    rowOdds,
    hasOdds: n > 0 && games.every(gameHasOdds),
    elapsedMs: performance.now() - t0,
  };
}

export function rowPicks(gen: Generated, row: number): Outcome[] {
  const n = gen.games.length;
  return Array.from(gen.codes.subarray(row * n, row * n + n)) as Outcome[];
}

/** Inverse of the generation order: picks → row index (or -1 if a pick is inactive). */
export function rowIndexOf(gen: Generated, picks: Outcome[]): number {
  let idx = 0;
  for (let g = 0; g < gen.activeByGame.length; g++) {
    const d = gen.activeByGame[g].indexOf(picks[g]);
    if (d < 0) return -1;
    idx = idx * gen.activeByGame[g].length + d;
  }
  return idx;
}

export function slipString(picks: ArrayLike<number>): string {
  let s = '';
  for (let i = 0; i < picks.length; i++) s += (i ? '-' : '') + OUTCOME_SYMBOL[picks[i] as Outcome];
  return s;
}

export function pickLabel(game: Game, o: Outcome): string {
  if (o === 1) return 'Draw';
  const team = o === 0 ? game.home : game.away;
  return `${team || (o === 0 ? 'Home' : 'Away')} win`;
}

/**
 * Distribution of "exactly K correct picks" for a given slip.
 * Returns, for k = 0..N: how many combinations share exactly k picks with the slip,
 * and the probability (under the weights) that the real results match exactly k picks.
 */
export function correctPicksDistribution(gen: Generated, picks: Outcome[]) {
  const n = gen.games.length;
  let count = [1];
  let prob = [1];
  for (let g = 0; g < n; g++) {
    const m = gen.activeByGame[g].length;
    const p = gen.probs[g][picks[g]] ?? 0;
    const nextC = new Array<number>(count.length + 1).fill(0);
    const nextP = new Array<number>(prob.length + 1).fill(0);
    for (let k = 0; k < count.length; k++) {
      nextC[k] += count[k] * (m - 1); // miss
      nextC[k + 1] += count[k]; // hit
      nextP[k] += prob[k] * (1 - p);
      nextP[k + 1] += prob[k] * p;
    }
    count = nextC;
    prob = nextP;
  }
  return count.map((c, k) => ({ k, count: c, prob: prob[k] }));
}

export function formatBig(n: number): string {
  if (!Number.isFinite(n)) return '> 9 quadrillion';
  if (n >= 1e15) return n.toExponential(2);
  return n.toLocaleString();
}

export function formatPct(p: number): string {
  if (p === 0) return '0%';
  const pct = p * 100;
  if (pct >= 0.01) return `${pct.toLocaleString(undefined, { maximumFractionDigits: pct >= 10 ? 1 : 2 })}%`;
  if (pct >= 1e-6) return `${pct.toLocaleString(undefined, { maximumSignificantDigits: 3 })}%`;
  return `${pct.toExponential(2)}%`;
}

/** "1 in X" odds string. */
export function formatOneIn(p: number): string {
  if (p <= 0) return '—';
  const x = 1 / p;
  return `1 in ${x >= 100 ? Math.round(x).toLocaleString() : x.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/**
 * Money for the selected slip. Every slip stakes the whole balance, so a slip
 * returns balance × its total odds if all its picks come in.
 */
export function moneySummary(gen: Generated, balance: number, row: number) {
  const odds = row >= 0 ? gen.rowOdds[row] : NaN;
  const ret = balance * odds;
  const chance = row >= 0 ? gen.rowProb[row] : 0;
  let minRet = Infinity;
  let maxRet = 0;
  for (let r = 0; r < gen.total; r++) {
    const x = balance * gen.rowOdds[r];
    if (x < minRet) minRet = x;
    if (x > maxRet) maxRet = x;
  }
  return {
    stake: balance,
    odds,
    ret,
    profit: ret - balance,
    chance,
    /** Average outcome of this one bet: chance × return. */
    expected: chance * ret,
    minRet,
    maxRet,
    /** What it would cost to place every slip at the full balance. */
    totalCost: balance * gen.total,
  };
}

/** US-dollar amount, e.g. $3,187.00 or −$12.50. */
export function formatMoney(x: number): string {
  if (!Number.isFinite(x)) return '—';
  const abs = Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${x < 0 ? '−' : ''}$${abs}`;
}

export function formatOdds(x: number): string {
  if (!Number.isFinite(x)) return '—';
  return x >= 1000 ? Math.round(x).toLocaleString() : x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
