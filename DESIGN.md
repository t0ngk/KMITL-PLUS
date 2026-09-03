---
name: KMITL+
description: One calm white sheet for both registrar pages — a fixed 08:00-20:00 week grid and a date-grouped exam list — where every colored surface is solved for contrast rather than picked.
colors:
  kmitl: "#e35205"
  kmitl-soft: "#fdf0e9"
  ink: "#10151b"
  ink-2: "#4a5560"
  ink-3: "#5f6b78"
  line: "#eaedf1"
  line-strong: "#d7dce3"
  canvas: "#f6f7f9"
  hover: "#f2f4f7"
  surface: "#ffffff"
typography:
  title:
    fontFamily: "Prompt, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "Prompt, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "Prompt, sans-serif"
    fontSize: "11px"
    fontWeight: 300
    lineHeight: 1.25
  label:
    fontFamily: "Prompt, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0.08em"
  pill:
    fontFamily: "Prompt, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  "0.5": "2px"
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "2.5": "10px"
  "3": "12px"
  "5": "20px"
  "6": "24px"
  "20": "80px"
components:
  block-subject:
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  header-card:
    typography: "{typography.title}"
    padding: "12px 24px"
  term-pill:
    typography: "{typography.pill}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  toolbar-dock:
    backgroundColor: "{colors.surface}"
    height: "56px"
    width: "100%"
    padding: "0 24px"
  toolbar-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  toolbar-button-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
  toolbar-icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    height: "32px"
    width: "32px"
  select-term:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "0 8px 0 10px"
    height: "32px"
---

# Design System: KMITL+

## Overview

**Creative North Star: "The Exported Week"**

This is a modern calendar played straight. A white sheet floats on a faintly cool canvas, ruled by a single family of hairlines, and everything on it is answerable to one question: does it survive being turned into a PNG and recompressed by a chat app? That constraint is not a footnote, it is the design. No blur, no backdrop-filter, no filter appears anywhere inside the capture frame; fonts are bundled and injected inline so the raster carries real Prompt glyphs; every color that reaches the screen is a resolved hex, never a `color-mix()` the rasterizer would have to interpret.

Density is calendar density, not dashboard density. The week grid runs a fixed 08:00-20:00 across seven day rows at full width. Both axes are constants so every term reads at the same position and two exported PNGs can be laid side by side; an empty Sunday row is the frame telling the truth about the week, not wasted space. Ruling is hour boundaries only: quarter-hour columns still position blocks to the minute, but they are never drawn, because nobody reads a class schedule at fifteen-minute resolution. Subject blocks are soft tinted grounds with same-hue ink and no edge treatment at all.

The institutional orange (`kmitl`) is a status color and behaves like one. It draws focus rings, the selection highlight, and error text. Identity enters at exactly one place: the term pill in the header, tinted in the chosen color with that hue's ink on it. The header itself is white — it is context, not a headline, and it must not outweigh the schedule underneath it. Chrome gets its own reserved band at the bottom of the viewport and never sits on top of the schedule.

**Key Characteristics:**
- White grid under a white, single-row header; one hairline weight rules the grid
- Fixed 08:00-20:00 time axis over all seven day rows; the frame never resizes to the data
- Subject identity carried by derived tint + same-hue ink, assigned deterministically per subject
- Every colored surface is solved for contrast per hue; no raw picked color is ever painted
- Type ramp of exactly two sizes (11 / 13px) and three weights (300 / 400 / 500)
- Orange reserved for status; user color confined to the term pill and the subject blocks
- Chrome docked in its own full-width band; the page pads for it rather than being covered
- Nothing inside the capture frame may use blur, backdrop-filter, or filter

## Colors

A near-monochrome grid of three inks and two hairlines, entered by per-subject and per-user color only as solved outputs of one function.

### Primary
- **KMITL Orange** (`kmitl`): The single system color and the institutional mark. In the shipped build it appears only as `:focus-visible` outlines (2px, 2px offset), the selection wash, and the error message in the dock's status slot. It is a status signal, not a brand wash. It is also the *default* value of the user-controlled header color, but in that role it is user-owned, replaceable, and never painted raw.
- **KMITL Wash** (`kmitl-soft`): The `::selection` background across the whole surface, so even browser-drawn UI belongs to this system.

### Neutral
- **Deep Ink** (`ink`): Primary text on white — the header's identity line, menu row labels, term selects, selection foreground — and the base of every shadow's rgba. Text sitting on a tint is *not* this ink; it is that tint's own solved ink.
- **Mid Ink** (`ink-2`): Toolbar button labels, the empty-state first line, and secondary body text on white.
- **Quiet Ink** (`ink-3`): Hour labels on the time axis, day labels, the header's context line, uppercase section labels, the dock's loading message, disabled select text, and the empty-state second line.
- **Hairline** (`line`): Hour column rules, day-row separators, the header's bottom edge, sheet and popover borders, the dock's top edge, dividers, and the global default `border-color`.
- **Strong Hairline** (`line-strong`): The scrollbar thumb (`.kmitl-scroll`) and the `:active` press state of toolbar buttons. It no longer rules the grid — with quarter-hour lines gone there is only one line weight left in it.
- **Canvas** (`canvas`): The page ground the white sheet sits on.
- **Hover** (`hover`): The day-row and menu-row hover ground, and the pressed/open state of icon buttons.
- **Sheet White** (`surface`): The grid ground, the docked toolbar, and the popover.

### Named Rules

**The Derived Color Rule.** No chosen color ever reaches a surface raw. `src/shared/colors.js` takes any hex — a PALETTE stop or whatever the OS color picker returns — and solves a four-part set per hue: `tint` is the ground at HSL `l=0.92` with saturation clamped to 0.6-0.9, used for subject blocks and the term pill; `ink` is found by walking lightness down until it reaches **7:1 against that tint**, used for block titles and the pill's text; `inkSoft` is solved to **4.8:1 against the tint** for block meta; `bar` at `l=0.52` is the full-chroma accent, and its only surface is the picker swatch's inset ring. Contrast is solved against real WCAG relative luminance, not against a fixed HSL lightness — green channels weigh 0.7152 and blue 0.0722, so any fixed-lightness scheme fails on the green side of the wheel every time. Achromatic or invalid input (`s < 0.06`) falls back to the NEUTRAL set. Verified worst case across all ten palette stops plus `#E35205`: ink 7.02, inkSoft 4.82.

**The No Raw Color Rule.** There is no raw-hex surface anywhere in the system. Every place the user's or the palette's color becomes visible — block ground, block text, term pill, swatch ring — is one of the four solver outputs. If a new surface needs the chosen color, it takes an existing output or the solver gains a fifth; it never takes the picked value directly. A solver output that no surface uses is deleted, not kept "in case" — `solid` was removed with the white-on-solid pill it existed for.

**The Stable Subject Color Rule.** A subject's color is a pure function of its `subjectId` (FNV-1a into PALETTE, with a deterministic forward probe on collision), never `Math.random()`. The same table reloads with the same colors, and a subject keeps its color across terms. Color that reshuffles on refresh is decoration; color that holds is memory, and memory is the only thing that makes a ten-hue palette worth having.

**The 4.8 Margin Rule.** The targets are 7 and 4.8, not 4.5. The margin is deliberate and must not be trimmed: the artifact's entire purpose is a PNG that gets recompressed by chat apps, Thai glyphs at 11px/300 are thinner than any pixel measurement suggests, and the 0.005 lightness step can land on 4.4995. Secondary text uses full-alpha `inkSoft`, never `opacity` — opacity throws away the contrast that was just solved for.

**The No Chroma Edge Rule.** Full-chroma color reaches no surface inside the sheet. A subject block is a tint ground and same-hue ink and nothing else — no left bar, no stroked border, no second stripe. Tint and ink already encode the subject twice; a third encoding of the same fact adds noise, not signal. `bar` survives only as the inset ring on the picker swatch, where it is separating one swatch from the next rather than restating the block.

**The Hue Distance Rule.** PALETTE is exactly ten stops, no two closer than ~25° on the wheel, and contains no orange. With no chroma edge, hue distance is the sole carrier of subject identity: two near-duplicate hues produce two blocks that read the same at a glance. Keep the separation.

**The Status-Only Rule.** `kmitl` is reserved for state: focus, selection, error. The user-controlled header color is the one identity channel, and it spends itself on the term pill alone — nowhere else.

## Typography

**Body Font:** Prompt (with `sans-serif`), bundled with the extension at weights 300 / 400 / 500, Thai and Latin subsets, injected inline as a `<style>` element so the rasterizer can see the `@font-face` rules at export time. There is no second family: Prompt is applied globally.

**Character:** A geometric Thai/Latin companion that stays even in color at small sizes and keeps Thai a first-class citizen rather than a fallback. The ramp is deliberately short — three sizes, three weights — so hierarchy comes from weight and ink level, not from size inflation.

### Hierarchy
- **Title** (500, 13px, 1.25): The largest text in the system, and it belongs to the content — subject names inside blocks. The header's identity line, toolbar buttons, and term selects share the step; nothing is larger, so the schedule is never outranked by its own frame.
- **Body** (400, 13px): Menu row labels and the dock's status line.
- **Meta** (300, 11px, 1.25): Times, room/section/type lines, hour labels on the axis, day names, the header's context line, and overflow subject labels. Times carry `.tnum` (`font-variant-numeric: tabular-nums`).
- **Label** (400, 11px, 0.08em, uppercase): The popover's section heading only.
- **Pill** (500, 11px): The term pill, on the header hue's `tint` in that hue's `ink`, tabular.

### Named Rules

**The Two-Step Rule.** The ramp is 11 and 13px and the weights are 300 / 400 / 500. There is no larger step and no 600+. If a new element seems to need one, it needs a different ink level or a different weight instead. The 15px identity step was removed when the header stopped being a headline.

**The Tabular Time Rule.** Every rendered clock value carries `.tnum`. Without it the time column twitches on the minute tick and digit columns fail to align in the exported image.

**The Same-Hue Text Rule.** Text on a tinted ground is that ground's own hue, never neutral gray. A block's title is its subject's `ink`, its meta line that subject's `inkSoft`, and the term pill's text the header hue's `ink`. Neutral ink is for white grounds only — which, since the header went white, is where most of the interface's text now lives.

**The Local Language Rule.** Every string the interface renders is Thai, and that includes the day column: `จ. อ. พ. พฤ. ศ. ส. อา.`, the registrar's own abbreviations, at meta size with no uppercase and no letter-spacing. Latin day names in a spaced uppercase label were borrowed dashboard styling on a Thai surface and read as exactly that.

## Layout

The viewport is divided into two bands: the page, and a 56px chrome dock pinned to the bottom edge across the full width.

The page is exactly one viewport tall and does not scroll: `h-screen` with `overflow: hidden`, never `min-height`, which lets a few stray pixels turn into a scrollbar. Two things make that hold. The sheet is a flex child that absorbs the remaining height rather than asserting its own, and `body` margin and padding are zeroed in the base layer — the registrar's own stylesheet ships body spacing that becomes pure overflow once this surface replaces the page's content. The height lock is scoped to this surface only; the legacy view scrolls normally, because the original registrar page is longer than a screen.

The page carries 24px padding on three sides and **80px of bottom padding** — the dock's height plus its own breathing room — so the sheet always ends above the chrome instead of disappearing under it. The legacy view carries the same bottom padding for the same reason.

Inside the page, one white sheet fills the remaining height: rounded 12px, hairline border, a two-part resting shadow, and `overflow: hidden` so the header row and the grid both clip cleanly at the corner radius. With no element above the header, the sheet's own radius and border *are* the top edge.

The sheet reads top-down as a single header row and then the grid, both on white. The grid's columns are a fixed 3.5rem day column plus 48 equal quarter-hour columns (08:00-20:00, `minmax(0, 1fr)` each). Its rows are an auto hour-label row plus seven day rows at `minmax(3.5rem, 1fr)`. Day rows are `subgrid` in both axes, so every divider in every row lands exactly on the same column line as the hour label above it. Column 1 is the day name; time slots start at grid line 2.

**The Fixed Frame Rule.** Neither axis resizes to the data. 08:00-20:00 by seven days is the reference frame the reader learns once: cropping it per term would move every class to a new position on every reload and make two exported weeks impossible to compare, and a week that silently drops Sunday no longer reads as a week. Quarter-hour columns still exist for positioning; they are simply not drawn.

Spacing rhythm is a 4px scale used at 2 / 4 / 6 / 8 / 10 / 12 / 24, with an 80px step reserved for the dock clearance. Header padding is 12px vertical / 24px horizontal; block padding is symmetric (6px vertical, 10px horizontal) now that no bar intrudes on the left; the dock uses the same 24px horizontal gutter as the page; controls sit on 8-10px horizontal padding at a 32px control height.

This round is desktop-only and has no dark mode; there are no breakpoints in the shipped build. Verified at 1440x900 and 1280x800. The reference images in `.impeccable/review/` were retaken against this revision from the `preview/` harness, so they now show the current header line, Thai day abbreviations, and docked bottom bar rather than the previous revision's layout.

**The Outside-the-Frame Rule.** Everything that is chrome — the status line, term selects, customize, download, mode toggle — lives in the docked bottom bar, *outside* the captured element. The capture target is the sheet alone, so the exported PNG contains schedule and identity and nothing else.

**The Reserved Band Rule.** Chrome does not overlap content. The dock occupies a fixed 56px band and the page reserves 80px of bottom padding for it. If chrome grows, the reservation grows with it; the schedule is never partly hidden behind a control.

## Elevation & Depth

Depth is tonal first: a white sheet on a cool canvas, hairlines for structure, hover grounds for feedback. The system has exactly one genuinely floating element — the customize popover — and it is the only thing carrying an ambient shadow. The docked toolbar is not a floating object: it is a white band separated from the page by a single hairline top edge, with no radius and no shadow. No element inside the sheet carries a shadow of any kind, inset or outer.

### Shadow Vocabulary
- **Resting sheet** (`box-shadow: 0 1px 2px rgba(16,21,27,0.04), 0 1px 3px rgba(16,21,27,0.06)`): The calendar sheet. Barely there; it separates the sheet from canvas without reading as a card.
- **Floating popover** (`box-shadow: 0 1px 2px rgba(16,21,27,0.04), 0 8px 24px rgba(16,21,27,0.12)`): The customize popover, the one element that truly floats above everything else.
- **Swatch ring** (`box-shadow: inset 0 0 0 1.5px <bar>`): The customize popover's color swatch, and the only inset shadow left in the system. It separates one swatch from the next inside a dense list; it is not an edge treatment carried over onto the block.

**The Real-Float Rule.** An ambient shadow means the element genuinely floats above the page, and in this system only the popover does. Anything that occupies its own reserved band — the docked toolbar above all — separates with a hairline instead. Subject blocks, the header, grid rules, and pills carry no shadow at all. If it is part of the page or docked to its edge, it is flat.

**The Capture-Safe Rule.** Nothing inside the capture frame may use `blur`, `backdrop-filter`, or `filter`. The rasterizer does not reproduce them, so any depth built from them is depth that disappears in the artifact.

## Shapes

A soft-rectangle language on one radius scale, scaled by size: 12px on the sheet and the popover, 8px on interactive controls (buttons, selects, menu rows), 6px on subject blocks and color swatches, 4px on the term pill. The docked toolbar is the deliberate square exception: it meets the viewport edges on three sides, so it carries no radius at all.

Every shape in the sheet is a flat tinted rectangle or a hairline. There is no edge shape, no stripe, and no chroma accent — a block's whole geometry is its rounded tint.

Borders are the exception, not the default: the sheet and popover carry a single hairline all round, the header carries one on its bottom edge, the dock carries one on its top edge, and subject blocks carry no stroked border at all. The grid itself is drawn with left borders on hour-wide background cells rather than with a background pattern — one cell per hour, one weight, twelve or fewer lines instead of forty-eight.

Icons are 24-viewbox stroked SVG paths at `stroke-width: 1.5`, rendered at 14-16px in `currentColor`. There is no icon font and no glyph icon anywhere in the system.

## Components

### Buttons
- **Shape:** Rounded rectangle (8px), 32px tall.
- **Text button:** Transparent ground, mid ink label at 13px/500, 10px horizontal padding.
- **Icon button:** 32x32 square, centered 16px stroked SVG, mid ink.
- **Hover / Active / Open:** Hover fills with `hover` ground and darkens the label to `ink`; press fills with `line-strong`; the customize button holds the hover ground while its popover is open.
- **Focus:** No custom ring — the global 2px `kmitl` `:focus-visible` outline at 2px offset applies everywhere.

### Toolbar
A docked bar, not a floating pill. It spans the full viewport width, sits flush on the bottom edge, stands 56px tall on white with a single `line` hairline along its top, and uses the page's 24px gutter. No radius, no shadow.

Its contents are split left and right:
- **Left, the status slot:** a single 13px line that is empty at rest, shows the loading message in `ink-3` while a term is switching, and shows the switch failure in `kmitl` with `role="alert"`. Errors surface here rather than in a separate floating element; there is exactly one place in the interface where transient status speaks.
- **Right, the control group:** year select, semester select, a 20px hairline divider, customize, download, a second divider, and the Old/New toggle, all on 4px gaps.

### Exam Table

- **Character:** the same sheet as the week grid, read down columns instead of across a time axis. Hairline `line` rules only, no cell borders and no alternating band — the date grouping carries the rhythm on its own.
- **Header row:** 11px `ink-3`, uppercase with the label tracking, left-aligned.
- **Cells:** 13px, `ink` and `font-medium` for the subject name and the date, `ink-2` for everything else, `.tnum` on every code, time and number. Rows take the `hover` ground on hover.
- **Date group:** the first row of each day carries the date in a `rowspan` cell and a `line` rule above it. Days without a scheduled date collapse into one group labelled `ไม่ทราบ` in `ink-3`.
- **Room / remark column:** fixed width, clamped to two lines. The clamp is visual only — the full string stays in the DOM and in the exported PNG, and is available as a `title`.

### Segmented Control

- **Where:** the exam header, choosing which exam round is displayed. It is data about what is shown, not chrome, so it stays inside the capture frame with the term pill.
- **Shape:** a `line` hairline group at 8px radius wrapping two 28px buttons at 6px radius, 11px type.
- **Selected:** the `hover` ground plus `font-medium` and `ink`; unselected is `ink-3`. State is carried by `aria-pressed` as well as by ground and weight, never by colour alone.
- **During capture:** replaced by the plain label of the active round, per the export rule that interactive controls become text.

### Term Pickers

- **Not a native control.** The year and semester pickers are listbox widgets (`bits-ui` `Select`): a button trigger in the dock and a floating option list portalled to the document body. The registrar's stylesheet names `SELECT` at element level and is unlayered, so a native `<select>` can never be out-ranked by a utility class; removing the element is what removes the problem.
- **Trigger:** dock button shape — 32px tall, 8px radius, `title` type in `ink`, hover on `hover`, with a 14px chevron in `ink-3`. Disabled while a term is loading and marked `data-disabled` rather than dimmed by colour alone.
- **Options:** white sheet, 12px radius, hairline border, the popover shadow; each row 8px radius with `hover` on `data-highlighted` and `title` weight on `data-selected`.
- The exam page's Mid/Final control is the one remaining native `<select>`. It sits inside the capture frame and drives a real form POST, so it is deliberately left alone.

### Inputs / Fields
- **Term select:** Appearance stripped, transparent ground, 13px/500 ink, 8px radius, 32px tall, right padding reserved for a 14px chevron drawn in quiet ink and pointer-events-none.
- **Disabled:** Cursor not-allowed and text drops to quiet ink; the whole sheet dims to 60% opacity for 150ms while a term loads.
- **Error:** No dialog, no toast, no colored banner — the message is one line of `kmitl` text in the dock's status slot.
- **Color input:** A native `<input type="color">` at full size with zero opacity behind a 20px swatch; the swatch shows the *applied* `tint` with a 1.5px inset ring in `bar` — the same two colors the block itself uses, so the picker previews the block as it will actually render.

### Customize Popover
The one genuinely floating surface. Anchored above the customize button and opening upward so it clears the dock entirely: 320px wide, white, hairline border, 12px radius, popover shadow, 6px inner padding. An uppercase 11px quiet-ink heading, then a scrolling list (max 288px, thin `line-strong` scrollbar via `.kmitl-scroll`) of label + swatch rows on 8px radius with hover ground, then a hairline-separated reset row. First row is always the header color; subject rows follow.

### Header Card
One row, white, no rule above it. The sheet's own 12px radius and hairline border form the top edge.

The row is 12px/24px padding on white, closed by a `line` hairline along its bottom. Left, on one baseline: the identity line (student ID and name, 13px/500 in neutral `ink`) followed by the context line (faculty · department · major, 11px in `ink-3`, truncating first because it matters least). Right, shrink-proof: the term pill, 4px radius, 11px/500 tabular, on the chosen hue's `tint` in that hue's `ink`.

The header is context, not a headline. It was a 20px/24px band on a full-width tint with a solid white-on-color pill — the loudest object on the sheet carrying the information the user needs least, since nobody opens their timetable to read their own name. It now costs one row and one small tinted pill, and the user's color still shows in it.

### Week Grid (signature)
The system's defining component. An hour label row in 11px quiet ink over seven identical day rows on a white ground. Background cells are hour-wide and draw the ruling with a single `line` left border each. Day rows take a `hover` ground on hover, and each subject block sits in a white wrapper that inherits that hover ground so the block reads as one solid object with no rules leaking underneath it.

**Blocks** are tint ground, same-hue ink, 6px radius, 6px/10px padding, and nothing else — no bar, no border, no shadow. Content degrades by real width, not by ellipsis:
- Span ≥ 1 hour: subject name (13/500, 2-line clamp), time (11/300 tabular), and a bottom-aligned room · section (type) line in `inkSoft`.
- Span > 30 min but < 1 hour: subject name only, truncated.
- Span ≤ 30 min: the block renders as tint only, and the subject name is placed as **real text starting at the block's own left padding and overflowing to the right** across the free span (up to 8 slots, never crossing the next block). Starting inside the block is what makes the name read as belonging to it; a label that began at the block's right edge floated free and looked like a rendering bug. It is real text rather than a `title` because `title` attributes and `sr-only` text do not exist inside an exported PNG.

**Entrance motion.** Chrome fades and lifts in: the docked toolbar over 200ms, the customize popover and the option list over 150ms, both eased out. Nothing else in the system animates on appearance.

**The Capture-Frame Motion Rule.** Animation stops at the edge of the capture frame. The docked toolbar, the customize popover and the term option list may animate; the sheet, header, grid, subject blocks and exam table may not. snapdom reads computed style at an instant, so a block caught mid-fade is baked into the PNG mid-fade. The rule is enforced by reading the source, not at runtime: an `animate-*` class inside a component that renders within a capture target is a defect.

**No current-time marker.** The grid was shipped for a period with a 1px `kmitl` line and a time chip tracking the clock; both were removed. Nothing inside the grid uses the system color as a fill any more, and the grid holds no self-updating state — it is a pure function of the schedule it is handed, which is also what makes two exported PNGs of the same term identical.

## Do's and Don'ts

### Do:
- **Do** run every user-chosen or palette color through `blockColors()` and paint only its `tint` / `ink` / `inkSoft` / `bar` outputs. Nothing in the system is painted with a picked hex.
- **Do** assign subject colors from `subjectId` through the FNV-1a hash so the same table reloads with the same colors.
- **Do** hold the frame constant at 08:00-20:00 by seven day rows, whatever the schedule contains.
- **Do** keep the header to one white row: identity at 13px/500 neutral ink, context at 11px quiet ink, and the chosen color spent on the term pill alone.
- **Do** keep text on any tinted ground in that ground's own hue.
- **Do** write day names in Thai at meta size, unspaced and un-uppercased.
- **Do** dock chrome full-width and flush to the bottom edge on white with a hairline top, and reserve 80px of page bottom padding so the schedule clears it.
- **Do** put every transient message — loading, error — in the dock's single left status slot, in `ink-3` and `kmitl` respectively.
- **Do** solve contrast against real luminance per hue, targeting 7:1 for `ink` and 4.8:1 for `inkSoft`.
- **Do** keep PALETTE at ten stops with ~25° minimum hue separation, and keep orange out of it.
- **Do** hold the type ramp at 11 / 13px and weights 300 / 400 / 500, and put `.tnum` on every clock value.
- **Do** rule the grid with one weight — `line` on hour boundaries — and draw nothing at quarter-hour lines.
- **Do** start a short block's overflow name at the block's own left padding so it reads as attached to it.
- **Do** delete a solver output, a token, or a type step the moment the last surface using it goes away.
- **Do** keep all chrome outside the capture target.

### Don't:
- **Don't** add a current-day indicator. The today-row wash, the orange dot, and the bold day label were each built and removed by user order. All seven day rows render identically.
- **Don't** put a rule, stripe, or band above the header. The 3px top rule was built and removed by user order; the sheet's own radius and border are the top edge now.
- **Don't** give the header a colored ground again, at any saturation. It is one white row; the header outweighing the schedule is the specific failure this revision fixed.
- **Don't** let identity color leave the term pill. The grid ground stays white so subject tints are the only color in it.
- **Don't** paint a picked hex anywhere. If a surface needs the chosen color, it takes a solver output.
- **Don't** assign subject colors randomly. `Math.random()` in `makeTheme` meant the same schedule rendered a different palette on every reload, which made color decorative rather than meaningful.
- **Don't** crop or shift either axis per term — the 08:00-20:00 by seven-day frame is the fixed reference the reader learns, and empty rows and columns are part of it.
- **Don't** let chrome overlap the schedule. The toolbar was a floating pill and covered the last day row; it is now a docked band the page pads for, and that reservation is the rule.
- **Don't** give the dock a radius or a shadow — it meets three viewport edges and separates with a hairline. Only the popover floats.
- **Don't** raise a toast, a dialog, or a colored alert box for transient status; there is one status slot.
- **Don't** let the study-table surface scroll. It is `h-screen` with `overflow: hidden`; `min-h-screen` is what allowed a few pixels of drift, and the host page's `body` spacing must stay zeroed. New content earns its place by displacing something, not by growing the page.
- **Don't** give a subject block a chroma edge, a stripe, or a border. Tint and same-hue ink already say which subject it is; a third channel saying the same thing is noise.
- **Don't** add near-duplicate hues to PALETTE; with no chroma edge, hue distance is the whole signal.
- **Don't** rule quarter-hour columns. Nobody reads a class schedule at fifteen-minute resolution, and forty-eight hairlines per row is texture, not structure.
- **Don't** put Latin day names, uppercase, or letter-spaced labels on a Thai surface.
- **Don't** use `opacity` to make text secondary — use full-alpha `inkSoft`, which has a solved contrast ratio.
- **Don't** use `blur`, `backdrop-filter`, or `filter` anywhere inside the capture frame.
- **Don't** rely on `title` attributes or `sr-only` text to name anything in the grid; neither exists in the exported PNG.
- **Don't** spend `kmitl` on anything but status: focus, selection, error.
- **Don't** give a subject block a shadow of any kind; its rounded tint is the whole object.
- **Don't** introduce a second font family, a CDN font, or an icon font; Prompt is bundled and injected inline, icons are inline stroked SVG.
