# Design — refactor-exam-ui

## Context

See proposal.md for motivation. Current state that shapes the approach:

- `ExamSchedule.svelte` is one 143-line file holding four unrelated concerns: the faculty/student info block, the hidden mid/final `<form>`, the date-grouped `<table>` (rowspan per exam day), and the fixed bottom-right button bar. The study-table feature was already decomposed this way (`HeaderCard` / `Grid` / `Controls` / `CustomizeMenu`); this feature never was.
- The exam table's appearance depends on the global `td` / `th` / `tbody` element selectors in `styles.css`. The in-flight `refactor-study-grid-css-grid` change scopes those globals to a legacy-table container, which would silently restyle this page.
- Mid/final switching is a full-page reload: the `<form>` posts to `report_examtable_show.php` with `year` / `semester` / `student_id` / `mid_or_final`. `student_id` has always been posted **empty** — the server resolves the student from the session cookie, so it works anyway. `scraper.js` does capture the real id (`data.studentId`), it is just not what the form sends.
- `services/reg.js` already exposes `fetchExamTable(year, semester, studentId, midOrFinal)`, written for exactly this page, but nothing calls it yet.
- PNG export (snapdom) captures the subtree bound to `table` in `ExamSchedule.svelte`. A native `<select>` renders as an unstyled control in the export, so a `downloading` flag swaps it for a plain `<span>` during capture.
- This change is bounded by fidelity, not by design: nothing about the rendered page may move. There is no test framework — verification is a live walk (see `tasks.md`).

## Goals / Non-Goals

**Goals:**

- Split the monolith into components whose boundaries match the study-table feature's, so both features read the same way.
- Make the exam page's styling self-declared, so `refactor-study-grid-css-grid` can scope the global element selectors without touching this page.
- All new/moved components in Svelte 5 runes mode (`$props` / `$state` / `$bindable`), per the project's standing rule that legacy-mode dependency analysis misses closure reads in templates.

**Non-Goals:**

- No shared `Controls` abstraction between the two features. Two call sites is not enough evidence of the right shape.
- No behavior change to mid/final switching, the `student_id` quirk, the old-design toggle, or PNG export.
- No scraper changes — `scraper.js` is untouched by this change, which is what lets a static verification argue that data-shaped edge cases ("ไม่ทราบ", "จัดสอบเอง", the "A/B" exam-type merge) cannot have regressed.

## Decisions

### 1. Split on state ownership, not on visual regions

Four components, with all mutable state kept in the parent:

```
   ExamSchedule.svelte          state: table, downloading, useNewDesign
        |
        +-- ExamHeader.svelte    props: data, downloading
        |                        owns: the mid/final <form> + its submit
        +-- ExamTable.svelte     props: schedule           (pure render)
        +-- ExamControls.svelte  props: captureTarget, onCaptureStart/End
                                 binds: useNewDesign
```

- Why: `downloading` is produced by `ExamControls` (via `DownloadButton`'s capture callbacks) and consumed by `ExamHeader` (select → span swap). Two siblings, so the flag has to live in the parent; hoisting it there makes both children props-only and keeps the data flow one-directional.
- Why the `<form>` lives inside `ExamHeader` rather than the parent: the `<select>` it wraps is visually part of the header block, and `form.submit()` needs a `bind:this` to the element it owns. Splitting them would put a ref across a component boundary for no gain.
- Alternative (split by visual region: "top card" / "table" / "buttons", state pushed down): `downloading` would have to travel sibling-to-sibling through events; rejected.

### 2. The exam table re-declares its own cell styling instead of adopting `.kmitl-table`

`ExamTable.svelte` carries `CELL = "text-center border-l border-r font-light"` on every `<td>` and `class="border"` on its `<tbody>` — the exact declarations the global selectors contributed.

- Why: this change must land **before** the scoping change, so it cannot depend on a class that does not exist yet. Re-declaring makes the exam page independent of `styles.css` at the moment it is refactored, which is the whole sequencing point in the proposal.
- Why not add `.kmitl-table` later anyway: once the declarations are explicit, the scope class would only duplicate them. The follow-up change records this as a deliberate deviation.
- `th` is **not** re-declared: the exam table has no `<th>` element, so the global `th` rule has no consumer here.
- `font-prompt` is **not** re-declared: it also comes from the global `*` rule, which neither change touches.
- Alternative (scope `styles.css` first, then refactor): inverts the proposal's sequencing and leaves the exam page broken in between; rejected.

### 3. `ExamControls` copies the *structure* of `Controls.svelte`, not its classes

Own component, fixed bottom-right bar, `DownloadButton` + toggle button — but keeping the exam page's own `bottom-4 right-4 flex gap-2` and slate button classes rather than `Controls.svelte`'s `bottom-3 right-3 items-center`.

- Why: this is a look-preserving refactor. Adopting the study table's spacing would move the bar by 4px — a visual change smuggled in under a structural task.
- Consequence: the two bars are now near-duplicates that differ only in spacing. That duplication is the evidence needed to decide the shared abstraction later; it is deliberately left visible rather than resolved now.

### 4. Mid/final stays a full-page `form.submit()`

`fetchExamTable()` exists and would allow switching in-page, matching what the study table already does for year/semester.

- Why not now: swapping it in means introducing loading state, error handling for a failed fetch, and a decision about what the page shows while the other term loads — none of which can be verified without a live session. Bundling it here would make a fidelity refactor unverifiable.
- Deferred to a future change, which can then also revisit the empty `student_id`.

### 5. `student_id` keeps posting an empty value

The quirk is preserved verbatim, with a comment in `ExamHeader.svelte` explaining that the server resolves the student from the session.

- Why: it is load-bearing in the sense that it currently works; changing it is a behavior change with a live-only failure mode (posting a real id could hit a different server code path). Preserving-with-a-comment converts undocumented weirdness into a documented decision at zero risk.

## Risks / Trade-offs

- [The refactor is verified statically (markup moved between files, argued unchanged) rather than by a live walk] → `tasks.md` 4.1 / 4.2 stay open and blocked until a session is available; the change is not archived on static evidence alone.
- [Re-declared cell classes drift from what the globals actually contributed] → The declaration inventory is recorded in `tasks.md` 2.1; the follow-up scoping change re-greps `src/` for unscoped `<td>` / `<th>` / `<table>` consumers.
- [PNG export breaks because the capture subtree moved] → `bind:this={table}` still wraps the same `w-10/12` element, and `downloading` still flows `ExamControls → parent → ExamHeader`; verified by inspection, live re-verification is task 4.2.
- [Two near-identical control bars invite a premature shared component] → Left explicit in decision 3 so a later change makes that call with three examples instead of two.

## Migration Plan

Single change, no data or API migration. Rollback = revert. The old-design toggle (`{@html oldDesign}`) is unaffected and remains the in-page fallback if the new markup misbehaves.

## Open Questions

- Whether the two control bars converge into one shared component, and at what spacing — deferred until a third consumer exists. Does not affect this change's specs, approach, or tasks.
