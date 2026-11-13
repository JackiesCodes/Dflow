# Betting Slip Outcome Explorer

A client-side web app that generates **every possible outcome combination** for N football games and shows them as an interactive workflow graph and a table.

Five sample fixtures are preloaded, so it opens on the 3⁵ = **243-combination** graph.

## Features

- **Any number of games.** Each game has a home team, an away team and outcomes 1 / X / 2. You can untick outcomes per game, and the count becomes the product of the active outcomes (e.g. 3 × 2 × 3).
- **Full Cartesian product**, generated in a compact typed array. 3¹⁰ = 59,049 rows takes milliseconds. You get a warning above 100,000 combinations, and the hard limit is 1,000,000.
- **Graph view** (React Flow), with pan, zoom and fit:
  - *Decision tree*: every slip is its own left-to-right branch, one leaf per combination. Used for up to 729 combinations.
  - *Layered flow*: one column per game, and every outcome connects to every outcome of the next game. Each path is one slip. It scales to any N, and you can collapse or expand each column. Columns after the 10th start collapsed.
  - Colours: green = home win, amber = draw, blue = away win. Click nodes to build or highlight a slip.
- **Table view** (TanStack Table + TanStack Virtual): virtualised rows, sorting on every column, an outcome filter per game, global search (team, `1-X-2`, `draw`, `#57`), and CSV export of the filtered and sorted rows.
- **Probability panel**: equal odds by default, or custom weights per outcome. Shows the selected slip's chance of winning, the most likely slip, and how many results give **exactly K correct picks** with the chance of each.
- Light and dark mode, a responsive layout with a mobile drawer, toasts and a loading indicator. Games are saved in `localStorage`.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests for the combination / probability engine
npm run build     # static build in dist/
```

## Deploy

`npm run build` writes a static site to `dist/`. It uses relative paths (`base: './'`), so you can host it anywhere: Vercel, Netlify, GitHub Pages, S3, or any static server. It needs no backend.

## Project layout

```
src/lib/combinatorics.ts   generation, row lookup, probabilities, exactly-K distribution
src/lib/storage.ts         sample data + localStorage persistence
src/components/GameSidebar.tsx      game / team / outcome / weight inputs
src/components/GraphView.tsx        decision tree + layered flow (React Flow)
src/components/TableView.tsx        virtualised, sortable, filterable table + CSV
src/components/ProbabilityPanel.tsx probability summary
src/App.tsx                         layout, top bar, tabs, toasts, large-set warning
```
