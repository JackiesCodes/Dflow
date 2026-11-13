/** Outcome codes: 0 = Home Win (1), 1 = Draw (X), 2 = Away Win (2). */
export type Outcome = 0 | 1 | 2;

export const OUTCOMES: readonly Outcome[] = [0, 1, 2];

export const OUTCOME_SYMBOL: Record<Outcome, string> = { 0: '1', 1: 'X', 2: '2' };
export const OUTCOME_NAME: Record<Outcome, string> = { 0: 'Home Win', 1: 'Draw', 2: 'Away Win' };

export interface Game {
  id: string;
  home: string;
  away: string;
  /** Which outcomes are included in the combinations, indexed by Outcome. */
  active: [boolean, boolean, boolean];
  /** Relative likelihood weights, indexed by Outcome. Only active outcomes count. */
  weights: [number, number, number];
  /**
   * Trust badge: a team the user is sure will win. When set, that win is locked
   * into every slip (the game contributes a single outcome). `active` is kept
   * untouched so removing the badge restores the previous selection.
   */
  trusted?: 0 | 2 | null;
}

/** Immutable snapshot of games used to produce a result set. */
export interface Generated {
  games: Game[];
  /** Active outcome codes per game, in 1/X/2 order. */
  activeByGame: Outcome[][];
  /** Normalised probability per game per outcome (0 for inactive). */
  probs: number[][];
  total: number;
  /** Flat row-major outcome codes: codes[row * N + game]. */
  codes: Uint8Array;
  /** Probability of each combination (Float64Array, same row order). */
  rowProb: Float64Array;
  elapsedMs: number;
}
