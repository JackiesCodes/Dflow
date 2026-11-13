import type { Game } from './types';

const KEY = 'bsoe:games:v1';

let counter = 0;
export function newId(): string {
  counter += 1;
  return `g${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeGame(home = '', away = ''): Game {
  return { id: newId(), home, away, active: [true, true, true], weights: [1, 1, 1] };
}

export const SAMPLE_GAMES: [string, string][] = [
  ['Arsenal', 'Chelsea'],
  ['Real Madrid', 'Barcelona'],
  ['Bayern Munich', 'Borussia Dortmund'],
  ['Inter Milan', 'AC Milan'],
  ['PSG', 'Marseille'],
];

export function sampleGames(): Game[] {
  return SAMPLE_GAMES.map(([h, a]) => makeGame(h, a));
}

function isGame(x: unknown): x is Game {
  if (!x || typeof x !== 'object') return false;
  const g = x as Record<string, unknown>;
  return (
    typeof g.id === 'string' &&
    typeof g.home === 'string' &&
    typeof g.away === 'string' &&
    Array.isArray(g.active) && g.active.length === 3 &&
    Array.isArray(g.weights) && g.weights.length === 3
  );
}

export function loadGames(): Game[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return sampleGames();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isGame)) return parsed;
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
