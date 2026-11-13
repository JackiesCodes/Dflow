import { memo, useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { pickLabel, rowIndexOf } from '../lib/combinatorics';
import type { Generated, Outcome } from '../lib/types';
import { OUTCOME_SYMBOL } from '../lib/types';
import { Button, OUTCOME_STYLES } from './ui';

export const TREE_LIMIT = 729; // 3^6 leaves
const DEFAULT_EXPANDED_COLUMNS = 10;

type Mode = 'tree' | 'flow';

type OutcomeData = {
  kind: 'outcome';
  outcome: Outcome;
  title: string;
  subtitle?: string;
  onPath: boolean;
  compact: boolean;
  game: number;
  prefix?: Outcome[];
  vertical?: boolean;
};
type CollapsedData = { kind: 'collapsed'; game: number; title: string; count: number; onPath: boolean; pick?: string; vertical?: boolean };
type HeaderData = {
  kind: 'header';
  game: number;
  title: string;
  subtitle: string;
  collapsed: boolean;
  canCollapse: boolean;
  narrow?: boolean;
  vertical?: boolean;
};
type StartData = { kind: 'start'; title: string; vertical?: boolean };

const inPos = (v?: boolean) => (v ? Position.Top : Position.Left);
const outPos = (v?: boolean) => (v ? Position.Bottom : Position.Right);
const HANDLE = '!size-1.5 !min-w-0 !border-0 !bg-slate-400';
type FlowNode =
  | Node<OutcomeData, 'outcome'>
  | Node<CollapsedData, 'collapsed'>
  | Node<HeaderData, 'header'>
  | Node<StartData, 'start'>;

const OutcomeNode = memo(({ data }: NodeProps<Node<OutcomeData, 'outcome'>>) => {
  const s = OUTCOME_STYLES[data.outcome];
  return (
    <div
      className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 shadow-sm transition-all ${
        data.onPath ? `${s.solid} ring-4 ${s.ring}/30` : s.soft
      } ${
        data.vertical
          ? 'h-[56px] w-[112px] gap-1.5 px-2 text-[11px]'
          : data.compact
            ? 'h-[26px] w-[120px] px-2 text-[11px]'
            : 'h-[52px] w-[176px] px-3 text-xs'
      }`}
      title={data.subtitle ? `${data.title} — ${data.subtitle}` : data.title}
    >
      <Handle type="target" position={inPos(data.vertical)} className={HANDLE} />
      <span
        className={`flex shrink-0 items-center justify-center rounded font-bold ${
          data.compact ? 'size-4 text-[10px]' : 'size-6 text-xs'
        } ${data.onPath ? 'bg-white/25' : `${s.dot} text-white`}`}
      >
        {OUTCOME_SYMBOL[data.outcome]}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate font-semibold">{data.title}</span>
        {data.subtitle && !data.compact && <span className="block truncate opacity-75">{data.subtitle}</span>}
      </span>
      <Handle type="source" position={outPos(data.vertical)} className={HANDLE} />
    </div>
  );
});

const CollapsedNode = memo(({ data }: NodeProps<Node<CollapsedData, 'collapsed'>>) => (
  <div
    className={`flex h-[52px] ${data.vertical ? 'w-[112px]' : 'w-[120px]'} flex-col items-center justify-center rounded-lg border-2 border-dashed text-xs ${
      data.onPath
        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200'
        : 'border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
    }`}
    title="Collapsed column — click the header to expand"
  >
    <Handle type="target" position={inPos(data.vertical)} className={HANDLE} />
    <span className="font-semibold">{data.title}</span>
    <span className="opacity-75">{data.pick ? `pick: ${data.pick}` : `${data.count} outcomes`}</span>
    <Handle type="source" position={outPos(data.vertical)} className={HANDLE} />
  </div>
));

const HeaderNode = memo(({ data }: NodeProps<Node<HeaderData, 'header'>>) =>
  data.vertical ? (
    <div
      className={`flex w-[360px] items-center gap-2 rounded-lg px-1 py-1 text-xs ${data.canCollapse ? 'cursor-pointer' : ''}`}
      title={data.canCollapse ? (data.collapsed ? 'Expand game' : 'Collapse game') : undefined}
    >
      <span className="shrink-0 rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-slate-200 dark:text-slate-900">
        {data.title.replace('Game ', 'G')}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold text-slate-700 dark:text-slate-200">{data.subtitle}</span>
      {data.canCollapse && <span className="text-slate-400">{data.collapsed ? '▸' : '▾'}</span>}
    </div>
  ) : (
  <div
    className={`w-[176px] rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-900/90 ${
      data.canCollapse ? 'cursor-pointer hover:border-indigo-400' : ''
    } ${data.collapsed || data.narrow ? '!w-[120px]' : ''}`}
    title={data.canCollapse ? (data.collapsed ? 'Expand column' : 'Collapse column') : undefined}
  >
    <div className="flex items-center justify-between gap-1 font-semibold">
      <span className="truncate">{data.title}</span>
      {data.canCollapse && <span className="text-slate-400">{data.collapsed ? '▸' : '▾'}</span>}
    </div>
    {!data.collapsed && <div className="truncate text-slate-500 dark:text-slate-400">{data.subtitle}</div>}
  </div>
  ),
);

const StartNode = memo(({ data }: NodeProps<Node<StartData, 'start'>>) => (
  <div
    className={`flex ${data.vertical ? 'h-[34px]' : 'h-[52px]'} w-[96px] items-center justify-center rounded-full border-2 border-slate-400 bg-slate-800 text-xs font-semibold text-white dark:border-slate-500 dark:bg-slate-200 dark:text-slate-900`}
  >
    {data.title}
    <Handle type="source" position={outPos(data.vertical)} className={HANDLE} />
  </div>
));

const nodeTypes = { outcome: OutcomeNode, collapsed: CollapsedNode, header: HeaderNode, start: StartNode };

interface Props {
  gen: Generated;
  picks: Outcome[];
  onSelect: (picks: Outcome[]) => void;
  dark: boolean;
  /** Phone layout: the layered flow runs top-to-bottom, one row per game. */
  vertical?: boolean;
}

export function GraphView({ gen, picks, onSelect, dark, vertical = false }: Props) {
  const n = gen.games.length;
  const treeAllowed = gen.total <= TREE_LIMIT;
  const initialMode = (): Mode => (treeAllowed && !vertical ? 'tree' : 'flow');
  const [mode, setMode] = useState<Mode>(initialMode);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => (vertical ? new Set() : defaultCollapsed(n)));

  // Reset view settings whenever a new result set is generated.
  useEffect(() => {
    setMode(gen.total <= TREE_LIMIT && !vertical ? 'tree' : 'flow');
    setCollapsed(vertical ? new Set() : defaultCollapsed(gen.games.length));
  }, [gen, vertical]);

  const effectiveMode: Mode = treeAllowed ? mode : 'flow';

  const { nodes, edges, focus } = useMemo(
    () => (effectiveMode === 'tree' ? buildTree(gen, picks) : buildFlow(gen, picks, collapsed, vertical)),
    [effectiveMode, gen, picks, collapsed, vertical],
  );

  const toggleColumn = (g: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  const onNodeClick = (_: unknown, node: FlowNode) => {
    const d = node.data;
    if (d.kind === 'header') {
      if (d.canCollapse) toggleColumn(d.game);
      return;
    }
    if (d.kind !== 'outcome') return;
    const next = [...picks];
    if (d.prefix) d.prefix.forEach((o, i) => (next[i] = o));
    else next[d.game] = d.outcome;
    onSelect(next);
  };

  // Re-fit only when the structure changes, not when the highlighted path changes.
  const fitKey = `${vertical ? 'v' : 'h'}|${effectiveMode}|${gen.total}|${n}|${gen.elapsedMs}|${[...collapsed].join(',')}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
        <div className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700" role="group" aria-label="Graph layout">
          <button
            type="button"
            disabled={!treeAllowed}
            onClick={() => setMode('tree')}
            className={`rounded-md px-2.5 py-1.5 font-medium sm:py-1 ${effectiveMode === 'tree' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'} disabled:opacity-40`}
            title={treeAllowed ? 'Every path drawn as its own branch' : `Tree view is limited to ${TREE_LIMIT} combinations`}
          >
            <span className="sm:hidden">Tree</span>
            <span className="hidden sm:inline">Decision tree</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('flow')}
            className={`rounded-md px-2.5 py-1.5 font-medium sm:py-1 ${effectiveMode === 'flow' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
            title="Compact layered flow — scales to any number of games"
          >
            <span className="sm:hidden">Flow</span>
            <span className="hidden sm:inline">Layered flow</span>
          </button>
        </div>
        {effectiveMode === 'flow' && n > 1 && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setCollapsed(new Set())}>
              Expand<span className="hidden sm:inline">all</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCollapsed(new Set(Array.from({ length: n }, (_, i) => i)))}>
              Collapse<span className="hidden sm:inline">all</span>
            </Button>
          </>
        )}
        <span className="ml-auto hidden text-slate-500 md:inline dark:text-slate-400">
          {effectiveMode === 'tree'
            ? `${gen.total.toLocaleString()} leaves = ${gen.total.toLocaleString()} slips · click a node to pick its path`
            : 'Each left→right path is one slip · click outcomes to build a path · click headers to collapse'}
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <ReactFlow<FlowNode, Edge>
          key={fitKey}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onlyRenderVisibleElements={nodes.length > 400}
          fitView
          fitViewOptions={{ padding: 0.08, maxZoom: 1.1, nodes: focus }}
          minZoom={0.02}
          maxZoom={2.5}
          colorMode={dark ? 'dark' : 'light'}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>
    </div>
  );
}

function defaultCollapsed(n: number): Set<number> {
  const s = new Set<number>();
  if (n > DEFAULT_EXPANDED_COLUMNS + 2) for (let i = DEFAULT_EXPANDED_COLUMNS; i < n; i++) s.add(i);
  return s;
}

function gameTitle(gen: Generated, g: number) {
  const game = gen.games[g];
  return `${game.home || 'Home'} vs ${game.away || 'Away'}`;
}

const pathEdgeStyle = (o: Outcome) => ({ stroke: OUTCOME_STYLES[o].hex, strokeWidth: 3 });

/** Layered DAG: one column per game, every outcome connected to every outcome of the next game. */
function buildFlow(gen: Generated, picks: Outcome[], collapsed: Set<number>, vertical = false) {
  if (vertical) return buildVerticalFlow(gen, picks, collapsed);
  const n = gen.games.length;
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];
  const COL_W = 236;
  const ROW_H = 76;
  const top = 0;

  nodes.push({ id: 'start', type: 'start', position: { x: 0, y: top + ROW_H }, data: { kind: 'start', title: 'Slip' } });

  let x = 140;
  let prevIds: { id: string; outcome?: Outcome; onPath: boolean }[] = [{ id: 'start', onPath: true }];

  for (let g = 0; g < n; g++) {
    const act = gen.activeByGame[g];
    const isCollapsed = collapsed.has(g);
    nodes.push({
      id: `h-${g}`,
      type: 'header',
      position: { x, y: top - 70 },
      data: {
        kind: 'header',
        game: g,
        title: `Game ${g + 1}`,
        subtitle: gameTitle(gen, g),
        collapsed: isCollapsed,
        canCollapse: n > 1,
      },
    });

    let current: { id: string; outcome?: Outcome; onPath: boolean }[];
    if (isCollapsed) {
      const id = `c-${g}`;
      nodes.push({
        id,
        type: 'collapsed',
        position: { x, y: top + ROW_H },
        data: { kind: 'collapsed', game: g, title: `G${g + 1}`, count: act.length, onPath: true, pick: OUTCOME_SYMBOL[picks[g]] },
      });
      current = [{ id, onPath: true }];
      x += 160;
    } else {
      // Centre columns with fewer active outcomes.
      const offset = ((3 - act.length) * ROW_H) / 2;
      current = act.map((o, i) => {
        const id = `n-${g}-${o}`;
        const onPath = picks[g] === o;
        nodes.push({
          id,
          type: 'outcome',
          position: { x, y: top + offset + i * ROW_H },
          data: {
            kind: 'outcome',
            outcome: o,
            game: g,
            title: pickLabel(gen.games[g], o),
            subtitle: `${OUTCOME_SYMBOL[o]} · ${(gen.probs[g][o] * 100).toFixed(1)}%`,
            onPath,
              compact: false,
          },
        });
        return { id, outcome: o, onPath };
      });
      x += COL_W;
    }

    for (const p of prevIds) {
      for (const c of current) {
        const hot = p.onPath && c.onPath;
        const color = c.outcome ?? picks[g];
        edges.push({
          id: `${p.id}>${c.id}`,
          source: p.id,
          target: c.id,
          animated: hot,
          zIndex: hot ? 10 : 0,
          style: hot ? pathEdgeStyle(color) : { strokeWidth: 1, opacity: 0.6 },
        });
      }
    }
    prevIds = current;
  }
  // With many columns, open on the first few so the nodes stay readable; pan/zoom for the rest.
  const FOCUS_X = 140 + 5 * COL_W;
  const focus = x > FOCUS_X + COL_W ? nodes.filter((nd) => nd.position.x < FOCUS_X).map((nd) => ({ id: nd.id })) : undefined;
  return { nodes, edges, focus };
}

/** Phone layout of the layered flow: games stacked top-to-bottom, outcomes side by side. */
function buildVerticalFlow(gen: Generated, picks: Outcome[], collapsed: Set<number>) {
  const n = gen.games.length;
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];
  const COL_W = 124;
  const ROW_H = 118;
  const WIDTH = 3 * COL_W - 12;
  const TOP = 64;

  nodes.push({ id: 'start', type: 'start', position: { x: WIDTH / 2 - 48, y: 0 }, data: { kind: 'start', title: 'Slip', vertical: true } });
  let prevIds: { id: string; onPath: boolean }[] = [{ id: 'start', onPath: true }];

  for (let g = 0; g < n; g++) {
    const act = gen.activeByGame[g];
    const isCollapsed = collapsed.has(g);
    const rowY = TOP + g * ROW_H;
    nodes.push({
      id: `h-${g}`,
      type: 'header',
      position: { x: -24, y: rowY },
      data: {
        kind: 'header',
        game: g,
        title: `Game ${g + 1}`,
        subtitle: gameTitle(gen, g),
        collapsed: isCollapsed,
        canCollapse: n > 1,
        vertical: true,
      },
    });
    let current: { id: string; outcome?: Outcome; onPath: boolean }[];
    if (isCollapsed) {
      const id = `c-${g}`;
      nodes.push({
        id,
        type: 'collapsed',
        position: { x: WIDTH / 2 - 56, y: rowY + 34 },
        data: { kind: 'collapsed', game: g, title: `G${g + 1}`, count: act.length, onPath: true, pick: OUTCOME_SYMBOL[picks[g]], vertical: true },
      });
      current = [{ id, onPath: true }];
    } else {
      const offset = ((3 - act.length) * COL_W) / 2;
      current = act.map((o, i) => {
        const id = `n-${g}-${o}`;
        const onPath = picks[g] === o;
        nodes.push({
          id,
          type: 'outcome',
          position: { x: offset + i * COL_W, y: rowY + 34 },
          data: {
            kind: 'outcome',
            outcome: o,
            game: g,
            title: o === 1 ? 'Draw' : (o === 0 ? gen.games[g].home || 'Home' : gen.games[g].away || 'Away'),
            subtitle: `${(gen.probs[g][o] * 100).toFixed(1)}%`,
            onPath,
            compact: false,
            vertical: true,
          },
        });
        return { id, outcome: o, onPath };
      });
    }
    for (const p of prevIds) {
      for (const c of current) {
        const hot = p.onPath && c.onPath;
        const color = c.outcome ?? picks[g];
        edges.push({
          id: `${p.id}>${c.id}`,
          source: p.id,
          target: c.id,
          animated: hot,
          zIndex: hot ? 10 : 0,
          style: hot ? pathEdgeStyle(color) : { strokeWidth: 1, opacity: 0.5 },
        });
      }
    }
    prevIds = current;
  }
  // Open on the first few games at a readable zoom; scroll/pan down for the rest.
  const focus = n > 4 ? nodes.filter((nd) => nd.position.y < TOP + 4 * ROW_H).map((nd) => ({ id: nd.id })) : undefined;
  return { nodes, edges, focus };
}

/** Full decision tree: one branch per combination prefix, one leaf per slip. */
function buildTree(gen: Generated, picks: Outcome[]) {
  const n = gen.games.length;
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];
  const COL_W = 168;
  const LEAF_H = 32;
  const compact = gen.total > 27;
  const nodeH = compact ? 26 : 52;
  const leafH = compact ? LEAF_H : 68;

  let leafCursor = 0;
  // Recursively lay out: returns the centre y of the subtree.
  const walk = (g: number, prefix: Outcome[], parentId: string, parentOnPath: boolean): number => {
    const ys: number[] = [];
    for (const o of gen.activeByGame[g]) {
      const pre = [...prefix, o];
      const id = `t-${pre.join('')}`;
      const onPath = parentOnPath && picks[g] === o;
      let y: number;
      if (g === n - 1) {
        y = leafCursor * leafH;
        leafCursor++;
      } else {
        y = walk(g + 1, pre, id, onPath);
      }
      ys.push(y);
      const isLeaf = g === n - 1;
      const combo = isLeaf ? rowIndexOf(gen, pre) + 1 : 0;
      nodes.push({
        id,
        type: 'outcome',
        position: { x: 150 + g * COL_W, y: y - nodeH / 2 },
        data: {
          kind: 'outcome',
          outcome: o,
          game: g,
          prefix: pre,
          title: compact ? (isLeaf ? `#${combo} · ${shortLabel(gen, g, o)}` : shortLabel(gen, g, o)) : pickLabel(gen.games[g], o),
          subtitle: isLeaf ? `Slip #${combo}` : `Game ${g + 1}`,
          onPath,
          compact,
        },
      });
      edges.push({
        id: `${parentId}>${id}`,
        source: parentId,
        target: id,
        zIndex: onPath ? 10 : 0,
        animated: onPath,
        style: onPath ? pathEdgeStyle(o) : { strokeWidth: 1, opacity: 0.55 },
      });
    }
    return (ys[0] + ys[ys.length - 1]) / 2;
  };

  const rootY = n > 0 ? walk(0, [], 'start', true) : 0;
  nodes.push({ id: 'start', type: 'start', position: { x: 0, y: rootY - 26 }, data: { kind: 'start', title: 'Slip' } });
  for (let g = 0; g < n; g++) {
    nodes.push({
      id: `h-${g}`,
      type: 'header',
      position: { x: 150 + g * COL_W, y: -nodeH - 64 },
      data: { kind: 'header', game: g, title: `Game ${g + 1}`, subtitle: gameTitle(gen, g), collapsed: false, canCollapse: false, narrow: compact },
    });
  }
  // Big trees are far taller than wide: open on the top branches instead of a full-height fit.
  const focusRows = 16;
  const focus =
    gen.total > focusRows * 2
      ? nodes.filter((nd) => nd.id !== 'start' && nd.position.y < focusRows * leafH).map((nd) => ({ id: nd.id }))
      : undefined;
  return { nodes, edges, focus };
}

function shortLabel(gen: Generated, g: number, o: Outcome) {
  const game = gen.games[g];
  if (o === 1) return 'Draw';
  const t = (o === 0 ? game.home : game.away) || (o === 0 ? 'Home' : 'Away');
  return t.length > 11 ? `${t.slice(0, 10)}…` : t;
}
