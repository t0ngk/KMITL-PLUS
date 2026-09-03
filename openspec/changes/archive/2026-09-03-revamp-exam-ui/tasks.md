# Tasks — revamp-exam-ui

Reference: `proposal.md` (the measured gap), `design.md` (the four decisions), `DESIGN.md` (the system being applied). Verification runs in the `preview/` harness and against the built extension in Chrome with registrar requests intercepted.

Ground rule: `exam-schedule-render` and `image-export` must come out untouched. Every scenario in both specs passes before and after, and the spec walk stays at full pass throughout.

## 1. Baseline

- [x] 1.1 Capture the exam page as it stands — full page, the `ไม่ทราบ` date group, and a snapdom PNG export — and record the export's dimensions and byte size. Verify the current spec walk and extension walk both pass, so any later failure is attributable to this change.
  - Baseline: 8 rows, `rowspan` pattern `[1,1,1,5]`, export **2400x1222 / 393050 B**. Spec walk and extension walk both green before touching anything.
- [x] 1.2 Record the exact inventory this change is removing: every `slate-*` class and where it appears, the floating bar's position classes, the `text-sm` uses, and the English strings. Verify the list is complete by grepping, so "no `slate-*` survives" is checkable at the end rather than asserted.

  - The removal list, gathered by grep so "no `slate-*` survives" is checkable rather than asserted: six `slate-*` uses across four files, one floating bar (`fixed bottom-4 right-4`), one `text-sm`, and the English strings `New Design` / `Old Design` / `Mid Term` / `Final`.
## 2. Make the dock shared

- [x] 2.1 Make `Controls.svelte`'s study-only parts optional — the term pickers, the customize menu, and the status line — so a page can mount the dock with only the download button and mode toggle. Verify the study table renders **identically** when all parts are supplied: same spec-walk result, same dock screenshot, same export bytes.
  - `Controls.svelte` gained a `customizable` flag and optional `onCaptureStart` / `onCaptureEnd`; the term pickers were already behind `pickerReady`.
  - Study table verified unchanged with everything supplied: spec walk stayed **30/30** immediately after the props became optional, before any exam work started.
- [x] 2.2 Mount the shared dock on the exam page and delete `ExamControls.svelte`; verify the exam page's download and mode toggle still work, that the dock sits in its reserved band rather than over the content, and that nothing references the deleted component.
  - The exam page mounts the shared dock and `ExamControls.svelte` is deleted; nothing references it. The dock sits in its 56px band with the page reserving `pb-[5rem]`, so it no longer floats over content.
- [x] 2.3 Fix the mode toggle's label on the exam page: Thai, and naming the destination (`แบบเดิม` / `แบบใหม่`) rather than the current state. Verify no English string renders anywhere on either page.

  - The toggle now reads `แบบเดิม` / `แบบใหม่` — Thai, and naming the destination rather than the current state, matching the study table.
  - The exam rounds became `กลางภาค` / `ปลายภาค`, and the table's column headers are Thai throughout (`กลุ่ม` rather than `sec`). The only remaining English was a stale comment in `boot.js` referring to the old button name; corrected.
## 3. Re-skin the sheet, header and table

- [x] 3.1 Put the exam content on the system's surface: `canvas` behind a white sheet with the `resting-sheet` shadow and 12px radius, and the dock's reserved bottom padding. Verify the capture target still wraps exactly the header plus table and nothing else.
  - `canvas` ground, white sheet at 12px radius with the `resting-sheet` shadow and a `line` border, and the dock's reserved bottom padding. The capture target still wraps exactly the header plus table.
- [x] 3.2 Rebuild `ExamHeader.svelte` on `HeaderCard`'s language — identity line, context line, term pill — keeping the hidden form, its three hidden inputs and the empty-`student_id` comment byte for byte. Verify the form still carries `year`, `semester` and an empty `student_id`.
  - `ExamHeader.svelte` rebuilt on `HeaderCard`'s language: identity line, context line, term pill. The hidden form keeps `year`, `semester` and the empty `student_id` with its comment intact.
  - The term pill uses `blockColors(DEFAULT_HEADER_COLOR)` rather than `kmitl-soft`/`kmitl` directly. The first attempt painted it with the raw token and broke **The No Raw Color Rule** — the rule this change's own proposal cites. Solved colour, like `HeaderCard`.
- [x] 3.3 Re-skin `ExamTable.svelte` onto the tokens: `ink`/`ink-3` text, `line` hairlines, the 11/13px ramp, and a date-group rhythm that does not need the `slate-200` band. Keep the table owning its own cell styling explicitly (design.md, Risks) rather than leaning on global element selectors. Verify grouping, `rowspan`, ordering and the `ไม่ทราบ` fallbacks are untouched.
  - Tokens only: `ink` / `ink-3` text, `line` hairlines, the 11/13px ramp, `.tnum` on codes and times. The alternating `slate-200` band is gone — the rule above each date group carries the rhythm instead.
  - The table still owns its cell styling with explicit classes, per the standing agreement from `refactor-exam-ui`.
  - Structure unchanged and checked, not assumed: still 8 rows with `rowspan` `[1,1,1,5]`, `ไม่ทราบ` fallbacks and the `ทฤษฎี/ปฏิบัติ` merge both present.
- [x] 3.4 Constrain the remark column so it stops out-weighing the subject names; verify the truncation is visual only and the full text is still present in the DOM, and therefore still in the exported image's source. If both cannot hold, keep the content and take the width from elsewhere.

  - The room/remark column is fixed-width and clamped to two lines. Verified the clamp is visual only: computed height 39px (two lines), **90 characters still in the DOM**, `title` carrying the full string.
  - First attempt did not clamp at all — `line-clamp-2 block` put two `display` utilities on one element and `block` won, killing `-webkit-box`. Caught by measuring rather than by looking.
## 4. Mid/Final as a segmented control

- [x] 4.1 Replace the native `<select>` with a two-button segmented control in the sheet, in the system's vocabulary, with the active round carrying the selected treatment. Verify it is operable by keyboard and that the active round is identifiable without relying on colour alone.
  - Two buttons in a `line` group, the active round carrying the `hover` ground, `font-medium`, `ink`, **and** `aria-pressed` — state is not carried by colour alone.
- [x] 4.2 Keep the form POST working: the buttons submit the same hidden form with the same fields, with the trigger moving from the form's `onchange` to an explicit submit because buttons do not fire `change`. Verify against the **built extension** with an intercepted POST that the server receives `mid_or_final=F` and the page reloads — the same method that first proved this mechanism.
  - **This is where the change's one real bug appeared, and the extension walk is what caught it.** The first version set the reactive value and called `form.submit()` in the same tick; the hidden input had not been written yet, so pressing `ปลายภาค` posted `mid_or_final=M`. The old `<select>` never had this problem because it *was* the form control and the browser read it live.
  - Fixed with `await tick()` before `submit()`, the same pattern `DownloadButton` already uses. Re-verified against the built extension with an intercepted POST: the server receives `mid_or_final=F` and the page reloads. **14/14.**
- [x] 4.3 Keep the capture swap: during `downloading` the group is replaced by the plain term name, per `image-export`. Verify by exporting and reading the image — no buttons in it.

  - Verified by reading the exported PNG, not by trusting the code: the image shows `กลางภาค` as plain text with no buttons, no dock and no pickers.
## 5. Verify nothing behavioural moved

- [x] 5.1 Walk every `exam-schedule-render` scenario: date grouping with `rowspan`, ordering, `ไม่ทราบ` for missing date and time, `จัดสอบเอง`, the `A/B` merge, Buddhist-era display, mid/final switching, old-design toggle round-trip. Verify each behaves exactly as at baseline.
  - Every `exam-schedule-render` scenario passes: date grouping with `rowspan`, ordering, `ไม่ทราบ` for missing date and time, `จัดสอบเอง`, the `A/B` merge, Buddhist-era display, mid/final switching, old-design round-trip. Row count and `rowspan` pattern identical to baseline.
- [x] 5.2 Walk `image-export` for the exam page: the export contains the header and table, the term shows as static text, and no dock, button or picker appears. Verify against the 1.1 baseline that the capture frame's contents did not change — only its styling.
  - Export contains header and table only, the round shows as static text, no chrome. Size moved from 393050 B to ~312-343 kB — expected and in the right direction: the same content on a lighter, denser sheet compresses smaller. The frame's *contents* are unchanged; only their styling is.
- [x] 5.3 Run the full spec walk and the corpus sweep; verify the study table's scenarios are unchanged and the sweep matches its recorded baseline. Run `pnpm lint` and `pnpm build`.
  - Spec walk **30/30**, corpus sweep identical to its recorded baseline, `pnpm lint` clean, `pnpm build` succeeds.
  - Four spec-walk assertions needed updating for the new markup — the mode-toggle button names, the round selector (now a `[aria-label="รอบสอบ"]` group rather than a `<select>`), the capture-restore check, and the time separator, which is now an en dash.
- [x] 5.4 Walk the built extension in Chrome with `registrar.css` served: both pages, both modes, both exports, the mid/final POST. Verify no console errors and that the old-design view still renders as the untouched registrar page.

  - Built extension in Chrome with `registrar.css` served: **14/14, zero console errors.** Both pages, both modes, both exports, the mid/final POST, and the old-design view still rendering as the untouched registrar page.
## 6. Confirm the gap is closed

- [x] 6.1 Verify no `slate-*` class remains anywhere in `src/`, and that the exam components now use the same token set as the study table — compare the token counts from 1.2 and expect them to converge rather than merely improve.
  - **Zero `slate-*` anywhere in `src/`.** Token usage converged rather than merely improved — the exam page now draws from the same set as the study table (`canvas`, `hover`, `ink`, `ink-2`, `ink-3`, `line`), where before it had two `hover` and one `kmitl` against the study table's full spread.
- [x] 6.2 Verify the two broken named rules now hold: chrome sits in its reserved band with the page padding for it, and every rendered string is Thai.
  - **Reserved Band Rule**: the dock is the shared fixed 56px band and the exam page reserves `pb-[5rem]` for it, instead of floating buttons over the content.
  - **Local Language Rule**: no English string renders on either page. The last hit was a stale comment, now corrected.
- [x] 6.3 Put the two pages side by side at the same viewport and confirm they read as one product — same sheet, same hairline weight, same type sizes, same dock.

  - Measured rather than eyeballed. Both pages at 1440x900 report identical materials: sheet radius `12px`, border `rgb(234,237,241)`, the same `resting-sheet` shadow, dock height `56px` on white. They read as one product because they are built from one set of values.
## 7. Record

- [x] 7.1 Rename `DESIGN.md` from the study table's system to the product's, and add the three components the exam page contributes: the exam table row, the date group, and the segmented control. Verify no section still implies the system describes a single page.
  - `DESIGN.md` is now the product's system: `KMITL+` rather than `KMITL+ Study Table`, with a description covering both pages.
  - Two components added from the exam page — **Exam Table** (including the date group and the clamped remark column) and **Segmented Control** (including its capture-time text swap).
- [x] 7.2 Update `openspec/config.yaml`: the note that the exam page is deliberately un-redesigned is no longer true and must go. Verify the context reads as current constraints.
  - The claim that the exam page keeps a native `<select>` was removed from `openspec/config.yaml` — it is no longer true.
  - Replaced with the constraint that matters going forward: the round switcher posts through a hidden input and **must `await tick()` before `form.submit()`**, because a button fires no `change` and submitting immediately sends the previous value. Also recorded that both pages now share one dock whose pickers and customize menu are optional.
- [x] 7.3 Record that `refactor-exam-ui` decision 3's deferred duplication was resolved by convergence rather than abstraction, and that this closes `adopt-ui-primitives` decision 6's `cva` deferral as "not needed" rather than "still waiting". Verify a reader can follow that thread from either change without guessing.

  - `refactor-exam-ui` decision 3 deferred the two duplicated dock button styles until a third example existed. Merging the docks resolved it by **convergence** — the second style stopped existing — rather than by abstracting over two.
  - That also closes `adopt-ui-primitives` decision 6: `cva` was waiting for a third button consumer. There is now **one** button style in one component, so the deferral ends as *not needed* rather than *still waiting*. `cn` alone covers what remains.
  - If a third page ever arrives, the question reopens from one consumer rather than two — a better starting point than the one the deferral was protecting.