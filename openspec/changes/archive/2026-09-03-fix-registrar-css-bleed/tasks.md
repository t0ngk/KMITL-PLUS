# Tasks — fix-registrar-css-bleed

Reference: `proposal.md` (the two measured leaks), `design.md` (how). Verification runs in two places: the `preview/` harness with `registrar.css` loaded, and the built extension driven in real Chrome with registrar requests intercepted — the same method that found the bug.

## 1. Make the conflict reproducible

- [x] 1.1 Commit `preview/public/fixtures/registrar.css` (the public stylesheet, no personal data) and record where it was fetched from and when; verify it contains the `SELECT`, `TD`, `INPUT` and `A` element rules the proposal quotes, and that its stray leading `<STYLE …>` line is preserved rather than cleaned up — the browser's error recovery around it is part of what makes the real page behave as it does.
  - 2427 bytes fetched from `https://www.reg.kmitl.ac.th/css/registrar.css` on 2026-09-03 with no credentials; a public static asset. Provenance and the reason the stray first line must survive are in a comment at the top of the fixture.
  - That line matters: CSS error recovery consumes `<STYLE type=text/css>` *together with the following `BODY { … }` rule*, so the registrar's body font and colour never actually applied. `TD` is the first rule that survives — which is why the untouched page's tables are styled while its page background is not.
- [x] 1.2 Serve it from the preview harness so the mounted page sits under the same competing rules as the live page; verify that **before any fix**, the preview reproduces the measured defect — the term selects compute to 11px Microsoft Sans Serif — and that removing it restores 13px Prompt.
  - `preview/main.js` loads it by default; `?reg=off` turns it off, so both states are one URL apart.
  - Reproduced before any fix, matching the live measurement exactly: loaded → **11px / Microsoft Sans Serif / rgb(0,0,0)**; `?reg=off` → **13px / Prompt / rgb(16,21,27)**. Nothing else in the redesigned view moved, confirming only registrar-named elements are exposed.

## 2. Toggle instead of delete

- [x] 2.1 Add the shared module from design.md decisions 2 and 3: record the registrar's stylesheets while the original document is intact, and expose turning them off and on. Verify it identifies exactly the registrar `<link>` present at boot and never the extension's own stylesheet.
  - `src/shared/registrarStyles.js`. `captureRegistrarStyles()` records the registrar `<link>` elements while the document is still untouched; `setRegistrarStylesEnabled()` flips `link.disabled` on exactly those.
  - It cannot pick up the extension's own stylesheet even by accident: content-script CSS injected through the manifest never appears as a `<link>` in the document — the same fact `boot.js` already relies on for the font — so the query can only find the registrar's.
- [x] 2.2 Call it from `core/boot.js` so registrar styles are off before the component mounts; verify the redesigned view never renders with them active, including on first paint.
  - `boot()` captures before injecting the font, and disables registrar styles after a successful scrape and before clearing the body, so the redesigned view is never painted with them active.
- [x] 2.3 Remove the `prepare` callback from `src/entrypoints/examSchedule.content.js`, and remove the `prepare` hook from `boot()` if nothing else uses it; verify the exam page still boots and `grep` shows no remaining caller.
  - Both gone. With no callers left, the hook was removed from `boot()` rather than left as a dead parameter; `grep` finds no reference anywhere.
- [x] 2.4 Re-enable registrar styles while each page's old-design mode is active, from `StudyTable.svelte` and `ExamSchedule.svelte`; verify toggling back and forth flips the stylesheet each time and leaves it disabled when the redesigned view is showing.
  - `$effect(() => setRegistrarStylesEnabled(mode === "old"))` in `StudyTable.svelte`; the same on `!useNewDesign` in `ExamSchedule.svelte`.
  - Toggled repeatedly: `disabled` reads `[true]` in the redesigned view, `[false]` in the old-design view, `[true]` again on return. No flash, no sticking, no console errors.

## 3. Stop imposing Prompt on registrar markup

- [x] 3.1 Narrow the global `* { @apply font-prompt }` and the `font-prompt` in `.kmitl-table td` so neither reaches the old-design subtree; verify the redesigned views still render entirely in Prompt (nothing in them falls back) while the old-design subtree takes the registrar's `TD` font.
  - Went further than the task text, and the reason is worth recording: the whole `.kmitl-table td/th/tbody` block was **deleted**, not just its `font-prompt`. Those rules existed only because the exam page used to delete the registrar stylesheet outright; with the stylesheet restored in old mode they actively fight fidelity, forcing `text-center`, extra borders and `font-light` onto markup that already carries its own.
  - `* { @apply font-prompt }` stays for the redesigned views but is neutralised inside `.kmitl-table` by a class-level (0,1,0) rule — the global one is unlayered at specificity 0 and would otherwise reach the registrar's markup.

## 4. Verify both directions

- [x] 4.1 In the preview harness with `registrar.css` loaded, verify the redesigned study table computes 13px Prompt `rgb(16,21,27)` on both term selects, and that no other element in the redesigned view has picked up a Microsoft Sans Serif fallback.
  - Both selects: `13px Prompt rgb(16,21,27)`. Dock buttons and subject blocks unchanged in Prompt. The registrar stylesheet is present in the document but disabled, so nothing of it resolves.
- [x] 4.2 Verify the old-design view renders in the registrar's font on both pages, and check the **dock** specifically while old mode is active — registrar rules reach it too once re-enabled (design.md, Risks), so its buttons and selects must still look right.
  - **Fidelity measured against the untouched page rather than eyeballed.** The same fixture was loaded raw with `registrar.css` and no extension at all — that render *is* the original — and its computed styles compared cell by cell with the extension's old-design view: **174 `<td>` on both sides, and `font-size`, `font-family`, `font-weight`, `text-align`, `border-left-width` and `color` identical on every sampled cell.**
  - Exam page: new mode `14px Prompt` (its own classes), old mode `13px "Microsoft Sans Serif"`. Same behavior, no console errors.
  - The dock risk resolved itself and the reason is worth keeping: `registrar.css` declares `BODY / TD / SELECT / INPUT / TEXTAREA / A` and no `BUTTON`, and the dock's `<select>` elements only render in the *new* mode (they sit inside `{#if mode == "new"}` in `Controls.svelte`). So in old mode the dock exposes nothing the registrar names. Measured, not assumed.
- [x] 4.3 Walk the built extension in real Chrome with `registrar.css` served for real: study table renders correctly in new mode, `แบบเดิม` matches the untouched registrar page, toggling repeatedly does not flash or stick, and the exam page behaves the same. Verify no console errors.
  - **14/14 checks pass, zero console errors.** The intercepting layer now serves the real `registrar.css` where it previously answered `204`, so the extension runs under exactly the stylesheet the live page loads.
  - New mode: select `13px Prompt rgb(16,21,27)`, registrar stylesheet `disabled: [true]`. Old mode: `13px "Microsoft Sans Serif" 400 start`, `disabled: [false]`. Everything the earlier walk covered — term switching, customize menu, PNG export, exam mid/final form POST, icons — still passes.
- [x] 4.4 Run the full spec walk and the corpus sweep and verify nothing else moved; run `pnpm lint` and `pnpm build`.
  - Spec walk **25/25**. Corpus sweep verdict identical to the recorded baseline: `{"files":40,"threw":0,"mangled":0,…}`. `pnpm lint` clean, `pnpm build` succeeds.
- [x] 4.5 Export a PNG from both pages and verify the capture is unaffected — the export path reads the redesigned subtree, which should never see registrar styles at all.
  - Study 386 kB, exam 388 kB, both from the built extension with the registrar stylesheet served. Unchanged from the pre-fix exports, which is the expected result: capture only ever runs in the redesigned view, where the stylesheet is disabled.

## 5. Record

- [x] 5.1 Add to `openspec/config.yaml` context that the registrar's stylesheet is unlayered and full of bare element selectors, so it beats any Tailwind utility regardless of specificity, and that the fix is a mode-driven toggle rather than deletion; verify it reads as a constraint for future work, not a changelog entry.
  - Added as two standing rules: the unlayered-beats-layered fact with the toggle as the answer, and an explicit "never reintroduce styling for `.kmitl-table`" so the deleted block does not creep back. Also recorded that the fixture must stay byte-for-byte because its malformed first line is load-bearing.
- [x] 5.2 Note in `preview-harness-fixtures`' archived design.md — or here, if editing an archived change is the wrong move — that its recorded "registrar CSS is untestable offline" gap has been closed, and that the gap was concealing this defect. Verify a future reader can follow the trail from that gap to this change.
  - Annotated in place in the archived `preview-harness-fixtures` design.md, next to the risk it closes, rather than opened as a new note somewhere disconnected. Editing an archived change's *risk list* to mark a risk resolved is recording an outcome, not rewriting history — the task text, decisions and evidence are untouched.
  - The annotation says plainly that the accepted gap was where the defect lived. That is the transferable lesson, not the CSS detail.
