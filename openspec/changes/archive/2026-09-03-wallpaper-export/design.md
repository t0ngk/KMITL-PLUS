# Design — wallpaper-export

## Context

See proposal.md for why and for the corpus measurements. What constrains the shape:

- `DownloadButton.svelte` calls `snapdom(target, { embedFonts: true, scale: 2, reconcile: true })` on the element the page passes in, then `capture.download()`. The target is the sheet the student is looking at, so what is exported is what is on screen. Portrait breaks that assumption: there is nothing on screen to capture.
- `Grid.svelte` places cards with `grid-column` derived from the class start and end in 15-minute slots, one subgrid row per weekday. Two thresholds depend on that axis being time: `detail` (show room and section) at ≥ 1 hour, `titled` at > 30 minutes. A block too short to hold its name gets `labelEnd`, letting the label spill to the **right** into the next free slot.
- `ExamTable.svelte` is an eight-column table: วันสอบ เวลา รหัสวิชา ชื่อวิชา กลุ่ม หน่วยกิต ประเภท ห้องสอบ.
- The capture frame rule: controls must be outside the captured element, and interactive controls inside it become static text while `downloading` is true. `image-export` has a scenario for each.
- Animations are forbidden inside the capture frame.
- `@font-face` for Prompt is injected as a data URI into `document.head`, which is why `embedFonts` works. Anything rendered off-screen in the same document inherits that.

## Goals / Non-Goals

**Goals:**

- A portrait PNG that survives being set as a wallpaper: not cropped along its width, not covered by the clock.
- The same timetable, not a reduced one — every subject, time and room the landscape export carries.
- The two arrangements cannot silently disagree about what goes where.

**Non-Goals:**

- No change to the landscape export's output.
- No responsive work on the on-screen views. They are broken below about 700px; the extension does not run on a mobile browser, so that is a different problem with a different trigger.
- No second aspect ratio, no per-device sizing, no printing.
- No change to scraping, theming, or term switching.

## Decisions

### 1. 21:9 at 1080×2520, derived rather than picked

When a phone displays an image that does not match its screen it scales to fill and crops the overflow. Which edge it crops follows from which way the mismatch runs:

```
   รูปสูงกว่าจอ  ->  เต็มความกว้าง  crop บน-ล่าง
   รูปเตี้ยกว่าจอ ->  เต็มความสูง    crop ซ้าย-ขวา
```

Cropping the sides removes day columns. Cropping the top and bottom removes the bands this design already leaves blank. So the image must be taller than every phone it might land on:

```
   iPhone 15/16     19.5:9 = 0.462
   Android          20:9   = 0.450
   ที่เลือก           21:9   = 0.429   <- สูงกว่าทั้งคู่
```

- Why one ratio and not a list: the desktop cannot know the phone, and a chooser turns a two-click export into a form. One ratio that crops safely everywhere is worth more than four that crop exactly on one device each.
- 1080×2520 at `scale: 2` means the off-screen element is 540×1260 CSS pixels — the same scale the landscape export already uses, so nothing about font embedding or rasterisation changes.
- The full-canvas variant has no blank bands, so on a phone it *will* lose grid to the crop. That is consistent with what it is for: viewing and sharing, not wallpaper.

### 2. Reserved bands: 22% top, 16% bottom, blank

```
   +--------------------------+  1080 x 2520   (540 x 1260 CSS)
   |                          |  277 CSS px    นาฬิกา วันที่ แจ้งเตือน
   +--------------------------+
   |                          |
   |         ตาราง             |  781 CSS px
   |                          |
   +--------------------------+
   |                          |  202 CSS px    dock / ปุ่มปลดล็อก
   +--------------------------+
```

- Blank, not filled with the student's name or the term: the top band is under the clock and unreadable, and the bottom band is where home-screen icons land. Content there would be hidden on one screen and cluttered on the other.
- The bands carry the sheet's own background so the export still reads as one image rather than a grid floating on white.
- 781 CSS px over a nine-hour term is 87px per hour — a one-hour class is 87px tall and about 120px wide, which holds a name, a time and a room.

### 3. The placement maths is shared; only the markup differs

Extract what decides *which subject goes where* out of `Grid.svelte` into a module both arrangements call. Each arrangement keeps its own markup.

- Why not one component with an `orientation` prop: the markup genuinely differs — landscape is one subgrid row per day with time across; portrait is one column per day with time down. Forcing both through one template means a component whose every block is a conditional, which is harder to read than two templates.
- Why not two independent components: that is how the two walk scripts rotted. The part that can drift *silently* — the slot arithmetic, the colour lookup, the overlap handling — is exactly the part that must be shared. The part that differs is visible on sight.
- The thresholds do not survive the rotation and must be restated per arrangement. In landscape an hour is 116px of width, so `detail` at one hour is generous; in portrait an hour is 87px of height and a 15-minute class is 22px tall — able to show nothing at all. Each arrangement decides what fits in its own axis.
- `labelEnd` spills a cramped label to the right in landscape. In portrait the free space is below, and below is the next class on the same day. The rule is the same — spill into the next free slot — but the direction and the neighbour differ.

### 4. Portrait renders off-screen, then is captured and removed

```
   วันนี้   snapdom(sheet ที่เห็นอยู่)
   ใหม่     mount กล่องกว้าง 540px นอกจอ -> snapdom scale 2 -> unmount
```

- It must be in the document, laid out, and inside the same `document.head` that carries the embedded font — so it is mounted in the page, positioned outside the viewport, not rendered into a detached tree or an iframe.
- It must not be reachable while it exists: `aria-hidden`, no focus, no pointer events. It is a rendering target, not a view.
- It is removed as soon as the capture resolves, including when the capture throws. A stray full-viewport element left behind is the kind of thing that turns up inside a later export.
- The capture-frame rule still holds by construction: nothing interactive is inside the off-screen element, so there is no control to turn into static text.

### 5. The exam schedule gets cards, not a rotated table

Eight columns in 540px is 67px each. A subject name does not fit, and neither does a room code.

```
   จันทร์ 22 ม.ค. 2567
     09:30-12:30   INFORMATION TECHNOLOGY PROJECT MANAGEMENT
                   06016307 · กลุ่ม 2 · 3 (3-0) · ทฤษฎี · IT:M 22:A3
```

- Grouped by date, as the landscape view already groups. Entries with no date keep the `ไม่ทราบ` treatment and sort after the scheduled ones, as they do now.
- The extent choice is not offered here. An exam list has no empty rows to trim; offering a switch that does nothing would be worse than not offering it.

### 6. Content-fitted extent: trim the edges, keep the gaps

- Hours: drop leading and trailing hours no class touches. No term in the corpus starts before 09:00, so this is a column back on every real timetable.
- Days: drop empty days at the start and end of the week. Keep an empty day between two used days, as a narrower column.
- Why keep the middle gap: a student reads the shape, not the labels. Four scattered days collapsed into four adjacent columns says "I have class Monday through Thursday", which is false. A narrow empty column says "nothing that day" at a glance and costs about 40px.
- The narrow column still carries its day name. It is quieter, not anonymous.

### 7. The control becomes a menu of formats

Activating download opens a popover listing the formats; choosing one downloads immediately.

```
   +--------------------------------+
   | แนวนอน (เดิม)                   |
   |--------------------------------|
   | แนวตั้ง                          |
   |   [x] เผื่อพื้นที่นาฬิกา            |
   |   [x] เฉพาะวัน/เวลาที่มีเรียน      |
   |   [ ดาวน์โหลด ]                 |
   +--------------------------------+
```

- The cost is that the one-click landscape download becomes two clicks. The alternative — a small caret beside the icon — puts a second hit target into a dock that is already tight, and hides the new formats behind an affordance nobody looks for.
- The popover follows the customize menu: portalled to `body`, `role="dialog"`, focus trapped, Escape returns focus, and an invisible layer so an outside click does not also press what is underneath (`modal-customize-menu` decision 1 — the library does not do this on its own).
- The two portrait switches are remembered for the session, so a student exporting twice does not re-tick them. They are not persisted; there is nothing else in this extension that persists preferences and this is not the change to introduce that.

## Risks / Trade-offs

- [The two arrangements drift, and the portrait export shows a different timetable from the screen] → Decision 3 shares the part that decides placement. The e2e suite compares the two: the same subjects, times and rooms must appear in both, asserted from the exported PNG and the DOM rather than by eye.
- [Overlapping classes render on top of each other in a day column] → Landscape lays overlapping cards along the time axis where they can sit beside each other; a portrait day column has no such room. The fixture has a deliberate overlap pair, so this is reachable in the harness and must be decided during apply rather than discovered by a student. If it needs a real answer (side-by-side halves, as a calendar does), that is a task, not a surprise.
- [The reserved bands are wrong for some phone] → They are proportions, not device measurements, and they are also the crop tolerance from decision 1. A phone that reserves more than 22% at the top will eat into the grid; nothing here can prevent that without knowing the device.
- [A 15-minute class shows nothing in portrait] → 22px of height holds no text at any size the rest of the image uses. The label has to spill into the neighbouring free slot (decision 3) or the block has to be marked and read from elsewhere. The fixture has a 15-minute block, so the harness will show which.
- [The off-screen element leaks into a later capture] → Decision 4 removes it on both paths. A test asserts the document is unchanged after an export, including after a failed one.
- [Making the landscape download two clicks annoys the people who only ever wanted that] → Accepted, with the reasoning in decision 7. It is reversible: the menu could later remember the last format and make it the default action.

## Migration Plan

Additive. The landscape export is unchanged, and reverting means removing the menu and the portrait path. No dependency, manifest or build changes.

## Open Questions

- Whether the portrait grid should show subject names in full, abbreviated, or dropped to the subject code at the narrowest column widths. It depends on what a 120px column actually holds with Prompt at the sizes the design system uses, which is a measurement to take during apply rather than a decision to guess now — it does not change the specs, the approach, or the task breakdown.
