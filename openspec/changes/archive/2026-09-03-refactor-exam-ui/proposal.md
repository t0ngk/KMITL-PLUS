# refactor-exam-ui

## Why

`ExamSchedule.svelte` is a 143-line monolith that never got the decomposition treatment the study table received: header info, the mid/final form, the date-grouped table, and the bottom-right action buttons all live in one file with duplicated button styling. Worse, its table styling silently depends on the global `td`/`th`/`tbody` element selectors in `styles.css` — the same selectors the in-flight `refactor-study-grid-css-grid` change plans to scope to the legacy-table container. Landing this refactor first removes that hidden dependency so the study-grid change can scope those globals without breaking the exam page.

## What Changes

- Decompose `ExamSchedule.svelte` into focused components under `src/features/exam-schedule/` (header/info card with the mid-final form, date-grouped table, bottom-right controls), following the `study-table` feature layout. All components in Svelte 5 runes mode.
- Make the exam table own its styling: add explicit classes for what the global `td`/`th`/`tbody` rules currently provide (`text-center`, side borders, `font-light`, `text-sm`, tbody border) so removing or scoping those globals later causes no visual change on this page.
- Align the bottom-right buttons with the study-table `Controls.svelte` markup pattern (fixed bottom-right bar) without changing their current appearance; no shared abstraction is extracted — two features do not justify it yet.
- Behavior preserved exactly: mid/final switching stays a hidden-form `form.submit()` full-page reload; the empty `student_id` quirk, the old/new design toggle, and PNG download all keep their current behavior. Switching to in-page `fetchExamTable()` is deliberately deferred to a future change.
- Out of scope: any visual redesign (colors, layout, typography), year/semester switching, scraper changes (`scraper.js` is already clean), edits to `styles.css` (that belongs to `refactor-study-grid-css-grid`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None — rendering behavior and appearance are unchanged; this change sets `skip_specs: true`. The existing `exam-schedule-render` spec still describes the behavior accurately.

## Impact

- `src/features/exam-schedule/ExamSchedule.svelte` — slimmed to composition + state, runes mode.
- `src/features/exam-schedule/` — new components (header card, table, controls).
- `src/content/examSchedule.js` — untouched unless the component's props interface changes shape (it should not).
- PNG export (snapdom) captures the `table`-bound subtree — must be re-verified against the new markup, including the `downloading` state that swaps the select for a span.
- Sequencing: this change should land **before** `refactor-study-grid-css-grid` scopes the global element selectors; after it lands, the exam page no longer depends on them.
