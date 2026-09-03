# Design — fix-portrait-legibility

## Context

See proposal.md for the measurements. Where they came from and what they constrain:

- The portrait canvas is 540×1260 CSS px (`shared/exportCanvas.js`), fixed by the crop argument in `wallpaper-export` decision 1. It is not available as a lever here.
- `PortraitGrid.svelte` gives 36px to the hour-label column, leaving 504px for the days. Seven days is 67px each, 65px inside a block.
- Measured in the browser with the shipped type: at 13px medium, 65px holds **6 characters**; at 11px light, the room line holds **11 of its 31 characters**.
- A block's height is what varies: one hour is about 53px, two hours 107px, three hours 162px.
- Three arrangements were tried against the real fixture by injecting CSS into the rendered export, not by reasoning:

```
   1. หมุนเฉพาะชื่อ ไม่จำกัดความสูง   ชื่อครบ แต่ดันบรรทัดเวลา/ห้องตกขอบบล็อก
   2. หมุนทั้งกล่อง + line-clamp      แย่ลง : clamp กลายเป็นจำกัดจำนวนคอลัมน์
   3. หมุนชื่อ + กินความสูงที่เหลือ     ชื่อครบ เวลา/ห้องยังอยู่  <- ที่ใช้
```

- The exam portrait is a full-width list and reads correctly; nothing here touches it except the header.

## Goals / Non-Goals

**Goals:**

- A subject name of ordinary length is readable in a block of ordinary size.
- The room and section are readable, not cut after two words.
- Nothing in the portrait image identifies the student.
- One way to start a download.

**Non-Goals:**

- No change to the landscape export, including its header.
- No change to the aspect ratio, the reserved bands, or the content-fitted extent.
- No promise that every block is legible. A 53px block cannot hold a long name in any orientation, and this design says so rather than hiding it.
- No new abbreviation scheme for subject names. Shortening is a different decision from fitting.

## Decisions

### 1. Rotate the text, not the layout

Block content uses a vertical writing mode. The grid, the day columns, the hour labels and the header all stay as they are.

```
   ก่อน                          หลัง
   +----------------+           +----------------+
   | SOFTWA         |           | S  0  I        |
   | RE             |           | O  9  T        |
   | VERIFICA       |           | F  :            |
   | TION           |           | T  0  P        |
   | AND            |           | W  0  r        |
   | VALIDAT        |           | A  –  o        |
   | 09:00-12:00    |           | R  1  j        |
   | IT Projec...   |           | E  2  e        |
   +----------------+           +----------------+
   บรรทัดยาว = 65px             บรรทัดยาว = 162px
   6 ตัวอักษร                    ~23 ตัวอักษร
```

- Why this and not a smaller font: 13px → 11px buys one character (6 → 7). The constraint is the axis, not the size.
- Why not abbreviate to the subject code: the code is already on the exam export and means nothing at a glance on the timetable. The name is the thing a student reads.
- Why not drop the hour-label column to buy 36px: 67 → 77px is 7 characters instead of 6. It also removes the only way to read what time an empty slot is. Not worth it, and it is still available later if something else needs the width.
- Thai renders correctly rotated; this was checked on the fixture's Thai subject, not assumed.

### 2. The time and room rotate too, as a second column

Within the rotated block, the name is one column and the meta lines are the next.

- Leaving them horizontal was tried (arrangement 1 above). It reads as two directions in one small box for no reason, and it keeps the 65px line length that was the problem.
- Rotated, `09:00–12:00 · IT Project Base2 ชั้น 2 · 1 (ท)` has 162px of line rather than 65px.
- The name takes the space that remains after the meta column, so the meta is never pushed out of the block. That is the one thing arrangement 1 got wrong.

### 3. Short blocks clip, and that is stated

A one-hour block gives a rotated line 53px. Five of nineteen blocks in the maximal fixture still clip.

- The alternative is shrinking type below the design system's smallest step for one case, which trades a readable image everywhere for a slightly less clipped image in a few places.
- What matters is that a clipped block still shows its colour, its time and where it sits — a student who cannot read the name still knows they are busy and can look it up. That is the fallback, and the spec scenario says it in those terms.

### 4. The portrait export has its own header

A small header showing only the term, used by both portrait exports. The landscape exports keep `HeaderCard` and `ExamHeader` untouched.

- Why not reuse the on-screen header and hide parts of it: the on-screen header exists to identify whose timetable this is, which is right on screen and wrong on a wallpaper. Two different jobs.
- Faculty and department go too. They are not secret, but they are not the timetable either, and on a wallpaper they are the line that pushes the term onto a second row.
- The `flex-wrap` added to both headers during `wallpaper-export` stays; it is what keeps them from colliding at export width, and the landscape export still uses them.

### 5. The menu: pick a format, set its options, press download

```
   +----------------------------+
   |  ( ) แนวนอน                 |
   |      สำหรับดูบนคอมพิวเตอร์      |
   |  (*) แนวตั้ง                 |
   |      สำหรับตั้งเป็นพื้นหลังมือถือ  |
   |        [x] เว้นที่ให้นาฬิกา      |
   |        [x] ตัดวัน/เวลาที่ไม่มีเรียน|
   +----------------------------+
   |        [ ดาวน์โหลด ]         |
   +----------------------------+
```

- What was wrong: `แนวนอน` downloaded on click while `แนวตั้ง` was a heading over checkboxes and a second button. Two models, and the reader has to work out which control is which kind.
- One model now: the format is a choice, the options belong to the chosen format and appear under it, and one button at the bottom acts. The landscape format simply has no options.
- `เผื่อพื้นที่นาฬิกา` becomes `เว้นที่ให้นาฬิกา` and each format carries a line saying what it is for, because the switch names describe a mechanism and the student is choosing a purpose.
- The popover keeps everything `modal-customize-menu` established: portalled to `body`, `role="dialog"`, focus trapped, Escape returns focus, and the invisible layer so an outside click does not press what is beneath.

## Risks / Trade-offs

- [Rotated text is slower to read than horizontal text] → True, and it is the trade being made: unreadable at any speed versus readable with a tilt. The times, the day names and the colours stay horizontal, so the shape of the week still reads at a glance without turning anything.
- [Some blocks still clip and a student thinks the export is broken] → Decision 3 keeps colour, time and position, so a clipped block is visibly a class rather than a blank. The spec names the case so it is a known state rather than a defect report.
- [Removing the identity makes two images that look different enough to confuse] → They are for different things and the difference is the point. The landscape export keeps identity because it is the one a student keeps.
- [The menu redesign breaks every test that drives the download] → Every one of them goes through a helper in `e2e/fixtures.js`; the change lands in one place, and the tests then prove the new flow.
- [Rotation behaves differently in the real extension bundle from the harness] → The extension project exports a portrait PNG already; the assertion moves from "an image came out" to "the name is in it", checked on the built extension.

## Migration Plan

Reversible. No dependency, manifest or build changes. The visible differences are inside the portrait image and in the download menu; the landscape export is byte-comparable to what it produces today.
