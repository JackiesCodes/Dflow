import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatMoney, formatOdds, formatPct, pickLabel, slipString } from '../lib/combinatorics';
import type { Generated, Outcome } from '../lib/types';
import { OUTCOME_SYMBOL } from '../lib/types';
import { Button, Icon, ICONS, OUTCOME_STYLES, OutcomePill, SlipChips } from './ui';

interface Props {
  gen: Generated;
  selectedRow: number;
  onSelectRow: (row: number) => void;
  onToast: (msg: string) => void;
  balance: number;
  /** Phone layout: card rows + a filter/sort sheet instead of a wide table. */
  compact?: boolean;
}

const SORT_OPTIONS = [
  { id: 'default', label: 'Combination #', sorting: [] as SortingState },
  { id: 'prob-desc', label: 'Most likely first', sorting: [{ id: 'prob', desc: true }] },
  { id: 'prob-asc', label: 'Least likely first', sorting: [{ id: 'prob', desc: false }] },
  { id: 'idx-desc', label: 'Combination # (reverse)', sorting: [{ id: 'idx', desc: true }] },
  { id: 'ret-desc', label: 'Biggest return first', sorting: [{ id: 'ret', desc: true }] },
];

export function TableView({ gen, selectedRow, onSelectRow, onToast, balance, compact = false }: Props) {
  // Every slip stakes the whole balance.
  const stake = balance;
  const ROW_H = compact ? 64 : 36;
  const [showFilters, setShowFilters] = useState(false);
  const n = gen.games.length;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [search, setSearch] = useState('');
  const globalFilter = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    setSorting([]);
    setColumnFilters([]);
  }, [gen]);

  // Rows are just indices into the generated Uint8Array — cheap even for 10^5–10^6 rows.
  const data = useMemo(() => Array.from({ length: gen.total }, (_, i) => i), [gen]);
  const code = (row: number, g: number) => gen.codes[row * n + g] as Outcome;

  // Lower-cased team labels per game/outcome for searching.
  const labels = useMemo(
    () => gen.games.map((game) => [0, 1, 2].map((o) => pickLabel(game, o as Outcome).toLowerCase())),
    [gen],
  );

  const columns = useMemo<ColumnDef<number>[]>(() => {
    const cols: ColumnDef<number>[] = [
      {
        id: 'idx',
        header: '#',
        accessorFn: (r) => r + 1,
        size: 80,
        enableColumnFilter: false,
        cell: (c) => <span className="tabular-nums text-ink-500 dark:text-ink-400">{c.getValue<number>().toLocaleString()}</span>,
      },
    ];
    for (let g = 0; g < n; g++) {
      const game = gen.games[g];
      cols.push({
        id: `g${g}`,
        header: `G${g + 1}: ${game.home || 'Home'} v ${game.away || 'Away'}`,
        accessorFn: (r) => gen.codes[r * n + g],
        size: 172,
        filterFn: 'equals',
        sortingFn: 'basic',
        meta: { game: g },
        cell: (c) => {
          const o = c.getValue<number>() as Outcome;
          return <OutcomePill outcome={o} label={`${OUTCOME_SYMBOL[o]} · ${pickLabel(game, o)}`} />;
        },
      });
    }
    cols.push(
      {
        id: 'slip',
        header: 'Full slip',
        accessorFn: (r) => slipString(gen.codes.subarray(r * n, r * n + n)),
        size: Math.max(120, n * 18 + 24),
        enableColumnFilter: false,
        cell: (c) => <span className="font-mono text-xs tracking-wider">{c.getValue<string>()}</span>,
      },
      {
        id: 'prob',
        header: 'Probability',
        accessorFn: (r) => gen.rowProb[r],
        size: 110,
        enableColumnFilter: false,
        sortDescFirst: true,
        cell: (c) => <span className="tabular-nums">{formatPct(c.getValue<number>())}</span>,
      },
    );
    if (gen.hasOdds) {
      cols.push(
        {
          id: 'odds',
          header: 'Total odds',
          accessorFn: (r) => gen.rowOdds[r],
          size: 100,
          enableColumnFilter: false,
          sortDescFirst: true,
          cell: (c) => <span className="tabular-nums">{formatOdds(c.getValue<number>())}</span>,
        },
        {
          id: 'ret',
          header: 'Returns',
          accessorFn: (r) => gen.rowOdds[r] * stake,
          size: 110,
          enableColumnFilter: false,
          sortDescFirst: true,
          cell: (c) => {
            const v = c.getValue<number>();
            return (
              <span className="font-semibold tabular-nums text-brand-700 dark:text-brand-400">
                {formatMoney(v)}
              </span>
            );
          },
        },
      );
    }
    return cols;
  }, [gen, n, stake, balance]);

  const globalFilterFn: FilterFn<number> = (row, _columnId, value: string) => {
    const r = row.original;
    const terms = value.split(/\s+/).filter(Boolean);
    const slip = slipString(gen.codes.subarray(r * n, r * n + n)).toLowerCase();
    return terms.every((t) => {
      if (String(r + 1) === t.replace(/^#/, '')) return true;
      if (slip.includes(t)) return true;
      for (let g = 0; g < n; g++) if (labels[g][code(r, g)].includes(t)) return true;
      return false;
    });
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn,
    getColumnCanGlobalFilter: () => true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });

  const scrollToSelected = () => {
    const i = rows.findIndex((r) => r.original === selectedRow);
    if (i >= 0) virtualizer.scrollToIndex(i, { align: 'center' });
    else onToast('The selected slip is hidden by the current filters.');
  };

  const exportCsv = () => {
    const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const header = [
      'Combination #',
      ...gen.games.map((g, i) => `Game ${i + 1}: ${g.home} vs ${g.away}`),
      'Full Slip',
      'Probability',
      ...(gen.hasOdds ? ['Total Odds', `Returns (stake $${balance})`] : []),
    ];
    const chunks: string[] = [header.map(esc).join(',')];
    for (const row of rows) {
      const r = row.original;
      const cells = [String(r + 1)];
      for (let g = 0; g < n; g++) {
        const o = code(r, g);
        cells.push(esc(`${OUTCOME_SYMBOL[o]} (${pickLabel(gen.games[g], o)})`));
      }
      cells.push(slipString(gen.codes.subarray(r * n, r * n + n)), gen.rowProb[r].toPrecision(6));
      if (gen.hasOdds) cells.push(gen.rowOdds[r].toFixed(2), (gen.rowOdds[r] * stake).toFixed(2));
      chunks.push(cells.join(','));
    }
    const blob = new Blob([chunks.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `betting-slips-${n}-games-${rows.length}-rows.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast(`Exported ${rows.length.toLocaleString()} rows to CSV`);
  };

  const filtersActive = columnFilters.length > 0 || globalFilter.length > 0;
  const totalWidth = table.getTotalSize();
  const sortId =
    SORT_OPTIONS.find((o) => JSON.stringify(o.sorting) === JSON.stringify(sorting))?.id ?? 'custom';
  const clearFilters = () => {
    setColumnFilters([]);
    setSearch('');
  };

  const toolbar = (
    <div className="border-b border-ink-200 px-3 py-2 dark:border-ink-800">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-48">
          <Icon d={ICONS.search} className="pointer-events-none absolute left-2.5 top-1/2 size-4 -tranink-y-1/2 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={compact ? 'Search team, 1-X-2, #57…' : 'Search: team, “1-X-2”, “draw”, #57…'}
            className="h-10 w-full rounded-lg border border-ink-300 bg-white pl-8 pr-2 text-base focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/30 sm:h-8 sm:text-sm dark:border-ink-700 dark:bg-ink-950"
          />
        </label>
        {compact ? (
          <>
            <Button
              variant={showFilters || columnFilters.length > 0 || sortId !== 'default' ? 'primary' : 'secondary'}
              className="!h-10"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
            >
              <Icon d={ICONS.sliders} className="size-4" />
              Filter{columnFilters.length > 0 ? ` · ${columnFilters.length}` : ''}
            </Button>
            <Button className="!h-10 !px-2.5" onClick={exportCsv} disabled={rows.length === 0} aria-label="Export CSV" title="Export CSV">
              <Icon d={ICONS.download} />
            </Button>
          </>
        ) : (
          <>
            <span className="text-xs tabular-nums text-ink-500 dark:text-ink-400">
              {rows.length.toLocaleString()} of {gen.total.toLocaleString()} rows
            </span>
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={scrollToSelected}>
              <Icon d={ICONS.target} className="size-3.5" /> Selected
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Icon d={ICONS.download} className="size-3.5" /> Export CSV
            </Button>
          </>
        )}
      </div>
      {compact && (
        <div className="mt-1.5 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <span className="tabular-nums">
            {rows.length.toLocaleString()} of {gen.total.toLocaleString()} slips
          </span>
          <div className="flex gap-3">
            {filtersActive && (
              <button type="button" className="font-medium text-brand-800 dark:text-brand-300" onClick={clearFilters}>
                Clear
              </button>
            )}
            <button type="button" className="font-medium text-brand-800 dark:text-brand-300" onClick={scrollToSelected}>
              Go to selected
            </button>
          </div>
        </div>
      )}
      {compact && showFilters && (
        <div className="mt-2 max-h-[45vh] space-y-3 overflow-y-auto rounded-xl border border-ink-200 bg-ink-50 p-3 dark:border-ink-800 dark:bg-ink-900">
          <label className="block text-xs font-medium text-ink-600 dark:text-ink-300">
            Sort by
            <select
              value={sortId}
              onChange={(e) => setSorting(SORT_OPTIONS.find((o) => o.id === e.target.value)?.sorting ?? [])}
              className="mt-1 h-10 w-full rounded-lg border border-ink-300 bg-white px-2 text-base dark:border-ink-700 dark:bg-ink-950"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
              {sortId === 'custom' && <option value="custom">Custom</option>}
            </select>
          </label>
          {gen.games.map((game, g) => {
            const col = table.getColumn(`g${g}`);
            const val = col?.getFilterValue() as number | undefined;
            const opts: (Outcome | undefined)[] = [undefined, ...gen.activeByGame[g]];
            return (
              <div key={game.id}>
                <div className="mb-1 truncate text-xs font-medium text-ink-600 dark:text-ink-300">
                  G{g + 1} · {game.home || 'Home'} v {game.away || 'Away'}
                </div>
                <div className="flex gap-1">
                  {opts.map((o) => {
                    const on = val === o;
                    return (
                      <button
                        key={o ?? 'all'}
                        type="button"
                        onClick={() => col?.setFilterValue(o)}
                        aria-pressed={on}
                        className={`h-9 flex-1 rounded-lg border text-sm font-semibold ${
                          on
                            ? o === undefined
                              ? 'border-ink-800 bg-ink-800 text-white dark:border-ink-200 dark:bg-ink-200 dark:text-ink-900'
                              : OUTCOME_STYLES[o].solid
                            : 'border-ink-300 bg-white text-ink-600 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-300'
                        }`}
                      >
                        {o === undefined ? 'All' : OUTCOME_SYMBOL[o]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <Button variant="primary" className="w-full !h-10" onClick={() => setShowFilters(false)}>
            Show {rows.length.toLocaleString()} slips
          </Button>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="flex h-full flex-col">
        {toolbar}
        <div ref={parentRef} className="relative min-h-0 flex-1 overflow-auto">
          <ul className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const r = row.original;
              const selected = r === selectedRow;
              return (
                <li
                  key={row.id}
                  className="absolute inset-x-0 px-3 py-1"
                  style={{ transform: `translateY(${vi.start}px)`, height: ROW_H }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectRow(r)}
                    aria-pressed={selected}
                    className={`flex h-full w-full items-center gap-3 rounded-xl border px-3 text-left ${
                      selected
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/30 dark:border-brand-600 dark:bg-brand-950/60'
                        : 'border-ink-200 bg-white active:bg-ink-100 dark:border-ink-800 dark:bg-ink-900 dark:active:bg-ink-800'
                    }`}
                  >
                    <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-ink-500 dark:text-ink-400">
                      #{(r + 1).toLocaleString()}
                    </span>
                    <SlipChips picks={gen.codes.subarray(r * n, r * n + n)} className="min-w-0 flex-1" />
                    {gen.hasOdds ? (
                      <span className="shrink-0 text-right leading-tight tabular-nums">
                        <span className="block text-sm font-semibold text-brand-700 dark:text-brand-400">
                          {formatMoney(gen.rowOdds[r] * stake)}
                        </span>
                        <span className="block text-[11px] text-ink-500 dark:text-ink-400">@ {formatOdds(gen.rowOdds[r])}</span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs tabular-nums text-ink-500 dark:text-ink-400">{formatPct(gen.rowProb[r])}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {rows.length === 0 && (
            <div className="p-10 text-center text-sm text-ink-500 dark:text-ink-400">No slips match these filters.</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {toolbar}
      <div ref={parentRef} className="relative min-h-0 flex-1 overflow-auto">
        <table className="grid text-sm" style={{ width: totalWidth, minWidth: '100%' }}>
          <thead className="sticky top-0 z-10 grid bg-ink-100 dark:bg-ink-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="flex w-full">
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  const game = (h.column.columnDef.meta as { game?: number } | undefined)?.game;
                  return (
                    <th
                      key={h.id}
                      className="flex flex-col gap-1 border-b border-r border-ink-200 px-2 py-1.5 text-left text-xs font-semibold text-ink-600 last:border-r-0 dark:border-ink-800 dark:text-ink-300"
                      style={{ width: h.getSize(), flex: h.column.id === 'slip' ? '1 0 auto' : undefined }}
                    >
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 truncate text-left hover:text-ink-900 dark:hover:text-white"
                        title={`Sort by ${String(h.column.columnDef.header)}`}
                      >
                        <span className="truncate">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                        <span className="text-brand-600 dark:text-brand-400">{sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : ''}</span>
                      </button>
                      {game !== undefined && (
                        <select
                          aria-label={`Filter game ${game + 1}`}
                          value={(h.column.getFilterValue() as number | undefined) ?? ''}
                          onChange={(e) => h.column.setFilterValue(e.target.value === '' ? undefined : Number(e.target.value))}
                          className="h-6 rounded border border-ink-300 bg-white px-1 text-[11px] font-normal dark:border-ink-700 dark:bg-ink-950"
                        >
                          <option value="">All</option>
                          {gen.activeByGame[game].map((o) => (
                            <option key={o} value={o}>
                              {OUTCOME_SYMBOL[o]} · {pickLabel(gen.games[game], o)}
                            </option>
                          ))}
                        </select>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="relative grid" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const row = rows[vi.index];
              const selected = row.original === selectedRow;
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectRow(row.original)}
                  className={`absolute flex w-full cursor-pointer border-b border-ink-100 dark:border-ink-800/70 ${
                    selected
                      ? 'bg-brand-100 dark:bg-brand-950'
                      : vi.index % 2
                        ? 'bg-white hover:bg-ink-100 dark:bg-ink-950 dark:hover:bg-ink-900'
                        : 'bg-ink-50/60 hover:bg-ink-100 dark:bg-ink-900/40 dark:hover:bg-ink-900'
                  }`}
                  style={{ transform: `translateY(${vi.start}px)`, height: ROW_H }}
                  aria-selected={selected}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="flex items-center overflow-hidden px-2"
                      style={{ width: cell.column.getSize(), flex: cell.column.id === 'slip' ? '1 0 auto' : undefined }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-10 text-center text-sm text-ink-500 dark:text-ink-400">No combinations match these filters.</div>
        )}
      </div>
    </div>
  );
}
