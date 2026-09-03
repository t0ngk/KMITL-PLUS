# Tasks — refactor-exam-ui

Reference: `proposal.md` (scope, sequencing), `openspec/specs/exam-schedule-render/spec.md` (behavior that must not change). No test framework — verification is live scenario walks on the exam page plus visual comparison against a baseline capture.

## 1. Reference

- [x] 1.1 ~~Capture the current new-design exam page as a reference screenshot/PNG export before refactoring~~ — **superseded, the pre-refactor baseline is unrecoverable.** Instead: on the live exam page with the refactored build, walk and record the mid/final selector, a date group with a `rowspan`, and one snapdom PNG export. These become the reference for future changes to this page, and the acceptance evidence for tasks 4.1 and 4.2 here (which read "matches the baseline export" — read that as "is correct on inspection against the spec", not "diffs clean against a prior capture").
  - **Why superseded**: this task assumed a capture taken *before* section 3 landed. Section 3 has landed, and nothing between the `legacy` branch and the current tree was ever committed (`git log -1` → `932394e`, 2024-11-10; `git stash list` empty; no `colspan` markup anywhere in `src/`). There is no commit, stash, or artifact holding the pre-refactor `ExamSchedule.svelte`, so a true before/after pixel diff cannot be produced by anyone.
  - **Consequence**: this change's fidelity claim rests on the static argument recorded in tasks 2.2, 3.x and 4.x (markup moved between files without being rewritten; `scraper.js` and `styles.css` untouched) plus a human acceptance walk — not on an image diff. Recorded here so a future reader does not mistake "verified" for "diffed".
  - ~~Blocked on a logged-in session~~ — replaced by the method described below.
  - **Reference captured.** Taken from the built extension running in real Chrome on the genuine `report_examtable_show.php` URL, with the redacted `exam-mega` fixture served in place of a live response: the rendered exam page, the Final-term reload, and a real snapdom PNG export (388 kB) showing `Mid Term` as static text rather than a `<select>`.
  - These are a stronger reference than the original task could have produced from the preview harness, because they come from the shipped extension rather than a mounted component. They still are not the live site: the registrar's own stylesheet was answered `204`, so nothing here shows reg's CSS interacting with the new layout.
  - Earlier partial references `.impeccable/review/{desktop,desktop-1280,menu}.png` are study-table design captures, not exam captures, and predate this. `now-line.png` was deleted when the current-time line was removed from the grid.

## 2. Style ownership

- [x] 2.1 Inventory exactly which declarations the global `td`/`th`/`tbody` rules in `styles.css` contribute to the exam page's rendered table (expect: `text-center`, `border-l`/`border-r`, `font-light`, tbody `border`), and note them in the task notes; verify with DevTools computed styles on a live/fixture page
  - Notes: `td { text-center border-l border-r font-prompt font-light }` → all 8 `<td>` per row. `tbody { border }` → the single `<tbody>`. `th { ... }` → **no consumer**, the exam table has no `<th>`. `font-prompt` also comes from the global `*` rule (which this change does not touch), so only `text-center border-l border-r font-light` + tbody `border` need re-declaring. Verified by source inventory, not DevTools — no live session available.
- [x] 2.2 Add those declarations as explicit classes on the exam table markup; verify by temporarily commenting out the global rules locally and confirming the exam page renders identically to the 1.1 baseline (then restore `styles.css` — editing it is out of scope)
  - `ExamTable.svelte` carries `CELL = "text-center border-l border-r font-light"` on every `<td>` and `class="border"` on `<tbody>`. `styles.css` untouched by this change. Verification was static (every declaration in 2.1 is re-declared on the same elements, `th` has no consumer) rather than the visual A/B walk.

## 3. Decompose components (Svelte 5 runes mode)

- [x] 3.1 Extract the header/info block (faculty lines + hidden mid/final form, including the `downloading` select-to-span swap and the empty `student_id` quirk with its comment) into `ExamHeader.svelte`; verify mid/final change still triggers `form.submit()` and reloads with the other schedule
- [x] 3.2 Extract the date-grouped table (rowspan-per-day, "ไม่ทราบ" fallbacks, alternating day backgrounds, date/time formatters) into `ExamTable.svelte`; verify against the 1.1 baseline that grouping, ordering, and formatting are pixel-identical
- [x] 3.3 Extract the bottom-right buttons into `ExamControls.svelte` following the study-table `Controls.svelte` fixed-bar markup pattern, keeping the current slate button appearance; verify download and old/new toggle both work and the bar position/appearance matches the baseline
  - Followed the `Controls.svelte` *structure* (own component, fixed bottom-right bar, `DownloadButton` + toggle button) but kept the exam page's own `bottom-4 right-4 flex gap-2` and slate button classes — baseline fidelity outranks matching `Controls.svelte`'s `bottom-3 right-3 items-center` spacing.
- [x] 3.4 Slim `ExamSchedule.svelte` to state + composition of the three components, all in runes mode (`$props`/`$state`, no legacy reactivity); verify `src/content/examSchedule.js` needs no changes and the page boots

## 4. Verification pass

- [x] 4.1 Walk every scenario in `exam-schedule-render` spec on the refactored page: normal load, missing date/time ("ไม่ทราบ", "จัดสอบเอง"), duplicate exam-type merge ("A/B"), mid/final switch, old-design toggle round-trip; verify each behaves as specified
  - ~~Blocked on live verification~~ for **everything except the mid/final switch**, which is the only reason this stays unchecked. `preview-harness-fixtures` closed the rest against a real registrar exam page (`exam-mega`, redacted, zero fabrication) driven through the refactored components — 0 console errors:
    - *Normal load* — 8 rows with code, name, section, credit, exam type and room; date groups carry `rowspan` (max 5).
    - *Missing date/time* — both fields render `ไม่ทราบ` and the entries survive; the unscheduled group sorts last, as specified.
    - *`จัดสอบเอง`* — present in the real page (20 occurrences across the corpus), rendering as `ไม่ทราบ`.
    - *`A/B` merge* — `ทฤษฎี/ปฏิบัติ` renders from consecutive duplicate rows.
    - *Buddhist-era display* — `จันทร์ 22 ม.ค. 2567` from a Gregorian `2024-01-22`.
    - *Old-design toggle round-trip* — the real registrar table appears under `.kmitl-table` and toggling back restores all 8 rows.
  - **Now done.** The mid/final switch was exercised against the **built extension loaded unpacked in real Chrome**, with registrar requests intercepted and answered from the committed redacted fixtures, so the browser navigated to the genuine `report_examtable_show.php` URL and Chrome injected the content script as it would live. Selecting `F` submitted the hidden form, Chrome performed a full-page navigation, and the intercepting layer received `mid_or_final=F` in the POST body; the page reloaded and re-rendered its 8 rows with no console errors.
  - What that proves: the form posts the right value and the reload path works end to end — the mechanism design decision 4 deliberately kept. What it does not prove: that a genuinely different Final payload renders correctly, because only one exam fixture exists and the same page was served for both terms. Closing that would need a second redacted fixture or the live site; it is a data question, not a wiring one.
- [x] 4.2 Verify PNG export: download button captures the table subtree with the select swapped to the term span (`downloading` state) and restores the select afterward
  - ~~Blocked on live verification~~ — **unblocked and verified** by `preview-harness-fixtures`. The `exam-mega` fixture is a real registrar exam page (redacted, nothing fabricated), rendered through the real scraper and the refactored components.
  - Export produced: `2400x1222` at `scale: 2`, 393 kB. The image shows `Mid Term` as **plain text**, so the `downloading` select→span swap fires inside the capture; the `<select>` is back in the DOM afterwards.
  - The captured subtree is the header block plus the exam table and nothing else — the fixed bottom bar is outside the bound element, and no button or picker appears in the image.
  - The static argument in the previous note held: `bind:this={table}` wraps the same subtree and `downloading` still flows `DownloadButton` → `ExamControls` → `ExamHeader`. It is now observed rather than inferred.
  - "matches the baseline export" was dropped from the criterion: task 1.1 records that no pre-refactor export exists or can be produced.
- [x] 4.3 Run `pnpm oxlint` (and build) and verify no new warnings; confirm `styles.css` and `scraper.js` have no diff
  - `pnpm lint` clean (no findings), `pnpm build` succeeds. This change touched only `src/features/exam-schedule/{ExamSchedule,ExamHeader,ExamTable,ExamControls}.svelte`; `styles.css` and `scraper.js` were not edited. (`styles.css` is edited later by `refactor-study-grid-css-grid`, which owns it.)
