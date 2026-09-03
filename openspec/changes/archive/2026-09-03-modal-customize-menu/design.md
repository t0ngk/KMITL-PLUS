# Design — modal-customize-menu

## Context

See proposal.md for why. What constrains the shape:

- `CustomizeMenu.svelte` is `Popover.Root` → `Popover.Trigger` → `Popover.Portal to="body"` → `Popover.Content` with `role="dialog"`, `aria-label="ปรับแต่งสี"`, `side="top"`, `align="end"`, `z-[60]`.
- The portal target is pinned to `document.body` deliberately: the popover is chrome and must fall outside the snapdom capture frame, which is the sheet element. A move to shadow-root mounting has to revisit that pin.
- The dock is `z-50`; the popover content is `z-[60]`.
- What `bits-ui` offers on the content — `interactOutsideBehavior`, `onInteractOutside`, `trapFocus`, `preventScroll` — was read from `node_modules/bits-ui/dist/bits/utilities/*/types.d.ts`. None of them affects whether the outside click reaches the page.
- Animations are forbidden inside the capture frame and allowed on the dock and popover. Anything added here is outside the frame.

## Goals / Non-Goals

**Goals:**

- An outside click closes the menu and does not activate anything beneath it.
- Everything else the menu does today keeps working, including the behaviours already covered by passing tests.

**Non-Goals:**

- No visual change. The layer is invisible; a dimmed backdrop would be a design decision nobody asked for and would read as a heavier modal than this is.
- No change to the term pickers.
- No change to what the menu contains or how colours are applied.

## Decisions

### 1. An invisible layer under the content, not a library setting

A `fixed inset-0` element is rendered inside the portal while the menu is open, at `z-[59]` — above the dock at `z-50`, below the content at `z-[60]`.

```
   z-[60]   Popover.Content     เมนู คลิกได้ตามปกติ
   z-[59]   ชั้นกันคลิก           กินคลิกที่เหลือทั้งหน้า
   z-50     dock                ปุ่มข้างล่างไม่ได้รับคลิกอีก
```

- Why not a library prop: there is none. The four `interactOutsideBehavior` values decide whether the popover closes; the click still lands. `onInteractOutside` can only cancel the close.
- Why not `stopPropagation` on a document-level `pointerdown` while open: it fights the same listener `bits-ui` uses to dismiss, and the ordering between them is an implementation detail of the library. A layer is ordinary CSS and needs no coordination.
- **The layer closes the menu itself.** The first attempt left that to `bits-ui` on the assumption that a click landing on the layer counts as an outside interaction. It does not: the layer lives inside `Popover.Portal`, so the library treats it as part of the popover and never fires the dismissal. Measured, not assumed — the menu stayed open. So the layer carries an `onclick` that sets the bound open state to false.
- Why not move the layer out of the portal to get the library's dismissal back: the portal is what puts it on `document.body`, away from the dock's stacking context. Trading a one-line handler for a stacking-order question that has to be re-answered every time the dock changes is a bad trade.

### 2. The layer is tied to the open state, not left mounted

`Popover.Root` gets `bind:open` and the layer is rendered under `{#if open}`.

- Relying on the portal to mount only while open would be relying on something not stated in the API. Binding the state says what is meant and is visible to the next reader.
- It also keeps the DOM clean while the menu is closed, which matters because the capture frame is chosen by element and a stray full-viewport element is exactly the sort of thing that turns up in an export later.

### 3. It is invisible and hidden from assistive technology

`aria-hidden="true"`, no background, no transition.

- It is not a scrim, it carries no meaning, and it announces nothing. Focus is already trapped in the content by `bits-ui`, so nothing needs the layer to be reachable.
- No animation: it is outside the capture frame so an animation would be permitted, but it would be a visible change to a fix that is supposed to have none.

## Risks / Trade-offs

- [The layer covers the trigger, so clicking the trigger to close now goes through the layer instead] → It still closes, in one click, which is what it did before. The trigger's own toggle is no longer what closes it; the outside-dismissal is. Same result for the student.
- [A full-viewport element appears in the PNG export] → It exists only while the menu is open, and the capture frame is the sheet, not the body. The `image-export` tests assert the frame's contents and stay green.
- [`z-[59]` collides with something added later] → The three layers are adjacent numbers with a stated order; anything new in that range has to pick a side deliberately.
- [Making the menu modal for the mouse diverges from the term pickers, which stay non-modal] → Deliberate. The menu is a dialog and says so; the pickers are listboxes. Treating them the same would mean picking one wrong.

## Migration Plan

One file, revertible. No dependency, manifest or build changes. The visible difference is that the first click outside the open menu is spent closing it.
