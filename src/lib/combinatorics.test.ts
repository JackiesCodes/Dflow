import { describe, expect, it } from 'vitest';
import { correctPicksDistribution, countCombinations, generate, rowIndexOf, rowPicks, slipString } from './combinatorics';
import { makeGame, sampleGames } from './storage';
import type { Game } from './types';

describe('combinations', () => {
  it('0 games → 0 combinations', () => {
    expect(countCombinations([])).toBe(0);
  });

  it('1 game → 3 combos, or fewer when outcomes are limited', () => {
    const g = makeGame('A', 'B');
    expect(generate([g]).total).toBe(3);
    const limited: Game = { ...g, active: [true, false, true] };
    const gen = generate([limited]);
    expect(gen.total).toBe(2);
    expect([0, 1].map((r) => slipString(rowPicks(gen, r)))).toEqual(['1', '2']);
  });

  it('5 sample games → 243 unique rows whose probabilities sum to 1', () => {
    const gen = generate(sampleGames());
    expect(gen.total).toBe(243);
    const set = new Set<string>();
    for (let r = 0; r < gen.total; r++) set.add(slipString(rowPicks(gen, r)));
    expect(set.size).toBe(243);
    expect(gen.rowProb.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(gen.rowProb[0]).toBeCloseTo(1 / 243, 12);
  });

  it('scales to N=10 (59,049) and maps picks back to row index', () => {
    const games = Array.from({ length: 10 }, (_, i) => makeGame(`H${i}`, `A${i}`));
    const gen = generate(games);
    expect(gen.total).toBe(59049);
    for (const r of [0, 1, 777, 59048]) expect(rowIndexOf(gen, rowPicks(gen, r))).toBe(r);
  });

  it('mixed active outcomes multiply', () => {
    const games = [makeGame(), { ...makeGame(), active: [true, true, false] as [boolean, boolean, boolean] }, makeGame()];
    expect(countCombinations(games)).toBe(18);
  });

  it('exactly-K distribution counts sum to total and probabilities to 1', () => {
    const gen = generate(sampleGames());
    const dist = correctPicksDistribution(gen, rowPicks(gen, 0));
    expect(dist.map((d) => d.count)).toEqual([32, 80, 80, 40, 10, 1]);
    expect(dist.reduce((s, d) => s + d.prob, 0)).toBeCloseTo(1, 12);
    expect(dist[5].prob).toBeCloseTo(1 / 243, 12);
  });

  it('custom weights change probabilities', () => {
    const g: Game = { ...makeGame(), weights: [2, 1, 1] };
    const gen = generate([g]);
    expect(Array.from(gen.rowProb)).toEqual([0.5, 0.25, 0.25]);
  });
});

describe('trust badge', () => {
  it('locks the trusted win into every slip and restores on removal', () => {
    const games = sampleGames();
    games[0] = { ...games[0], trusted: 0 }; // Arsenal
    games[1] = { ...games[1], trusted: 2 }; // Barcelona
    const gen = generate(games);
    expect(gen.total).toBe(27);
    for (let r = 0; r < gen.total; r++) {
      const p = rowPicks(gen, r);
      expect(p[0]).toBe(0);
      expect(p[1]).toBe(2);
    }
    expect(gen.probs[0][0]).toBe(1);
    expect(gen.rowProb[0]).toBeCloseTo(1 / 27, 12);
    // Removing trust brings back the previously ticked outcomes.
    const limited: Game = { ...games[2], active: [true, false, true], trusted: 0 };
    expect(countCombinations([limited])).toBe(1);
    expect(countCombinations([{ ...limited, trusted: null }])).toBe(2);
  });
});
