# Design — revamp-exam-ui

## Context

See proposal.md for the measured gap. Current state that shapes the approach:

- `ExamSchedule.svelte` renders a centred `w-10/12` column on `bg-slate-100`, binds that column as the snapdom capture target, and mounts `ExamControls.svelte` as a floating `bottom-4 right-4` bar outside it.
- `ExamHeader.svelte` is four centred `<p>` lines plus a hidden `<form>` whose only visible control is a native `<select name="mid_or_final">`. The form posts to `report_examtable_show.php` on the form's own `onchange`, and `student_id` is deliberately posted empty because the server resolves the student from the session.
- During capture, `downloading` swaps that `<select>` for a plain `<span>` — required by `image-export`, whose rule is that interactive selectors inside the captured area are replaced by their text value.
- `ExamTable.svelte` owns its cell styling explicitly (`text-center border-l border-r font-light`) because `refactor-exam-ui` made it independent of the global element selectors before `refactor-study-grid-css-grid` scoped them.
- `Controls.svelte` is the study table's dock: a fixed 56px full-width band holding a status line, the term pickers, the customize menu, the download button and the mode toggle. It assumes every one of those exists.
- `DESIGN.md` is written as the study table's system, down to its title and its north star, "The Exported Week".
- The registrar's stylesheet is disabled while the redesigned view is shown and re-enabled for the old-design view (`fix-registrar-css-bleed`), so nothing here has to defend against `TD` or `SELECT` while the new design is on screen.

## Goals / Non-Goals

**Goals:**

- The exam page becomes indistinguishable from the study table in materials, type, spacing and chrome — one product, one system.
- One dock component serves both pages.
- The remark column stops out-weighing the subject names.
- `DESIGN.md` describes the product rather than one page.

**Non-Goals:**

- No change to scraping, grouping, ordering, the `ไม่ทราบ` fallbacks, the form POST, or the old-design toggle.
- No card layout. No grades page, no shadow root, no `cva`.
- Not touching the empty-`student_id` quirk; it is load-bearing and documented.

## Decisions

### 1. The table stays a table

Cards were considered and rejected. The study table is a time grid because the question there is *where in the week*; the exam page's question is *when, and where do I go*, asked across a handful of rows. Columns answer that by letting the eye run down date, time and room. A card per exam would re-ask the reader to parse each block.

- The `rowspan`-per-date grouping stays. It is the one piece of structure that makes the list read as days rather than rows, and it came from the registrar's own shape.
- What changes is the material: hairline `line` rules instead of borders on every cell, `ink` / `ink-3` instead of near-black, the 11/13px ramp, and the alternating `slate-200` band replaced by the system's `hover`-weight tint or dropped entirely if the date grouping already carries the rhythm.

### 2. One dock, not two

`ExamControls.svelte` is deleted and `Controls.svelte` serves both pages.

```
   before                          after
   ------                          -----
   Controls.svelte    (study)      Controls.svelte  (both)
   ExamControls.svelte (exam)          |
        |                              +-- study: pickers + customize + download + toggle
   floating bar, slate               +-- exam:   download + toggle
```

- Why now: `refactor-exam-ui` decision 3 kept the duplication on purpose and named the condition for resolving it — a third example. Merging resolves it a different way, by removing the second, which is better than abstracting over two.
- Consequence for `Controls.svelte`: it currently assumes the term pickers, the customize menu and a status line all exist. They become optional. The exam page passes neither pickers nor customize, and its status line is empty.
- Consequence recorded in the proposal: with one dock button style left, `cva` has no third consumer and no second one either. The deferral in `adopt-ui-primitives` decision 6 can be closed as "not needed" rather than "still waiting".
- Alternative (keep two components, share a style constant): leaves two files drifting apart again, which is exactly what produced the current mismatch.

### 3. Mid/Final becomes a segmented control, and stays in the sheet

Two buttons in a single bordered group, the active one carrying the sheet's own selected treatment.

- Why not move it to the dock: it is *data about what is displayed*, not chrome. The dock holds actions; the term identity belongs with the header, the same way the study table's term pill does. It also has to stay inside the capture frame so the exported PNG says which round it shows.
- Why not keep a `<select>`: it is one binary choice with both options worth showing at once, and a native select is the element the registrar names. A segmented control shows the alternative without a click.
- **The capture swap survives.** `image-export` requires interactive controls inside the frame to become text during capture. Buttons are still interactive, so `downloading` keeps swapping the group for the plain term name. This is not optional and the task list checks it.
- The form POST is untouched: the buttons submit the same hidden form with the same fields. Only the trigger changes from the form's `onchange` to an explicit submit, because buttons do not fire `change`.

### 4. `DESIGN.md` becomes the product's system

Renamed from "KMITL+ Study Table", with the exam page's components added.

- Why it must happen in this change rather than after: the moment the exam page uses these tokens, a document titled "Study Table" is describing two pages while claiming one. The north star, the rules and the palette all already apply product-wide; only the title and the component list are page-scoped.
- The exam page contributes three components the system does not yet describe: the exam table row, the date group, and the segmented control.

## Risks / Trade-offs

- [Merging the dock regresses the study table while trying to improve the exam page] → `Controls.svelte` is the study table's most-exercised component; making its parts optional must not change its rendering when everything is supplied. The spec walk covers the study dock and has to stay at full pass.
- [The segmented control breaks mid/final switching, the one mechanism that took longest to verify] → It is verified end to end in the built extension with an intercepted POST, the same method that first proved it works. Nothing less counts.
- [The capture swap is forgotten and the exported PNG shows two buttons] → `image-export`'s scenario is explicit about this; the task list re-runs the export check rather than trusting the change.
- [The remark column's new truncation hides information a student needs] → Truncation must be visual only; the full text stays available in the DOM and therefore in the exported image's source. If it cannot be both, the column keeps its content and loses width elsewhere.
- [Restyling `ExamTable` re-introduces a dependency on global element selectors that `refactor-exam-ui` deliberately removed] → The table keeps owning its styling with explicit classes; the tokens change, the ownership does not.

## Migration Plan

Single change, revertible. No manifest, build, dependency or data changes. Everything visible on the exam page moves; nothing it does changes.
