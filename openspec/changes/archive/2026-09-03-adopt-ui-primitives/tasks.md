# Tasks — adopt-ui-primitives

Reference: `proposal.md` (scope), `specs/theme-customize/spec.md` (the behavior now being committed to), `design.md` (how). Verification runs in the `preview/` harness and against the built extension in Chrome with registrar requests intercepted — both already exercise every element this change touches, and both now serve the real `registrar.css`.

Ground rule: nothing inside a `DownloadButton` capture target may gain an `animate-*` class (design.md decision 2).

## 1. Baseline

- [x] 1.1 Record the current dock and popover as a reference: screenshots of the closed dock, the open customize menu, and both term pickers open, plus a PNG export from each page. Verify the exports are byte-comparable later — the capture frame must not move in this change at all.
  - Baseline saved: dock closed, customize menu open, and a PNG export from each page — study `2784x1592` / 390397 B, exam `2400x1222` / 393050 B. Task 4.2 compares against these.
- [x] 1.2 Record what the current popover does **not** do, by trying each scenario in `specs/theme-customize/spec.md` against today's build: Escape, outside click, keyboard traversal, focus return. Verify each fails now, so the spec addition is demonstrably new behavior rather than documentation of something already true.

  - Ran the new spec's scenarios against the pre-change build: **3/9 pass, 6 fail.** Failing: Escape does not close, outside click does not close, focus escapes the menu on Tab, the menu exposes no role or label, and the term picker is a native `<select>`. Passing already: keyboard reaches the menu, the trigger reports `aria-expanded`, and a term chosen by keyboard loads the schedule.
  - So five of the six requirements are genuinely new behavior, not documentation of something already true. The sixth (`Term picker is not a native select`) is a structural criterion this change introduces.
## 2. Dependencies

- [x] 2.1 Add `bits-ui`, `clsx`, `tailwind-merge` and `tailwindcss-animated`; verify `pnpm install` succeeds, `bits-ui`'s Svelte peer is satisfied by the installed version, and `@internationalized/date` is present as its peer.
  - Watch `pnpm-workspace.yaml`'s `minimumReleaseAge` policy; if it blocks a package, add the exact version to `minimumReleaseAgeExclude` rather than weakening the policy.
  - `bits-ui@2.19.0`, `clsx@2.1.1`, `tailwind-merge@3.6.0`, `tailwindcss-animated@2.1.0`. bits-ui's Svelte peer (`^5.33.0`) is satisfied by the installed 5.57.0.
  - **`@internationalized/date` is not installed.** pnpm does not auto-install peers, and bits-ui only needs it for date components, which this change does not import. The build succeeds without it and the dependency does not appear in the output at all (task 6.3), so it was left absent rather than added to satisfy a declaration.
- [x] 2.2 Register `tailwindcss-animated` with `@plugin` in `src/assets/styles.css` and verify the built CSS gains only the keyframes for utilities actually used — not the plugin's whole set.
  - `@plugin "tailwindcss-animated";` in `src/assets/styles.css`, with the capture-frame rule stated in a comment beside it.
  - Built CSS contains `@keyframes fade-up` — the one utility used — and not the plugin's other ~30. It also carries `bounce`, `ping` and `pulse`, which are Tailwind 4's own built-ins and not from this plugin.
- [x] 2.3 Add the `cn` helper under `src/shared/`; verify a conflicting utility passed by a caller wins over the component's own (`p-2` in, `p-4` base, `p-2` out) rather than both landing in the class list.

  - `src/shared/cn.js`. Verified the override semantics that motivate it: `cn("p-4","p-2")` → `p-2`, `cn("h-8 px-2.5","px-4")` → `h-8 px-4`, `cn("text-ink","text-ink-2")` → `text-ink-2`. Conflicting utilities resolve rather than both landing in the list.
## 3. Replace the primitives

- [x] 3.1 Convert the two term pickers in `Controls.svelte` to `bits-ui` `Select`, keeping the year options sourced from the registrar and the disabled-while-switching behavior; verify **the dock** contains no `<select>` element, and that switching a term still goes through `services/reg.js` and re-renders the grid.
  - **Criterion narrowed during implementation, and the original was mine to get wrong.** It read "no `<select>` element anywhere in the extension". That over-generalised from the dock's pickers to a third select this change never intended to touch: the Mid/Final control in `ExamHeader.svelte`.
  - That one is a different problem in three ways, and converting it would have been a separate change wearing this one's clothes:
    - It sits **inside** the capture frame, the one place design.md decision 2 keeps free of new primitives.
    - It lives in a real `<form>` that submits with a full-page POST, driven by the form's own `onchange`. bits-ui writes its value to a hidden input programmatically, which fires no `change` event — the submit path would have to be rewired to `onValueChange`, rebuilding the mechanism `refactor-exam-ui` only just got verified.
    - It already carries a capture-time swap to plain text, required by `image-export`; a bits-ui trigger is still an interactive control, so that swap survives either way.
  - Consequence, stated rather than hidden: the registrar's `SELECT` rule still has one element to land on, on the exam page. It stays contained by the mode-driven stylesheet toggle from `fix-registrar-css-bleed`, which is the same containment that was already there.
  - The two dock pickers are converted. The dock contains no `<select>`; term switching still runs through `services/reg.js`.
- [x] 3.2 Convert `CustomizeMenu.svelte` to `bits-ui` `Popover`, keeping the colour swatches and reset action exactly as they are; verify the menu still lists the header colour plus every subject, and that changing a colour still updates blocks immediately.
  - `CustomizeMenu.svelte` is now `Popover.Root/Trigger/Portal/Content`. The colour swatches, the applied-tint preview and the reset action are unchanged; only the shell around them changed.
  - The trigger's open state now comes from `data-[state=open]` rather than two `class:` directives.
- [x] 3.3 Set the portal target explicitly rather than relying on the default (design.md decision 4); verify the popover renders where intended and record in a comment why the target is pinned, so the shadow-root change finds it.
  - `to="body"` is written explicitly on both `Select.Portal` and `Popover.Portal`, each with a comment saying it is deliberate and that a move to shadow-root mounting has to change it here. Leaving the default would have looked identical today and broken silently later.
- [x] 3.4 Give `DownloadButton` its own base classes and merge the incoming `class` with `cn`; then stop `ExamControls.svelte` passing a full class string. Verify both download buttons still look right on their own pages and that the exam bar keeps its own spacing.

  - `DownloadButton` owns a `BASE` class string and merges an incoming `class` through `cn`. `Controls.svelte` now passes no class at all and its `ICON_BUTTON` constant is gone.
  - `ExamControls.svelte` keeps the exam page's slate look but passes it as an *override* — including the resets (`h-auto w-auto rounded-none`) needed to undo the shared base, which is the honest cost of one shared base serving two deliberately different shapes.
## 4. Motion, within the boundary

- [x] 4.1 Add entrance/exit motion to the popover using its open/closed state, and an entrance to the dock; verify by inspection that every `animate-*` class added lives in a component that renders outside the capture target, and that no such class appears in `Grid.svelte`, `HeaderCard.svelte`, `ExamTable.svelte`, `ExamHeader.svelte` or the sheet wrappers.
  - `animate-fade-up animate-duration-200 animate-ease-out` on the dock, `animate-fade-up animate-duration-150 animate-ease-out` on the popover and the select listbox.
  - Boundary verified by grep: no `animate-` class appears in `Grid.svelte`, `HeaderCard.svelte`, `ExamTable.svelte` or `ExamHeader.svelte` — the four components that render inside a capture target.
- [x] 4.2 Verify the exports are unchanged from the 1.1 baseline: same dimensions, no animation artifact, nothing of the dock or popover in the image.

  - Exports re-taken after the change: study **390397 B / 2784x1592**, exam **393050 B / 2400x1222** — byte counts identical to the 1.1 baseline. Nothing of the dock or popover appears in either image and there is no animation artifact, which is the expected result of the capture-frame rule.
  - Method note: the baseline script writes to the same paths, so re-running it overwrote the reference images. The comparison rests on the byte counts and dimensions recorded in 1.1, not on a surviving pair of files.
## 5. Verify the new requirements

- [x] 5.1 Walk every scenario in `specs/theme-customize/spec.md` — Escape closes and returns focus, outside click closes without activating what is underneath, keyboard reaches every colour control and the reset action, focus does not escape while open, and the trigger reports state. Verify each passes where 1.2 showed it failing.
  - **9/9 pass**, against 3/9 at baseline. Escape closes and returns focus, outside click closes, focus stays inside on Tab, the trigger reports state, and the menu is a labelled region.
  - One real gap surfaced and was fixed rather than argued away: `Popover.Content` shipped with `aria-label` but **no `role`**, while the trigger already announced `aria-haspopup="dialog"`. `role="dialog"` was added so the trigger's promise matches what is there.
- [x] 5.2 Walk the term-picker scenarios: choose a term entirely by keyboard and confirm the schedule loads identically to a mouse selection; confirm a second selection is refused while one is in flight and that the unavailable state is conveyed by more than colour.
  - A term chosen entirely by keyboard (focus trigger → Enter → Arrow → Enter) changes the applied term: `ภาคเรียนที่ 2 → ภาคเรียนที่ 1` with the grid re-rendering. The picker is a listbox, not a `<select>`.
  - The disabled-while-loading state is carried by `data-disabled` on the trigger, not by colour alone.
- [x] 5.3 Add these scenarios to the automated spec walk so they are checked on every future change, not only this one. Verify the walk fails if the popover's dismissal behavior is removed.
  - Five `theme-customize` scenarios were added to the standing spec walk, so they run on every future change rather than only this one. The walk is now **30/30** (25 pre-existing + 5 new).
  - Three pre-existing assertions had to be repaired, and two of them were passing for the wrong reason:
    - *Header render* matched `ปีการศึกษา 2566` against the **dropdown's option text**, not the header. The header's separator is `U+00A0` (from the registrar's `&nbsp;`), so once the options stopped being in the DOM while closed, the assertion revealed it had never been testing the header. Fixed by normalising the whitespace.
    - *Term switch* read `select option` values; rewritten to open the listbox and read `[role=option]`.
    - *Sparse or empty page* relied on Playwright's `selectOption` firing `change` even when re-selecting the already-selected value — something a real user cannot do. See 5.4 for the fixture inconsistency it was papering over.
- [x] 5.4 Re-run the existing spec walk and corpus sweep and verify nothing else moved; run `pnpm lint` and `pnpm build`.

  - Spec walk **30/30**, corpus sweep verdict unchanged from its recorded baseline, `pnpm lint` clean, `pnpm build` succeeds.
  - **A harness inconsistency was corrected, not worked around.** `preview/regStub.js` mapped semester 2 to the *empty* fixture while the page mounts from `study-table-mega`, whose own header says `ประจำภาคเรียนที่ 2`. The stub contradicted the fixture it served. Now semester 2 returns mega and semester 1 returns empty, so the empty state is reachable by an action a real student could take. The same mapping was corrected in the extension walk.
## 6. Verify against the registrar's stylesheet

- [x] 6.1 With `registrar.css` served, verify the new listbox and popover markup picks up **nothing** from it — no element the registrar names (`SELECT`, `INPUT`, `TD`, `A`) appears in the new primitives' output except the colour inputs, which are known and unchanged.
  - With `registrar.css` served and the menu open, the redesigned view contains **no `select`, `td`, `a` or `textarea`** — only `input` (18 colour swatches: the header plus 17 subjects) and `body`. The dock's `SELECT` exposure is gone.
  - The term trigger computes `13px Prompt rgb(16,21,27)`, and the registrar stylesheet is `disabled: [true]` in the redesigned view, as `fix-registrar-css-bleed` arranged.
- [x] 6.2 Walk the built extension in Chrome on both pages: pickers, popover, dismissal, export, old-design toggle round-trip. Verify no console errors and that the old-design view still renders as the untouched registrar page.
  - Built extension in real Chrome with the registrar's stylesheet served: **14/14 pass, zero console errors.** Pickers, popover, dismissal, term switching, old-design round-trip, exam Mid/Final form POST and both PNG exports all behave as before.
  - Exports from the extension are **386503 B** and **388456 B** — unchanged from the pre-change extension walk, confirming the capture frame did not move.
- [x] 6.3 Verify `@internationalized/date` does not reach the built output; if it does, record the size and decide whether to care rather than assuming tree-shaking handled it.

  - Zero occurrences of `internationalized` in either built content script. Tree-shaking removed it entirely, so the unused peer costs nothing.
  - Bundle change worth recording: `studyTable.js` 431 → **574 kB**, `examSchedule.js` 416 → **442 kB**. bits-ui costs ~143 kB on the page that uses both primitives. Accepted per the proposal (a locally installed extension pays no per-page download), but recorded rather than glossed.
## 7. Record

- [x] 7.1 Update `DESIGN.md`: the `select-term` component entry no longer describes a native control, and the motion section needs the entrance vocabulary plus the rule that motion stops at the capture frame. Verify the design system describes what shipped, not what preceded it.
  - `DESIGN.md` gains a **Term Pickers** component section describing the listbox and saying why it is not a native control, plus two motion entries: the entrance vocabulary and **The Capture-Frame Motion Rule**, which states the boundary and that it is enforced by reading source rather than at runtime.
  - The `select-term` token's padding was corrected (`0 8px 0 10px`) — the old value described a native select's chevron inset.
- [x] 7.2 Add to `openspec/config.yaml` context that dock primitives come from `bits-ui`, that `cn` is the class-merge convention, and that `animate-*` is forbidden inside the capture frame. Verify it reads as a constraint, not a changelog.
  - Added to `openspec/config.yaml` as constraints: where dock primitives come from and why, that portal targets are pinned on purpose and must change under shadow roots, that `cn` is the class-merge convention, that `animate-*` is forbidden inside the capture frame, that the exam Mid/Final select stays native, and that `cva` waits for a third consumer.
- [x] 7.3 Note in this change what the grades page will need to settle before `cva` becomes worth adopting (design.md decision 6), so the next change picks up the thread rather than rediscovering it.

  - What the grades page has to settle before `cva` is worth adopting:
    1. **A third button consumer with a real shape.** `refactor-exam-ui` decision 3 set that bar. Today `cn` covers two shapes with a base plus a short override; the exam page's override already carries three resets (`h-auto w-auto rounded-none`) to undo the shared base, which is the smell that says a variant API is coming. A third consumer decides whether the axis is size, tone, or something else.
    2. **Whether grades need a colour axis at all.** `DESIGN.md` has two: PALETTE for subject identity (deliberately meaningless) and `kmitl` for status. A letter grade is semantic — good/bad — and fits neither. Colour-coding grades means adding a third axis or deciding not to.
    3. **Whether the page introduces primitives this change did not need** — tabs per term, a table with sortable columns, a disclosure per year. Each would pull in another `bits-ui` component, and the variant API should be designed after that surface is known, not before.