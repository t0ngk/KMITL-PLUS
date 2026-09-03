# Design — adopt-ui-primitives

## Context

See proposal.md for motivation and specs/theme-customize for the behavior being committed to. Current state that shapes the approach:

- The interactive surface is small and fully enumerable: two `<select>`, four `<button>`, one hand-rolled popover, and ~10 `<input type="color">` inside it. Total Svelte across the project is 809 lines.
- `registrar.css` is unlayered and names `BODY`, `TD`, `SELECT`, `INPUT`, `TEXTAREA`, `A`. Unlayered declarations beat anything in `@layer utilities`, so no Tailwind class can out-rank them. `fix-registrar-css-bleed` handles this by disabling the stylesheet while the redesigned view is shown and re-enabling it for the old-design view.
- The PNG export is half the product. `DownloadButton` captures the subtree bound in each page component; the dock is deliberately outside that subtree. `DESIGN.md` carries a Capture-Safe Rule banning `blur`, `backdrop-filter` and `filter` inside the frame.
- `refactor-study-grid-css-grid` removed a global `* { transition-all }` on the grounds that "layout properties animating during term switches is jank waiting to happen". The design system's motion vocabulary is two entries: a 150ms colour transition and an opacity dim during term loading.
- `refactor-exam-ui` design decision 3 left the two dock button styles duplicated on purpose, to be resolved when a third example exists.
- `preview/` mounts the real components from fixtures and now serves `registrar.css` too; the built extension can be driven in Chrome with registrar requests intercepted. Both already exercise every element this change touches.

## Goals / Non-Goals

**Goals:**

- Remove `<select>` from **the dock** so the registrar has one fewer element to name there.
  - Narrowed during implementation: the exam page's Mid/Final control stays a native `<select>`. It is inside the capture frame, it drives a real form POST through the form's own `onchange`, and it already swaps to plain text during capture. Converting it is a separate change, not a detail of this one. See tasks.md 3.1.
- Give the customize menu the dismissal, focus and ARIA behavior the new spec requires, without hand-writing it.
- Let a component own its classes and still accept an override.
- Establish entrance motion with a boundary that can be checked by reading the code.

**Non-Goals:**

- No `cva`; no grades page; no shadow root; no visual redesign of the grid, the tables, or the header.
- No change to scraping, term fetching, export, or the old-design toggle.
- Not eliminating `<input type="color">`. There is no primitive for the OS colour picker, and writing one would mean owning a colour picker.

## Decisions

### 1. `bits-ui` earns its place on exposure and behavior, not on looks

Two primitives only: `Select` for the term pickers, `Popover` for the customize menu.

```
   native <select>   -->  registrar.css can write SELECT {}      -->  always hit
   bits-ui Select    -->  div + role=listbox + option children   -->  no element to name
```

- The styling argument alone would not justify a dependency — the current selects look correct once the registrar stylesheet is disabled. The argument is that the containment in `fix-registrar-css-bleed` is a runtime toggle we have to keep getting right, and it gets harder under shadow roots. Removing the element removes the class of problem.
- The behavior argument stands on its own: the spec now requires Escape, outside-click, focus return and keyboard traversal. Hand-writing focus management is a known source of subtle bugs, and this project has no test framework to catch a regression in it.
- Alternative (hand-roll the dismissal behavior, keep native elements): plausible for one popover, but it leaves the `SELECT` exposure and puts focus-trap code in a codebase with no automated tests. Rejected.
- Alternative (`melt-ui` or headless alternatives): not evaluated in depth. `bits-ui` is the one named in the request and it supports Svelte 5 directly; revisit only if it turns out to fight the capture boundary.

### 2. Motion is allowed only outside the capture frame

`tailwindcss-animated` is added via `@plugin`, and its utilities may appear only on elements that are never inside a `DownloadButton` capture target — in practice the dock and the popover.

```
   inside capture frame        outside capture frame
   ---------------------       ---------------------
   the sheet, header,          the docked toolbar,
   grid, subject blocks,       the customize popover
   exam table
        |                              |
   no animation                  animation allowed
```

- Why the boundary rather than a "wait for animations before capture" step: snapdom reads computed style at a moment, so an element mid-fade is captured mid-fade. A settle step is possible (`getAnimations()` exposes CSS animations and `DownloadButton` already has an `onCaptureStart` hook), but it adds an invariant that has to hold forever for a benefit — animating the grid — that nobody has asked for.
- The boundary is checkable by reading a file: if an `animate-*` class appears inside a component that renders within a capture target, it is wrong. No runtime enforcement needed.
- Verified against the project's Tailwind (4.3.3) before proposing: the plugin's utilities generate, and only the keyframes actually used are emitted.
- Rejected `motion` (motion.dev): the package peers on `react`/`react-dom` and has no first-party Svelte layer; the Svelte wrappers on npm are unmaintained ports of an earlier generation. Its usable surface here would be imperative `animate()`, which is strictly more machinery than CSS for the same result and would need teaching about the capture protocol.

### 3. `cn` is adopted for override semantics, not for conditional classes

Svelte's `class:` directive already handles conditionals, so `clsx` alone would add little. The value is `tailwind-merge`: a component can declare its own base classes and let a caller's `class` prop win on conflicting utilities.

- Concrete first consumer: `DownloadButton` currently does `class={className}`, replacing its own styling entirely, which is why `ExamControls` passes the whole button string. After `cn`, the button owns its shape and the caller overrides only what differs.
- This is also what makes `cva` unnecessary for now: with `cn` in place, two near-identical button styles can share a base and differ by a short override, which is enough until a third consumer proves what the variants really are.

### 4. Portal target must be decided now, not discovered later

`bits-ui` portals its floating content to `document.body` by default.

- Today that is correct and harmless: the popover is chrome, it must not be inside the capture subtree, and `document.body` is where the extension mounts.
- It becomes wrong the moment the app moves into a shadow root — a portal to `document.body` would escape the shadow tree and lose every style. The shadow-root change is deferred but real (its spike is in `preview/spike-shadow.js`), so the portal target is set explicitly rather than left at its default, and the reason is recorded here so the later change knows to look.

### 5. `@internationalized/date` arrives whether or not it is used

`bits-ui` declares it as a peer dependency for its date components.

- Accepted rather than worked around. The extension is installed locally, so bundle weight costs nothing per page view, and tree-shaking should drop it entirely since no date component is imported. Worth a check against the built output rather than an assumption.

### 6. `cva` waits for the grades page

Not adopted. `refactor-exam-ui` decision 3 set the condition — three consumers — and the third is the grades page, which does not exist and whose data shape is unknown.

- Adopting a variant API against two consumers means inventing variant names for a system whose third member has not been seen. That is exactly the guess decision 3 was written to avoid.

## Risks / Trade-offs

- [The listbox behaves differently from a native select in ways students notice — no OS-level dropdown, different scroll behavior on long lists] → The year list is at most a handful of entries and the semester list is two or three, so the long-list case does not arise here. Compare side by side in the harness before committing.
- [`bits-ui`'s popover positions with a floating-element engine and may render outside the dock's bounds or over the sheet] → The dock is a fixed 56px band and the popover opens upward today; verify it still clears the sheet and does not overlap the capture target, since anything overlapping is a visual regression even though it is not captured.
- [Animation classes leak into the capture frame later] → Decision 2 makes the rule readable; add it to `DESIGN.md` so it is stated where designers look, not only in this change.
- [The registrar's `INPUT` rule still reaches the colour swatches] → Unchanged by this work and still handled by the existing toggle. Stated so nobody reads "adopted primitives" as "exposure eliminated".
- [Committing a11y behavior to the spec makes every future change carry that walk] → That is the point of choosing it, but it means the spec walk must actually gain those assertions rather than the requirement sitting unverified.

## Migration Plan

Single change, revertible. No manifest, build or data changes. The visible differences are the term pickers' dropdown, the popover's entrance, and its new dismissal behavior.
