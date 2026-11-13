import { describe, expect, it } from 'vitest';
import { generate, rowPicks } from '../lib/combinatorics';
import { makeGame } from '../lib/storage';
import { buildTree } from './GraphView';

/** Rendered widths of tree outcome nodes (see OutcomeNode). */
const width = (total: number) => (total > 27 ? 120 : 176);

describe('decision tree layout', () => {
  // 2 games (9 slips, full-size nodes), 3 games (27, the largest full-size tree), 4 games (81, compact nodes).
  for (const n of [1, 2, 3, 4]) {
    it(`keeps ${n}-game columns apart`, () => {
      const gen = generate(Array.from({ length: n }, (_, i) => makeGame(`H${i}`, `A${i}`)));
      const { nodes } = buildTree(gen, rowPicks(gen, 0));
      const outcomeNodes = nodes.filter((nd) => nd.type === 'outcome');
      const columnX = [...new Set(outcomeNodes.map((nd) => nd.position.x))].sort((a, b) => a - b);
      expect(columnX).toHaveLength(n);
      for (let c = 1; c < columnX.length; c++) {
        // Leave at least 24px between a column's right edge and the next column for the edges.
        expect(columnX[c] - (columnX[c - 1] + width(gen.total))).toBeGreaterThanOrEqual(24);
      }
    });
  }
});
