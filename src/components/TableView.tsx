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
import { formatPct, pickLabel, slipString } from '../lib/combinatorics';
import type { Generated, Outcome } from '../lib/types';
import { OUTCOME_SYMBOL } from '../lib/types';
import { Button, Icon, ICONS, OutcomePill } from './ui';

interface Props {
  gen: Generated;
  selectedRow: number;
  onSelectRow: (row: number) => void;
  onToast: (msg: string) => void;
}

const ROW_H = 36;

export function TableView({ gen, selectedRow, onSelectRow, onToast }: Props) {
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
        cell: (c) => <span className="tabular-nums text-slate-500 dark:text-slate-400">{c.getValue<number>().toLocaleString()}</span>,
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
    return cols;
  }, [gen, n]);

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
    const header = ['Combination #', ...gen.games.map((g, i) => `Game ${i + 1}: ${g.home} vs ${g.away}`), 'Full Slip', 'Probability'];
    const chunks: string[] = [header.map(esc).join(',')];
    for (const row of rows) {
      const r = row.original;
      const cells = [String(r + 1)];
      for (let g = 0; g < n; g++) {
        const o = code(r, g);
        cells.push(esc(`${OUTCOME_SYMBOL[o]} (${pickLabel(gen.games[g], o)})`));
      }
      cells.push(slipString(gen.codes.subarray(r * n, r * n + n)), gen.rowProb[r].toPrecision(6));
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <label className="relative min-w-0 flex-1 basis-56">
          <Icon d={ICONS.search} className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search: team, “1-X-2”, “draw”, #57…"
            className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {rows.length.toLocaleString()} of {gen.total.toLocaleString()} rows
        </span>
        {filtersActive && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setColumnFilters([]);
              setSearch('');
            }}
          >
            Clear filters
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={scrollToSelected}>
          <Icon d={ICONS.target} className="size-3.5" /> Selected
        </Button>
        <Button size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Icon d={ICONS.download} className="size-3.5" /> Export CSV
        </Button>
      </div>

      <div ref={parentRef} className="relative min-h-0 flex-1 overflow-auto">
        <table className="grid text-sm" style={{ width: totalWidth, minWidth: '100%' }}>
          <thead className="sticky top-0 z-10 grid bg-slate-100 dark:bg-slate-900">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="flex w-full">
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  const game = (h.column.columnDef.meta as { game?: number } | undefined)?.game;
                  return (
                    <th
                      key={h.id}
                      className="flex flex-col gap-1 border-b border-r border-slate-200 px-2 py-1.5 text-left text-xs font-semibold text-slate-600 last:border-r-0 dark:border-slate-800 dark:text-slate-300"
                      style={{ width: h.getSize(), flex: h.column.id === 'slip' ? '1 0 auto' : undefined }}
                    >
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 truncate text-left hover:text-slate-900 dark:hover:text-white"
                        title={`Sort by ${String(h.column.columnDef.header)}`}
                      >
                        <span className="truncate">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                        <span className="text-indigo-500">{sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : ''}</span>
                      </button>
                      {game !== undefined && (
                        <select
                          aria-label={`Filter game ${game + 1}`}
                          value={(h.column.getFilterValue() as number | undefined) ?? ''}
                          onChange={(e) => h.column.setFilterValue(e.target.value === '' ? undefined : Number(e.target.value))}
                          className="h-6 rounded border border-slate-300 bg-white px-1 text-[11px] font-normal dark:border-slate-700 dark:bg-slate-950"
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
                  className={`absolute flex w-full cursor-pointer border-b border-slate-100 dark:border-slate-800/70 ${
                    selected
                      ? 'bg-indigo-100 dark:bg-indigo-950'
                      : vi.index % 2
                        ? 'bg-white hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900'
                        : 'bg-slate-50/60 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900'
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
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No combinations match these filters.</div>
        )}
      </div>
    </div>
  );
}
