import type { Game, Generated, Outcome } from './types';
import { OUTCOMES, OUTCOME_SYMBOL } from './types';

export const WARN_THRESHOLD = 100_000;
export const HARD_LIMIT = 1_000_000;

export function activeOutcomes(game: Game): Outcome[] {
  if (game.trusted === 0 || game.trusted === 2) return [game.trusted];
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

/** Normalised probabilities over active outcomes (equal if all weights are 0). */
export function normalisedProbs(game: Game): number[] {
  const act = activeOutcomes(game);
  const sum = act.reduce<number>((s, o) => s + Math.max(0, game.weights[o] || 0), 0);
  return OUTCOMES.map((o) => {
    if (!act.includes(o)) return 0;
    return sum > 0 ? Math.max(0, game.weights[o] || 0) / sum : 1 / act.length;
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
  // Odometer-style iteration: increment the last digit and carry left.
  const digits = new Array<number>(n).fill(0);
  for (let r = 0; r < total; r++) {
    let p = 1;
    const base = r * n;
    for (let g = 0; g < n; g++) {
      const o = activeByGame[g][digits[g]];
      codes[base + g] = o;
      p *= probs[g][o];
    }
    rowProb[r] = p;
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
