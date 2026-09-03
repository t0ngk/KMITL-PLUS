# Design — fix-registrar-css-bleed

## Context

See proposal.md for the measurements. Current state that shapes the approach:

- `core/boot.js` captures the page HTML, injects the font, scrapes, clears `document.body`, and mounts. It never touches `<head>`, so the registrar's `<link href="../css/registrar.css">` survives the whole time.
- `entrypoints/examSchedule.content.js` passes a `prepare` callback that deletes that link. `studyTable.content.js` does not. `prepare` has no other caller.
- Both feature components hold their own view-mode state — `mode` (`"new"` / `"old"`) in `StudyTable.svelte`, `useNewDesign` in `ExamSchedule.svelte` — and render the captured HTML through `{@html …}` inside a `.kmitl-table` wrapper when in old mode.
- `styles.css` forces Prompt twice: `* { @apply font-prompt }` at top level, and `.kmitl-table td { … font-prompt … }`. Both are unlayered, so both beat the registrar's `TD` rule on specificity.
- `registrar.css` opens with a literal `<STYLE type=text/css>` line. CSS error recovery swallows the following `BODY { … }` rule along with it, which is why the page background and body font were never the registrar's to begin with — the first rule that actually applies is `TD`.

## Goals / Non-Goals

**Goals:**

- The redesigned view renders with no registrar declaration reaching it.
- The old-design view renders as the untouched registrar page, font included.
- One mechanism covers both pages; the exam page stops being a special case.
- The conflict becomes reproducible in `preview/` so it cannot silently return.

**Non-Goals:**

- No shadow root. That is the structural answer and it is a separate, larger change (spike in `preview/spike-shadow.js`).
- No visual change to the redesigned views beyond the selects reverting to their intended type.
- No change to scraping, export, or term switching.

## Decisions

### 1. Disable the stylesheet, do not delete it

`link.disabled = true` instead of `link.remove()`.

- Why: deletion is one-way. The old-design view needs the registrar's rules back, and re-fetching a deleted stylesheet means a second network round trip and a flash of unstyled legacy markup. `disabled` is reversible, synchronous, and keeps the browser's parsed stylesheet in memory.
- The exam page's `prepare` callback exists only because deletion was the tool reached for first. With a reversible toggle it has nothing left to do.

### 2. Mode drives the toggle, and the toggle lives in `shared/`

A small module exposing "turn registrar styles off / on", called from `boot()` before mount (off) and from an effect on each component's mode (`on` when old, `off` when new).

```
   boot()                     -> registrar styles OFF, then mount
   mode = "old"  (แบบเดิม)     -> ON   : legacy markup renders as the real page
   mode = "new"  (แบบใหม่)     -> OFF  : nothing of the registrar's reaches our UI
```

- Why `shared/` and not each entrypoint: both pages need identical behavior, and the rule for *which* stylesheets count as the registrar's (same-origin `<link>` elements that were in the document at boot) should be stated once.
- Why an effect rather than a callback threaded through props: the components already own the mode; adding a prop chain from the entrypoint down to the toggle would be more plumbing than the behavior deserves.
- Alternative (leave registrar styles on and out-specify them): fails by construction. Their declarations are unlayered and ours are in `@layer utilities`; layer beats specificity, so no class selector can win. Only `!important` or unlayering our whole utility set would, and both are worse.

### 3. Capture the stylesheet list at boot, not at toggle time

The module records which stylesheets belong to the registrar once, while the original page is still intact, and toggles exactly those afterwards.

- Why: after `boot()` clears the body and mounts, the extension's own stylesheet is also in the document. A "disable everything that is not ours" rule evaluated later would be guessing. Recording the set before we add anything makes the boundary factual.

### 4. Prompt stops being imposed on registrar markup

The global `* { @apply font-prompt }` and the `font-prompt` inside `.kmitl-table td` stop reaching the old-design subtree, so the registrar's `TD` rule wins there.

- Why not simply delete the global `*` rule: the redesigned views rely on it for elements that carry no explicit font class. Narrowing it is the change; removing it is a different one.
- The `.kmitl-table` rules keep their structural declarations (`text-center`, borders) — those exist because the *exam* page's legacy markup lost the registrar's `TD` styling when `prepare` deleted the stylesheet. Once the stylesheet is restored in old mode they are largely redundant, but they stay: they are also what the exam page's *new* table uses, and pulling them apart is out of scope here.

## Risks / Trade-offs

- [Toggling in an effect flashes the wrong styles for a frame when switching modes] → The toggle is synchronous and runs in the same task as the mode flip; verify by switching modes repeatedly and watching for a flash.
- [`disabled` on a `<link>` behaves differently across the two pages because the exam page previously deleted the element] → Removing `prepare` means both pages now reach the toggle with the element present; verified on both.
- [Restoring registrar CSS in old mode brings back something worse than a wrong font — e.g. its `A:hover` or `.gray` rules interfering with the dock] → The dock is outside the `{@html}` subtree but inside the same document, so registrar rules can still reach it while old mode is active. Check the dock's appearance in old mode specifically, not just the table.
- [The committed `registrar.css` drifts from what the registrar actually serves] → It is a fixture, dated like the others; the live walk remains the authority. Recorded rather than pinned.
- [Removing `prepare` from `boot()` narrows a hook someone may want later] → It has one caller and that caller is being changed. Re-adding a hook is cheaper than carrying a dead one.

## Migration Plan

Single change, revertible. No data, no manifest, no build change. The visible effect is the old-design view's font on both pages and the dock selects' type on both pages.
