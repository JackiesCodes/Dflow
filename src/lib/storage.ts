import type { Game } from './types';

const KEY = 'bsoe:games:v1';

let counter = 0;
export function newId(): string {
  counter += 1;
  return `g${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeGame(home = '', away = ''): Game {
  return { id: newId(), home, away, active: [true, true, true] };
}

export const SAMPLE_GAMES: [string, string, [number, number, number]][] = [
  ['Arsenal', 'Chelsea', [2.1, 3.4, 3.5]],
  ['Real Madrid', 'Barcelona', [2.6, 3.6, 2.55]],
  ['Bayern Munich', 'Borussia Dortmund', [1.75, 4.0, 4.2]],
  ['Inter Milan', 'AC Milan', [2.3, 3.2, 3.1]],
  ['PSG', 'Marseille', [1.45, 4.5, 6.5]],
];

export function sampleGames(): Game[] {
  return SAMPLE_GAMES.map(([h, a, odds]) => ({ ...makeGame(h, a), odds }));
}

function isGame(x: unknown): x is Game {
  if (!x || typeof x !== 'object') return false;
  const g = x as Record<string, unknown>;
  return (
    typeof g.id === 'string' &&
    typeof g.home === 'string' &&
    typeof g.away === 'string' &&
    Array.isArray(g.active) && g.active.length === 3
  );
}

export function loadGames(): Game[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return sampleGames();
    const parsed = JSON.parse(raw);
    // Older saves carried per-outcome weights; those are no longer used.
    if (Array.isArray(parsed) && parsed.every(isGame)) return (parsed as (Game & { weights?: unknown })[]).map(({ weights: _w, ...g }) => g);
  } catch {
    /* storage unavailable or corrupt: fall back to sample data */
  }
  return sampleGames();
}

export function saveGames(games: Game[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(games));
  } catch {
    /* ignore */
  }
}

export function loadPref(key: string): string | null {
  try {
    return localStorage.getItem(`bsoe:${key}`);
  } catch {
    return null;
  }
}

export function savePref(key: string, value: string) {
  try {
    localStorage.setItem(`bsoe:${key}`, value);
  } catch {
    /* ignore */
  }
}
