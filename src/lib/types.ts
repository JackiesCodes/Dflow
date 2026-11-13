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
  /**
   * Trust badge (one per game):
   * - 0 / 2: the home / away team won't lose — every slip has their win or the draw.
   * - 1: the game is trusted to end in a draw — every slip has the draw.
   * `active` is kept untouched so removing the badge restores the previous selection.
   */
  trusted?: Outcome | null;
  /** Decimal odds for 1 / X / 2 (null = not entered). */
  odds?: [number | null, number | null, number | null];
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
  /** Combined decimal odds of each slip (NaN when a pick has no odds). */
  rowOdds: Float64Array;
  /** True when every active outcome of every game has odds. */
  hasOdds: boolean;
  elapsedMs: number;
}
