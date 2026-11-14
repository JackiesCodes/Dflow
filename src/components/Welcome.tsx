import type { ReactNode } from 'react';
import { Button, Icon, ICONS, OUTCOME_STYLES } from './ui';
import type { Outcome } from '../lib/types';

interface Props {
  /** Games exist but nothing has been generated yet. */
  hasGames: boolean;
  gameCount: number;
  onSample: () => void;
  onAdd: () => void;
  onGenerate: () => void;
}

/** Shown when there are no results yet: a short guide to getting the best out of Dflow. */
export function Welcome({ hasGames, gameCount, onSample, onAdd, onGenerate }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Intro */}
        <div className="text-center">
          <img src="./favicon.svg" alt="" className="mx-auto size-14 rounded-2xl" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {hasGames ? 'Your games are ready' : 'See every slip before you bet'}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500 sm:text-base dark:text-ink-400">
            {hasGames
              ? `You've added ${gameCount} game${gameCount === 1 ? '' : 's'}. Generate to see every combination as a graph and a list of slips.`
              : 'Dflow builds every possible combination of your games, shows them as a growing tree, and tells you what each slip could return.'}
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            {hasGames ? (
              <Button variant="cta" className="!h-11 !px-5 !text-base" onClick={onGenerate}>
                <Icon d={ICONS.play} className="size-4" /> Generate slips
              </Button>
            ) : (
              <>
                <Button variant="cta" className="!h-11 !px-5 !text-base" onClick={onSample}>
                  <Icon d={ICONS.play} className="size-4" /> Try it with 5 sample games
                </Button>
                <Button className="!h-11 !px-5 !text-base" onClick={onAdd}>
                  <Icon d={ICONS.plus} className="size-4" /> Add your first game
                </Button>
              </>
            )}
          </div>
        </div>

        {/* How to get the best out of it */}
        <h3 className="mt-10 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
          Get the most out of Dflow
        </h3>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          <Step n={1} title="Add your games" text="Type the two teams, then choose the market: match result (1 / X / 2) or both teams to score (GG / NG). Untick any outcome you want to leave out.">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="truncate rounded-md border border-ink-300 px-2 py-1 dark:border-ink-700">Arsenal</span>
              <span className="text-ink-400">vs</span>
              <span className="truncate rounded-md border border-ink-300 px-2 py-1 dark:border-ink-700">Chelsea</span>
            </div>
            <div className="mt-1.5 flex gap-1">
              <Chip o={0}>1 Home</Chip>
              <Chip o={1}>X Draw</Chip>
              <Chip o={2}>2 Away</Chip>
            </div>
          </Step>

          <Step n={2} title="Trust what you're sure of" text="Tap the shield on a team that won't lose, or on the draw. Fewer outcomes means fewer slips, and a bigger chance for each one.">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md border-2 border-brand-500 px-2 py-1 font-semibold">
                Arsenal
                <span className="flex size-5 items-center justify-center rounded bg-brand-500 text-ink-950">
                  <Icon d={ICONS.shieldCheck} className="size-3.5" />
                </span>
              </span>
              <span className="text-ink-500 dark:text-ink-400">win or draw</span>
            </div>
            <div className="mt-1.5 text-xs font-semibold tabular-nums">
              243 slips <span className="text-ink-400">→</span> <span className="text-brand-700 dark:text-brand-400">162 slips</span>
            </div>
          </Step>

          <Step n={3} title="Add odds and your balance" text="Open Odds on each game and enter the bookmaker's odds, then set your betting balance. Every slip shows what it returns if it wins.">
            <div className="flex items-baseline gap-1.5 text-xs tabular-nums">
              <span className="rounded bg-ink-100 px-1.5 py-0.5 font-semibold dark:bg-ink-800">$100</span>
              <span className="text-ink-400">×</span>
              <span className="rounded bg-ink-100 px-1.5 py-0.5 font-semibold dark:bg-ink-800">odds 31.87</span>
              <span className="text-ink-400">=</span>
              <span className="text-sm font-bold text-brand-700 dark:text-brand-400">$3,186.59</span>
            </div>
          </Step>

          <Step n={4} title="Generate and explore" text="Follow any slip through the graph, or switch to the slip list to search, filter by game, sort by biggest return and export to CSV.">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {([0, 1, 0, 2, 0] as Outcome[]).map((o, i) => (
                  <span key={i} className={`inline-flex size-6 items-center justify-center rounded-md border text-xs font-bold ${OUTCOME_STYLES[o].solid}`}>
                    {o === 0 ? '1' : o === 1 ? 'X' : '2'}
                  </span>
                ))}
              </div>
              <span className="flex gap-1 text-ink-400">
                <Icon d={ICONS.graph} className="size-4" />
                <Icon d={ICONS.table} className="size-4" />
                <Icon d={ICONS.download} className="size-4" />
              </span>
            </div>
          </Step>

          <Step n={5} title="Read the odds panel" text="See the selected slip's win chance, profit and expected return, plus how many slips land exactly 3, 4 or 5 correct picks." wide>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <Mini label="Win chance" value="2.33%" />
              <Mini label="If it wins" value="+$3,086.59" tone="good" />
              <Mini label="Expected" value="$74.33" tone="bad" />
            </div>
          </Step>
        </ol>

        <p className="mt-6 text-center text-xs text-ink-500 dark:text-ink-400">
          Tip: your games, odds and balance are saved in this browser, so they're still here next time.
        </p>
      </div>
    </div>
  );
}

function Step({ n, title, text, children, wide }: { n: number; title: string; text: string; children: ReactNode; wide?: boolean }) {
  return (
    <li className={`flex flex-col rounded-2xl border border-ink-200 bg-white p-4 shadow-sm dark:border-ink-800 dark:bg-ink-900 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white dark:bg-brand-500 dark:text-ink-950">
          {n}
        </span>
        <div className="min-w-0">
          <h4 className="font-semibold">{title}</h4>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{text}</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-950/60">{children}</div>
    </li>
  );
}

function Chip({ o, children }: { o: Outcome; children: ReactNode }) {
  return (
    <span className={`flex-1 rounded-md border py-1 text-center text-[11px] font-semibold ${OUTCOME_STYLES[o].solid}`}>{children}</span>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-brand-700 dark:text-brand-400' : tone === 'bad' ? 'text-flame-600 dark:text-flame-400' : '';
  return (
    <div className="rounded-lg bg-white p-2 dark:bg-ink-900">
      <div className="text-ink-500 dark:text-ink-400">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
