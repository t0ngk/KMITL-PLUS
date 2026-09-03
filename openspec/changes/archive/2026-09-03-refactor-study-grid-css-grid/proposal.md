# refactor-study-grid-css-grid

## Why

The study table grid (`Grid.svelte`) is hard to understand: the `<table>` + colspan model forces ~40 lines of slot machinery (build a 48-cell array per day, fill it, then collapse consecutive cells into colspans) plus per-cell width hacks (`w-[2.08333%]`). Global `td`/`th`/`tbody` element selectors in `styles.css` couple the redesigned grid to the legacy table's styling. This is a maintainability refactor — the rendered result must stay visually identical.

## What Changes

- Replace the `<table>`/colspan layout in `Grid.svelte` with CSS Grid: each subject maps directly to `grid-column: start / end` computed from its start/end time, eliminating the slot-array build and colspan-collapse logic.
- Reproduce the current look exactly: 15-minute vertical gridlines, hourly header labels, day column, row heights, `h-screen` sizing, cell card styling.
- Scope the global `td`/`th`/`tbody` rules in `styles.css` to the legacy-table container only, so the redesigned grid owns its own styles and the old-design toggle keeps its current appearance.
- Remove the global `* { transition-all }` rule (or scope it to elements that actually animate); no visual change for static rendering.
- Out of scope: subject color logic (`theme.js`), overlapping-subject rendering (current last-writer-wins behavior is preserved), any visual redesign.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None — rendering behavior and appearance are unchanged; this change sets `skip_specs: true`.

## Impact

- `src/features/study-table/Grid.svelte` — rewritten layout (table → CSS Grid).
- `src/assets/styles.css` — element selectors scoped to legacy container; `transition-all` rule removed/scoped.
- `src/features/study-table/StudyTable.svelte` — possibly a class/wrapper for the legacy-table scope; no logic change.
- PNG export (snapdom) captures the same DOM subtree — must be verified against the new markup.
- Existing spec `study-table-render` still describes the behavior accurately (15-minute visual slots, Mon–Sun rows, empty state, old-design toggle); no delta needed.
