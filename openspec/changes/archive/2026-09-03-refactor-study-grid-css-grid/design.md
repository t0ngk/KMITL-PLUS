# Design — refactor-study-grid-css-grid

## Context

See proposal.md for motivation. Current state that shapes the approach:

- `Grid.svelte` renders a `<table>`: header row of 12 hour labels (each `colspan=4`), then 7 day rows of 48 15-minute cells. Subjects become `<td colspan=N>` produced by per-day slot machinery: build a 48-element array, fill slots from `HH:MM`, collapse consecutive same-subject slots.
- Schedule data already snaps to 15-minute boundaries (`Math.floor(minute / 15)`), so minute-level precision is not required to reproduce the current output.
- `styles.css` styles `td`/`th`/`tbody` globally. Three consumers: the new Grid's table (goes away), `ExamSchedule.svelte`'s table (stays), and the legacy page HTML shown via `{@html oldTable}` (stays).
- `* { transition-all }` applies a transition to every element globally.
- The extension targets Chrome ≥ 130, so `grid-template-columns: subgrid` (Chrome 117+) is safe.
- snapdom exports the DOM subtree bound to `table` in `StudyTable.svelte`; it handles CSS Grid the same as tables, but output must be eyeballed.

## Goals / Non-Goals

**Goals:**
- `Grid.svelte`'s layout logic becomes a direct mapping: schedule item → grid coordinates. No intermediate slot arrays, no merge pass.
- Pixel-faithful reproduction of the current look, including 15-minute gridlines, hourly labels, `h-screen` sizing, 1/7 row heights, row hover highlight, and card styling.
- Table-element styling becomes explicitly scoped; no global `td`/`th`/`tbody` selectors remain.

**Non-Goals:**
- No visual redesign, no color-logic changes, no overlapping-subject rendering (last-writer-wins stays — with direct placement, "last in source order paints on top", matching today's outcome).
- No changes to scraping, term switching, or export logic.

## Decisions

### 1. Track model: 48 columns of 15 minutes (not 720 minute-tracks)

`grid-template-columns: max-content repeat(48, minmax(0, 1fr))`. A subject occupying slots `[s, e)` gets `grid-column: s + 2 / e + 2` (offset 2 = 1-based lines + day-label column).

- Why: data is already 15-minute-quantized; 48 tracks reproduce the current geometry exactly and replace the `w-[2.08333%]` width hack with the grid engine's own equal-track sizing.
- Alternative (720 minute-tracks): enables minute precision we don't render today; rejected as scope creep for a look-preserving refactor.

### 2. Row structure: one subgrid wrapper per day row

Outer container: `grid-template-rows: auto repeat(7, minmax(0, 1fr))` with `h-screen`. Each day row is a wrapper element with `grid-column: 1 / -1; display: grid; grid-template-columns: subgrid;`.

- Why: the row wrapper is a real element, so `hover:bg-slate-100` on it behaves exactly like the current `<tr>` hover (highlights the whole row even while the pointer is over a subject card). Columns stay aligned with the header because subgrid inherits the outer tracks.
- Alternative (flat single grid + full-width hover underlay per row): subject cards sit above the underlay, so hovering a card would not highlight the row — a behavior difference; rejected.
- Alternative (one independent grid per row): `max-content` day-label column would resolve per-row and misalign; rejected.

### 3. Gridlines: 48 static background cells per row, cards layered on top

Each row renders a dumb `{#each Array(48)}` of empty cells (borders replicating today's `td { border-l border-r }`) in `grid-row: 1`, then subject cards placed by `grid-column` also in `grid-row: 1` with a higher `z-index`.

- Why: borders come from the same CSS as today → identical rendering; no logic (a constant loop is not slot machinery — nothing is computed, filled, or merged).
- Alternative (`repeating-linear-gradient` background): fewer nodes but sub-pixel rounding can drift lines off the header's hour boundaries at some widths; rejected for fidelity.

**Superseded by the later design pass — 48 cells became 12.**

`Grid.svelte` now renders **one background cell per hour** (`{#each hours}`, each `grid-column: … / span SLOTS_PER_HOUR` with `border-l`), not 48 per row. Quarter-hour columns still exist as the placement unit — subject blocks are still positioned on 15-minute boundaries — but the quarter-hour lines are no longer drawn. The code says so directly (`เส้นที่วาดจริงมีแค่ขอบชั่วโมง`), and `DESIGN.md` states it as a rule: *"Quarter-hour columns still exist for positioning; they are simply not drawn."*

This change is not the author of that decision — the visual design pass that produced `DESIGN.md` made it afterwards, and this change's artifacts were never updated to match. Recorded here so the two do not silently contradict each other. The reasoning above still holds for what it decided at the time (static cells over a gradient); only the cell count and the resulting line density changed.

Task 3.1's note still describes the 48-cell border ledger. Read it as the state at the time it was written, not as the shipped grid.

### 4. Table styling scoped under one class

Replace global `td`/`th`/`tbody` rules with `.kmitl-table td` (etc.) and add `class="kmitl-table"` to `ExamSchedule.svelte`'s table and to a wrapper around `{@html oldTable}` in `StudyTable.svelte`. The new Grid carries its own utility classes and does not use the scope.

- Why: both remaining consumers keep their exact look; the stylesheet declares who it styles.
- Alternative (leave globals in place — new Grid has no `td`s so it's unaffected): works, but keeps the implicit coupling this refactor exists to remove; rejected.

### 5. `* { transition-all }` → explicit `transition-colors` on interactive elements

Remove the global rule; add `transition-colors` where a hover/active color change exists today (day-row hover, buttons in `Controls`/`CustomizeMenu`/`DownloadButton`).

- Why: preserves the perceptible hover fades while dropping the everything-animates rule (layout properties animating during term switches is jank waiting to happen).

## Risks / Trade-offs

- [Subtle pixel drift vs. old table rendering (border collapsing, header label centering)] → Side-by-side screenshot comparison against the current build on the live study table page before merging; adjust border sides (e.g., first/last cell) to match.
- [snapdom PNG export renders the new markup differently] → Export a PNG from the refactored grid and diff visually against a pre-refactor export of the same term.
- [Scoping misses a `td` consumer somewhere] → `grep` for `<td`/`<th`/`<table` across `src/` after scoping (ExamSchedule and the legacy wrapper are the only known consumers; HeaderCard uses none).
- [Removing `transition-all` changes feel on an element not covered by the explicit list] → Walk the UI (theme customize, term switch, mode toggle) and add `transition-colors` where a fade is missed.

## Migration Plan

Single PR, no data or API migration. Rollback = revert the commit. The old-design toggle (`{@html oldTable}`) is unaffected and remains the in-app fallback if a rendering bug ships.
