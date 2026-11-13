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
  it("keeps the trusted team's win or the draw, never the loss", () => {
    const games = sampleGames();
    games[0] = { ...games[0], trusted: 0 }; // Arsenal (home) won't lose
    games[1] = { ...games[1], trusted: 2 }; // Barcelona (away) won't lose
    const gen = generate(games);
    expect(gen.total).toBe(108); // 2 × 2 × 3 × 3 × 3
    for (let r = 0; r < gen.total; r++) {
      const p = rowPicks(gen, r);
      expect(p[0]).not.toBe(2); // Arsenal never loses
      expect(p[1]).not.toBe(0); // Barcelona never loses
    }
    expect(gen.probs[0]).toEqual([0.5, 0.5, 0]);
    expect(gen.rowProb[0]).toBeCloseTo(1 / 108, 12);
  });

  it('restores the previously ticked outcomes when removed', () => {
    const g: Game = { ...makeGame(), active: [true, false, true] };
    expect(countCombinations([{ ...g, trusted: 0 }])).toBe(2);
    expect(countCombinations([{ ...g, trusted: null }])).toBe(2);
    expect(generate([{ ...g, trusted: null }]).activeByGame[0]).toEqual([0, 2]);
    expect(generate([{ ...g, trusted: 0 }]).activeByGame[0]).toEqual([0, 1]);
  });
});

describe('draw trust badge', () => {
  it('puts the draw in every slip for that game', () => {
    const games = sampleGames();
    games[0] = { ...games[0], trusted: 0 };
    games[1] = { ...games[1], trusted: 2 };
    games[2] = { ...games[2], trusted: 1 }; // Bayern v Dortmund: draw
    const gen = generate(games);
    expect(gen.total).toBe(36); // 2 × 2 × 1 × 3 × 3
    for (let r = 0; r < gen.total; r++) expect(rowPicks(gen, r)[2]).toBe(1);
    expect(gen.probs[2]).toEqual([0, 1, 0]);
  });
});
