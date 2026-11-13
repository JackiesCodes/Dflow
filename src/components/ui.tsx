import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Outcome } from '../lib/types';

export const OUTCOME_STYLES: Record<
  Outcome,
  { solid: string; soft: string; ring: string; dot: string; dotText: string; hex: string }
> = {
  // 1 — Home: pitch green
  0: {
    solid: 'bg-brand-500 text-ink-950 border-brand-500',
    soft: 'bg-brand-50 text-brand-900 border-brand-300 dark:bg-brand-950/70 dark:text-brand-200 dark:border-brand-800',
    ring: 'ring-brand-500/40',
    dot: 'bg-brand-500',
    dotText: 'text-ink-950',
    hex: 'var(--outcome-0)',
  },
  // X — Draw: white, outlined
  1: {
    solid: 'bg-white text-ink-950 border-ink-900 dark:border-white',
    soft: 'bg-white text-ink-700 border-ink-300 dark:bg-ink-800 dark:text-ink-100 dark:border-ink-600',
    ring: 'ring-ink-400/40',
    dot: 'bg-white ring-1 ring-inset ring-ink-400',
    dotText: 'text-ink-950',
    hex: 'var(--outcome-1)',
  },
  // 2 — Away: black
  2: {
    solid: 'bg-ink-900 text-white border-ink-900 dark:bg-ink-950 dark:border-ink-300',
    soft: 'bg-ink-200 text-ink-900 border-ink-400 dark:bg-ink-950 dark:text-ink-200 dark:border-ink-500',
    ring: 'ring-ink-900/25 dark:ring-ink-300/40',
    dot: 'bg-ink-900 dark:bg-ink-950 dark:ring-1 dark:ring-inset dark:ring-ink-400',
    dotText: 'text-white',
    hex: 'var(--outcome-2)',
  },
};

type Variant = 'primary' | 'cta' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ink-900 text-white hover:bg-ink-700 shadow-sm dark:bg-brand-500 dark:text-ink-950 dark:hover:bg-brand-400',
  cta: 'bg-brand-500 font-semibold text-ink-950 hover:bg-brand-400 shadow-sm',
  secondary:
    'border border-ink-300 bg-white text-ink-700 hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800',
  ghost: 'text-ink-600 hover:bg-ink-200/70 dark:text-ink-300 dark:hover:bg-ink-800',
  danger: 'text-flame-600 hover:bg-flame-50 dark:text-flame-400 dark:hover:bg-flame-950/50',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm';
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 ${sz} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'warn' | 'error' }) {
  // Rendered on the dark header bar.
  const color = tone === 'error' ? 'text-flame-300' : tone === 'warn' ? 'text-gold-300' : 'text-white';
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</span>
      <span className={`font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export function OutcomePill({ outcome, label, className = '' }: { outcome: Outcome; label: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border px-1.5 py-0.5 text-xs font-medium ${OUTCOME_STYLES[outcome].soft} ${className}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${OUTCOME_STYLES[outcome].dot}`} />
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Compact row of coloured 1 / X / 2 squares — one per game. */
export function SlipChips({ picks, className = '', size = 'md' }: { picks: ArrayLike<number>; className?: string; size?: 'sm' | 'md' }) {
  const items = Array.from(picks) as Outcome[];
  const dim = size === 'sm' ? 'h-5 min-w-5 text-[10px]' : 'h-6 min-w-6 text-xs';
  return (
    <span className={`flex items-center gap-1 overflow-hidden ${className}`} aria-label={items.map((o) => OUTCOME_SYMBOL_MAP[o]).join('-')}>
      {items.map((o, i) => (
        <span key={i} className={`inline-flex shrink-0 items-center justify-center rounded-md border px-1 font-bold ${dim} ${OUTCOME_STYLES[o].solid}`}>
          {OUTCOME_SYMBOL_MAP[o]}
        </span>
      ))}
    </span>
  );
}

const OUTCOME_SYMBOL_MAP: Record<Outcome, string> = { 0: '1', 1: 'X', 2: '2' };

export function Icon({ d, className = 'size-4' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  play: 'M6 4l14 8-14 8z',
  sun: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M18 6L6 18M6 6l12 12',
  chevronDown: 'M6 9l6 6 6-6',
  chevronRight: 'M9 6l6 6-6 6',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  graph: 'M5 6a2 2 0 100 4 2 2 0 000-4zM19 3a2 2 0 100 4 2 2 0 000-4zM19 17a2 2 0 100 4 2 2 0 000-4zM7 8l10-3M7 8l10 11',
  table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  percent: 'M19 5L5 19M6.5 4a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM17.5 15a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  shield: 'M12 3l7 3v5.5c0 4.6-3 7.9-7 9.5-4-1.6-7-4.9-7-9.5V6z',
  shieldCheck: 'M12 3l7 3v5.5c0 4.6-3 7.9-7 9.5-4-1.6-7-4.9-7-9.5V6zM8.8 12.2l2.2 2.2 4.2-4.4',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  target: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6a6 6 0 100 12 6 6 0 000-12zM12 10a2 2 0 100 4 2 2 0 000-4z',
};
