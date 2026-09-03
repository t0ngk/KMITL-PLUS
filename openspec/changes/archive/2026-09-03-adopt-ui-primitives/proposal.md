# adopt-ui-primitives

## Why

The dock's interactive elements are the two places the extension is still exposed and still hand-rolled.

**They are the exact elements the registrar names.** `registrar.css` is unlayered and styles `SELECT`, `INPUT`, `TD` and `A` by element. `fix-registrar-css-bleed` neutralised that by toggling the stylesheet per view mode, and that fix holds — but it is a *containment*, and it only holds because we control when the registrar's stylesheet is enabled. The extension currently offers three `<select>` and roughly ten `<input type="color">` for those rules to land on. Replacing them with div-based primitives removes the exposure rather than managing it, and it removes it for good — including under the shadow-root architecture that is still on the table, where the containment story changes again.

**The customize popover has no dismissal or focus behavior at all.** Reading `CustomizeMenu.svelte`: no Escape handler, no click-outside, no focus trap, no focus return, no `role`, no `aria-controls`. It has one `aria-expanded` and nothing else. A student who opens it with the keyboard is stuck in it.

Alongside that, two smaller frictions: `DownloadButton` takes a `class` prop and *replaces* its own classes with it, which is why `ExamControls` has to pass the entire button string rather than an override; and the project has no vocabulary for entrance motion, so the popover and dock appear instantly with nothing to soften them.

## What Changes

- Adopt **`bits-ui`** for the two primitives that need real behavior: `Select` for the dock's term pickers, `Popover` for the customize menu. The exam page's Mid/Final `<select>` is deliberately left alone — it is inside the capture frame and drives a real form POST (see design.md Goals). Both render as `div`-based, ARIA-correct widgets with keyboard navigation, dismissal and focus management.
- Adopt **`cn`** (`clsx` + `tailwind-merge`) so a component can own its base classes and still accept an override that wins on conflicts. First consumer: `DownloadButton`.
- Adopt **`tailwindcss-animated`** via `@plugin` for entrance/exit motion, **restricted to elements outside the snapdom capture frame** — the popover and the dock. Verified working against the project's exact Tailwind (4.3.3); it is a CSS plugin with no JS runtime and it emits only the keyframes actually used.
- Capture the dismissal and focus behavior as **requirements** in `theme-customize`, so what bits-ui gives us for free cannot silently disappear later.
- **Not adopting `cva`.** `refactor-exam-ui` design decision 3 deliberately left the two dock button styles duplicated and said the shared abstraction should wait for a third example. That third example is the grades page, which does not exist yet. Adopting a variant API now means designing it against two consumers and guessing at the third.
- **Not adopting `motion`** (motion.dev). It has no first-party Svelte layer — the `motion` package peers on `react`/`react-dom`, and the Svelte wrappers in the registry are unmaintained ports. The only usable surface would be its imperative `animate()`, which buys nothing over CSS here while adding a runtime that would have to be taught about the capture protocol.
- Out of scope: the grades page, the shadow-root overlay, any visual redesign of the grid or the tables, and `cva`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `theme-customize`: adds a requirement that the customize menu is dismissible by Escape and by clicking outside, and that focus returns to its trigger. This is behavior the current implementation does not have; it is being added, so it belongs in the spec rather than being left as an undocumented side effect of the library choice.

`study-table-navigation` is deliberately **not** modified: the term pickers change from a native `<select>` to a listbox, but the requirement — that the student can switch year and semester, with the year options coming from the registrar — is unchanged.

## Impact

- `package.json` — adds `bits-ui`, `clsx`, `tailwind-merge`, `tailwindcss-animated`. Note `bits-ui` peers on `@internationalized/date`, which arrives even though no date component is used.
- `src/features/study-table/Controls.svelte` — the two `<select>` become `bits-ui` `Select`; the `SELECT` class constant goes away.
- `src/features/study-table/CustomizeMenu.svelte` — the hand-rolled `{#if open}` + absolute div becomes `bits-ui` `Popover`.
- `src/shared/DownloadButton.svelte` — owns its base classes, merges an incoming `class` via `cn`.
- `src/features/exam-schedule/ExamControls.svelte` — stops passing a full class string.
- `src/shared/` — new `cn` helper.
- `src/assets/styles.css` — `@plugin "tailwindcss-animated"`.
- `openspec/specs/theme-customize/spec.md` — gains the dismissal requirement on archive.
- `DESIGN.md` — the `select-term` component entry and the motion vocabulary both need updating; the design system currently documents two motion tokens and no entrance animation.
- The `preview/` harness and the built-extension walk both already exercise these elements, so verification has somewhere to run. The registrar stylesheet is now a committed fixture, which means the "does reg's CSS still reach us" question is testable for the new markup too.
- `<input type="color">` inside the popover is **kept**: it is the OS color picker and there is no primitive that replaces it. The `INPUT` exposure therefore shrinks but does not reach zero, and the toggle from `fix-registrar-css-bleed` remains load-bearing.
