# Tasks — wallpaper-export

Reference: `proposal.md` (the corpus measurements), `specs/image-export/spec.md` (nine scenarios, three of them modified), `design.md` (the seven decisions and the open question).

Every scenario in the spec delta needs a test whose title matches it verbatim, in `e2e/image-export.spec.js`. `pnpm e2e:coverage` fails until they all exist.

## 1. Baseline

- [x] 1.1 Record what the landscape export produces today on both pages — pixel dimensions, file size, and the set of colours in the PNG. Verify these are unchanged at the end; the landscape path is supposed to be untouched.
- [x] 1.2 Record what a 540px-wide column budget actually holds: render the study fixture's longest subject name at the design system's block sizes and measure where it truncates at 77px, 120px and 135px. Verify by measuring rendered width, not by looking — this answers design.md's open question.

## 2. Share the placement maths

- [x] 2.1 Extract from `Grid.svelte` the code that decides which subject occupies which slots, its colours, and how overlapping classes are arranged, into a module both arrangements call (design.md decision 3). Verify the landscape grid renders identically before and after: same block count, same positions, same colours.
- [x] 2.2 Verify the extracted module carries no assumption about which axis is time. Anything that names a column or a row belongs to a renderer, not to the shared module.

## 3. The portrait grid

- [x] 3.1 Build the portrait arrangement: days as columns, time down the page, at a fixed 540px width (design.md decision 1). Verify the same subjects, times and rooms appear as in landscape, compared programmatically rather than by eye.
- [x] 3.2 Restate the fit thresholds for the vertical axis — an hour is 87px of height here, and a 15-minute class is 22px (design.md decision 3). Verify against the fixture's 15-minute block and its one-hour block that each shows as much as fits and nothing overflows its area.
- [x] 3.3 Decide and implement what a cramped label does when the free space is below rather than to the right. Verify with the fixture's short blocks.
- [x] 3.4 **Decide how overlapping classes share a day column.** The fixture has a deliberate overlap pair and a portrait column has no room to place them along the time axis. Verify both overlapping subjects are legible and identifiable; if that means splitting the column, say so and do it.
- [x] 3.5 Verify the header block reads correctly at 540px — the identity line and the term pill collide at narrow widths in the on-screen view, and the portrait export must not inherit that.

## 4. Canvas and extent

- [x] 4.1 Compose the export sheet at 540×1260 CSS px with the reserved-band variant leaving 277px top and 202px bottom, carrying the sheet background (design.md decision 2). Verify the exported PNG is exactly 1080×2520 and that the grid falls entirely inside the middle band.
- [x] 4.2 Add the full-canvas variant. Verify the grid fills the image and that the only difference from 4.1 is the bands.
- [x] 4.3 Implement the content-fitted extent: trim leading and trailing empty hours and edge days, keep an interior empty day as a narrow column carrying its name (design.md decision 6). Verify against a term that has an interior gap — the corpus has several; the committed fixture may need one.
- [x] 4.4 Verify all four combinations of canvas and extent produce a valid image, and that extent is not offered on the exam page.

## 5. The exam schedule in portrait

- [x] 5.1 Build the stacked-card layout grouped by exam date (design.md decision 5). Verify every field the landscape table shows is present: date, time, code, name, section, credits, type, room.
- [x] 5.2 Verify entries with no date keep their `ไม่ทราบ` treatment and still sort after the scheduled ones, matching `exam-schedule-render`.

## 6. Rendering off-screen

- [x] 6.1 Mount the export sheet outside the viewport, capture it, and remove it — on the failure path too (design.md decision 4). Verify the document is byte-identical before and after an export, and after an export that throws.
- [x] 6.2 Verify the off-screen element is unreachable while it exists: not focusable, not in the accessibility tree, not hit by a pointer.
- [x] 6.3 Verify the embedded Prompt font appears in the portrait PNG. It is injected into `document.head`, so an element rendered in the same document inherits it — confirm rather than assume.

## 7. The format menu

- [x] 7.1 Turn the download control into a popover listing the formats (design.md decision 7), following the customize menu: portalled to `body`, `role="dialog"`, focus trapped, Escape returns focus to the trigger, and the invisible layer so an outside click does not press what is underneath.
- [x] 7.2 Verify the landscape entry produces exactly what 1.1 recorded — same dimensions, same colours.
- [x] 7.3 Verify the two portrait switches persist for the session and are not written anywhere that outlives it.
- [x] 7.4 Verify the menu is outside the capture frame and that no part of it appears in any exported image.

## 8. Verify

- [x] 8.1 Write a test for each of the nine scenarios in the spec delta, titles verbatim, in `e2e/image-export.spec.js`. Verify `pnpm e2e:coverage` reports every capability at full coverage.
- [x] 8.2 Verify the no-crop guarantee arithmetically: the exported aspect ratio is taller than 19.5:9 and 20:9. This is the one property the whole ratio decision rests on.
- [x] 8.3 Compare portrait against landscape from the exported PNGs and the DOM: same subject set, same times, same rooms. This is the check that catches the two arrangements drifting.
- [x] 8.4 Negative control: break the shared placement module and confirm both arrangements' tests fail, not just one. If only one fails, the maths was not actually shared.
- [x] 8.5 Walk every remaining `image-export`, `study-table-render` and `exam-schedule-render` scenario and verify nothing moved.
- [x] 8.6 Run `pnpm e2e` (both projects), `pnpm e2e:coverage`, the corpus sweep, `pnpm lint` and `pnpm build`.

## 9. Record

- [x] 9.1 Record in `openspec/config.yaml` why the export ratio is 21:9 — that it is derived from the crop direction, not chosen for a device, and that changing it moves which edge gets cropped.
- [x] 9.2 Record that the placement maths is shared between the two arrangements on purpose, and that adding a third arrangement means extending the module rather than copying a renderer.
- [x] 9.3 Record the off-screen render as a pattern: what is exported is no longer always what is on screen, and anything mounted for capture must be removed on every path.

## ผลการเดินล่าสุด

```
   pnpm e2e --project=preview     60 ผ่าน   43.5 วิ
   pnpm e2e --project=extension   13 ผ่าน   47 วิ
   pnpm lint สะอาด · pnpm build 1.28 MB
```

- 1.2 ตอบ open question ของ design : ชื่อยาวสุด 45 ตัว ที่ 77px ได้ 16 ตัวใน 2 บรรทัด
  ที่ 120px ได้ 28 ตัว ที่ 135px ได้ 30 ตัว — แนวตั้งจึง **ไม่ล็อกจำนวนบรรทัด** แต่คิด
  จากความสูงจริงของบล็อก (คาบ 3 ชั่วโมงสูง ~260px ใส่ได้ 6 บรรทัด ชื่อเต็มพอดี)
- 3.4 คาบซ้อนกันแบ่งความกว้างคอลัมน์เท่า ๆ กันตาม lane จาก placement.js
  **corpus จริงทั้ง 12 หน้าไม่มีคาบซ้อนกันเลย** (sweep : overlapPages 0) เคสนี้มีแต่ใน
  fixture ที่แต่งขึ้นเพื่อความทนทาน ที่ 3 ชั้นบนคอลัมน์แคบข้อความจะอ่านไม่ออก
  ซึ่งยอมรับตามสภาพ ไม่ได้ไปประดิษฐ์ท่าพิเศษให้เคสที่ยังไม่เคยเกิด
- 4.3 เพิ่ม fixture `study-table-typical.html` จาก corpus 2565-2 (จ. _ พ. พฤ. ศ.
  09:00-18:00) เซลล์ระบุตัวตนถูกยกมาจาก fixture ที่ redact แล้ว ค่าจริงไม่เคยถูกพิมพ์
  หรือเขียนที่ไหน ตรวจแล้วไม่มีคำนำหน้าชื่อบุคคลนอกเซลล์นั้น และ U+FFFD เป็น 0
- 8.4 negative control จับของจริง : รอบแรก **ไม่ตก** ทั้งที่พัง placement module แล้ว
  เพราะเทสต์ทั้งสองท่าไม่ได้ตรวจตำแหน่งเลย ตรวจแค่ว่ามีวิชาครบ — เพิ่ม assertion
  ตำแหน่ง (`grid-column 6 / 18` แนวนอน, `grid-row 2 / 14` แนวตั้ง) แล้วรันซ้ำ
  จึงตกทั้งสองท่าและหน้าสอบที่ไม่ใช้ module นี้ยังเขียว
- เทสต์ "ผืนภาพนอกจอแตะไม่ได้" ที่เขียนรอบแรกผ่านโดยไม่ได้ตรวจอะไร (import
  placeholder คืน null เสมอ) เขียนใหม่ให้ดักด้วย MutationObserver ก่อนกด แล้วอ่าน
  inert/aria-hidden/pointer-events/จำนวน element ที่โฟกัสได้ ของ host จริง
