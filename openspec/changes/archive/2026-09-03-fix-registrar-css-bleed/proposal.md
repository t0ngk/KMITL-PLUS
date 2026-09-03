# fix-registrar-css-bleed

## Why

The extension and the registrar's own stylesheet share one document with no boundary between them, and they bleed into each other in **both directions**. Both leaks are visible on the live study table page today.

**Registrar CSS → our UI.** `https://www.reg.kmitl.ac.th/css/registrar.css` is a public, unlayered stylesheet full of bare element selectors:

```css
SELECT { FONT-SIZE: 11px; COLOR: #000000; FONT-FAMILY: Microsoft Sans Serif, Arial }
TD     { FONT-SIZE: 13px; COLOR: #000000; FONT-FAMILY: Microsoft Sans Serif, Arial }
INPUT  { ... }   A { ... }   A:hover { ... }
```

Tailwind 4 emits its utilities inside `@layer utilities`, and **an unlayered declaration beats any layered one regardless of specificity**. So `SELECT` wins over `.text-[13px] .text-ink font-medium`, and the two term selects in the dock have been rendering at 11px in Microsoft Sans Serif with pure-black text instead of 13px Prompt in `ink`. Measured on the live page and reproduced locally:

| | reg CSS active | reg CSS removed |
|---|---|---|
| `font-size` | 11px | 13px |
| `font-family` | Microsoft Sans Serif, Arial | Prompt |
| `color` | `rgb(0,0,0)` | `rgb(16,21,27)` |

Nothing else in the new design is hit, because `.group > div` and friends are class-only — only elements the registrar names directly (`select`, `input`, `a`, `td`) are exposed.

**Our CSS → the registrar's markup.** `styles.css` declares `* { @apply font-prompt }` at top level (unlayered) and `.kmitl-table td { … font-prompt … }` explicitly. Both override the registrar's `TD` rule inside the old-design view, so pressing **แบบเดิม** shows the original page in Prompt rather than the font it actually ships with. The project owner confirmed from the live page that this font substitution is the *only* remaining difference between the old-design view and the untouched registrar page.

The exam entrypoint has been papering over the first leak since it was written — its `prepare` callback deletes the registrar's `<link>` outright — which fixes the bleed but permanently degrades its own old-design view. The study entrypoint never did this, so it has the bleed and a faithful old-design view. Neither page is right.

## What Changes

- Add a shared helper that **toggles** the registrar's stylesheets rather than deleting them, and drive it from the view mode: disabled while the redesigned view is shown, enabled while the old-design view is shown. Both pages get the same treatment.
- Remove the exam entrypoint's `prepare` callback; deleting the stylesheet stops being how this is handled. If `prepare` then has no callers, remove it from `boot()` too rather than leaving a dead hook.
- Stop forcing Prompt inside the old-design subtree so the registrar's own `TD` rule applies there, making **แบบเดิม** render as the untouched page.
- Commit `registrar.css` as a fixture and serve it in the preview harness, so this entire class of conflict becomes reproducible offline. It is a public static asset with no personal data.
- **BREAKING (visual, intended):** the old-design view on both pages will render in the registrar's font instead of Prompt. That is the point.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `study-table-render` and `exam-schedule-render` both already require that the old-design toggle show "the original page HTML captured at load time" — this makes that truer, it does not change what is required. No requirement text moves, so this change sets `skip_specs: true`.

## Impact

- `src/shared/` — new module owning registrar-stylesheet state.
- `src/core/boot.js` — disables registrar styles before mounting; `prepare` removed if it becomes unused.
- `src/entrypoints/examSchedule.content.js` — drops its `prepare` callback.
- `src/features/study-table/StudyTable.svelte`, `src/features/exam-schedule/ExamSchedule.svelte` — re-enable registrar styles while their old-design mode is active.
- `src/assets/styles.css` — the global `*` font rule and `.kmitl-table td` stop imposing Prompt on registrar markup.
- `preview/public/fixtures/registrar.css` — new, committed. `preview/` harness loads it so the old-design view can be inspected the way it really renders.
- Closes the gap `preview-harness-fixtures` design.md recorded as untestable offline ("the registrar's CSS fighting our layout"). That gap was not theoretical — it was hiding this bug.
- Out of scope: the shadow-root overlay, which would make this class of conflict structurally impossible. Its spike is recorded in `preview/spike-shadow.js`; this change is the cheap fix that works within the current architecture.
