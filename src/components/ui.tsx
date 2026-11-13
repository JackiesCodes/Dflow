import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Outcome } from '../lib/types';

export const OUTCOME_STYLES: Record<Outcome, { solid: string; soft: string; ring: string; dot: string; hex: string }> = {
  0: {
    solid: 'bg-green-600 text-white border-green-600',
    soft: 'bg-green-50 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-200 dark:border-green-800',
    ring: 'ring-green-500',
    dot: 'bg-green-500',
    hex: '#16a34a',
  },
  1: {
    solid: 'bg-amber-500 text-slate-950 border-amber-500',
    soft: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
    ring: 'ring-amber-500',
    dot: 'bg-amber-500',
    hex: '#f59e0b',
  },
  2: {
    solid: 'bg-blue-600 text-white border-blue-600',
    soft: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
    ring: 'ring-blue-500',
    dot: 'bg-blue-500',
    hex: '#2563eb',
  },
};

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-600/40 shadow-sm',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50',
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
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 ${sz} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'warn' | 'error' }) {
  const color =
    tone === 'error'
      ? 'text-red-600 dark:text-red-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-slate-900 dark:text-white';
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
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
  target: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 6a6 6 0 100 12 6 6 0 000-12zM12 10a2 2 0 100 4 2 2 0 000-4z',
};
