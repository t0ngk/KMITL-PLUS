# Tasks — fix-portrait-legibility

Reference: `proposal.md` (the measurements from the real export), `specs/image-export/spec.md` (six new or restated scenarios), `design.md` (the five decisions).

Every scenario in the delta needs a test whose title matches it verbatim in `e2e/image-export.spec.js`; `pnpm e2e:coverage` checks that after archive.

## 1. Baseline

- [x] 1.1 Record what the portrait export shows today, measured not eyeballed: characters per line in a block at the shipped type, how many of the fixture's blocks clip their name, and how much of the room line survives. Verify the numbers match the ones in the proposal, so the improvement is measured against a real starting point.
      วัดได้ : 19 บล็อก ชื่อถูกตัด 9 บรรทัดห้องถูกตัด **16** ในบล็อกกว้าง 65px
- [x] 1.2 Record what the landscape export produces — dimensions, byte size, colours — on both pages. Verify it is unchanged at the end; nothing here is supposed to touch it.
      study 2784x1592 (408060 B) · exam 2048x1128 (347828 B)

## 2. Rotate the block text

- [x] 2.1 Put the block's content in a vertical writing mode with the name in one column and the time and room in the next (design.md decisions 1 and 2). Verify against the fixture that a two-hour and a three-hour block show their name whole, and that the time and room are still inside the block rather than pushed out of it.
- [x] 2.2 Recompute the line budget for the rotated axis: a line's length is now the block's height and the number of lines is its width. Verify no text overflows its block, by measuring `scrollHeight` against `clientHeight` on every block rather than by looking at a screenshot.
      งบจริง 57px : ที่ 13px ได้ 3 บรรทัด (ชื่อ 2 + meta 1) ชื่อยาวยังขาด
      ที่ 11px ได้ 4 บรรทัด (ชื่อ 3 + meta 1) — เลือก 11px ซึ่งอยู่ใน ramp อยู่แล้ว
- [x] 2.3 Verify Thai renders correctly rotated, using the fixture's Thai subject and its Thai room and building.
- [x] 2.4 Record how many blocks still clip and which they are (design.md decision 3). Verify a clipped block still shows its colour, its time and its position.
      ชื่อถูกตัด 13/19 แต่**ลักษณะการตัดเปลี่ยนไปคนละเรื่อง** : เดิมตัดกลางคำเหลือ
      6 ตัวอักษรต่อบรรทัด ตอนนี้ตัดที่ท้ายบรรทัดที่ 3 ของคำเต็ม
      บรรทัดเวลา/ห้องถูกตัด **16 -> 0**

## 3. The export header

- [x] 3.1 Add a header for the portrait exports that shows only the term, and use it in both (design.md decision 4). Verify no student ID, name, faculty, department or programme appears anywhere in the portrait image — searched in the DOM of the export sheet, not judged from a screenshot.
- [x] 3.2 Verify the landscape exports still use the on-screen headers unchanged, identity included.
- [x] 3.3 Verify the space the removed lines free is given to the grid rather than left as padding.

## 4. The download menu

- [x] 4.1 Rebuild the menu as format choice, options under the chosen format, one download button (design.md decision 5). Verify choosing landscape shows no portrait options and that the same button downloads both formats.
- [x] 4.2 Rename the switches to say what they are for and give each format a line of description. Verify the words describe a purpose rather than a mechanism.
- [x] 4.3 Verify the popover still does what `modal-customize-menu` established: Escape returns focus to the trigger, focus does not leave the menu, and an outside click closes it without pressing what is underneath.
- [x] 4.4 Update `e2e/fixtures.js` and `e2e/extension-fixtures.js` so every existing download test drives the new flow through one helper. Verify no test reaches past the helper into the menu's internals.

## 5. Verify

- [x] 5.1 Write a test for each new or restated scenario, titles verbatim: `One way to start a download`, `Subject names read as words`, `Room and section survive`, `A class too short to label`, `Nothing identifies the student`, `The term is still stated`, `The landscape export is unchanged`.
- [x] 5.2 Verify `Subject names read as words` by comparing the rendered name against the scraped name, not by asserting a character count — the point is that the whole name is present.
- [x] 5.3 Verify on the built extension that a portrait export contains a readable subject name, not merely that a PNG of the right size came out.
- [x] 5.4 Negative control: put the block text back to horizontal, confirm the readability tests fail and the rest stay green. Restore.
- [x] 5.5 Walk every remaining `image-export` scenario and both render capabilities, and verify nothing moved.
- [x] 5.6 Run `pnpm e2e` (both projects), `pnpm e2e:coverage`, the corpus sweep, `pnpm lint` and `pnpm build`.
- [x] 5.7 **Export a portrait image from the live registrar and look at it.** Every measurement here comes from a fixture; the finding that started this change came from a real account, and only the same route can confirm it is fixed. Verify this task is not marked complete on fixture evidence alone.

## 6. Record

- [x] 6.1 Record in `openspec/config.yaml` that block text in the portrait grid is rotated, and why: at 540px with seven day columns a horizontal line holds six characters, so the axis — not the type size — is the constraint. A future change that unrotates it will reintroduce the defect.
- [x] 6.2 Record that the portrait export deliberately carries no identifying details while the landscape one does, so the two headers are not "accidentally different" and get unified by someone tidying up.

## ผลการเดินล่าสุด

```
   pnpm e2e --project=preview     68 ผ่าน  58.8 วิ
   pnpm e2e --project=extension   14 ผ่าน  52.2 วิ
   corpus sweep 42 ไฟล์ threw 0 mangled 0 · lint สะอาด · build 1.28 MB
```

**ตัวเลขที่เปลี่ยน** (fixture mega 19 บล็อก)

```
                        ก่อน   หลัง
   บรรทัดเวลา/ห้องถูกตัด    16     0
   ชื่อวิชาถูกตัด           9     13
```

ชื่อ "ถูกตัด" มากขึ้นแต่**คนละเรื่องกัน** : เดิมตัดกลางคำเหลือ 6 ตัวอักษรต่อบรรทัด
ตอนนี้เป็นคำเต็มสามบรรทัดแล้วตัดที่ท้าย — ดู `/tmp/final-study.png` ของ fixture
`typical` (ภาคเรียนจริง) ซึ่งชื่อวิชาครบทุกอันและ meta ครบทุกอัน

**สองเรื่องที่แก้ artifact ระหว่าง apply**

- scenario `Room and section survive` เขียนไว้ก่อนวัด พอวัดจริงพบว่าบล็อกที่ซ้อนกัน
  สามชั้นได้ lane กว้าง ~21px ซึ่งใส่ได้อย่างเดียว **ชื่อวิชามาก่อน** จึงเติมเงื่อนไข
  ในตัว scenario และเพิ่ม `The name comes first when only one thing fits` แทนที่จะ
  ลดข้อกำหนดเงียบ ๆ ให้เทสต์ผ่าน
- radio ในเมนูต้องมี `aria-labelledby`/`aria-describedby` แยกกัน ไม่งั้นชื่อที่ AT อ่าน
  กลายเป็น "แนวนอน สำหรับดูบนคอมพิวเตอร์" ทั้งก้อน และอ้างถึงตัวเลือกด้วยชื่อไม่ได้

**negative control** : เอา `writing-mode: vertical-rl` ออก -> `Subject names read as
words` และ `Room and section survive` ตกทั้งคู่ ส่วน `Portrait study table` ยังเขียว
(มันตรวจว่ามีวิชาครบกับตำแหน่ง ไม่ได้ตรวจการอ่านออก) — คืนแล้วเขียวหมด

**ยังค้าง : task 5.7** ต้อง export จากหน้า reg จริงแล้วดูด้วยตา ทุกตัวเลขในนี้มาจาก
fixture แต่ปัญหาที่ทำให้เกิด change นี้มาจากบัญชีจริง

## 7. สิ่งที่เจอจากภาพจริง (task 5.7)

เจ้าของโปรเจกต์ export จากบัญชีจริง (2564/2) แล้วชี้สามจุด ทั้งหมดแก้ในรอบเดียวกัน

- [x] 7.1 ป้ายภาคเรียนย้ายไปชิดขวา — เดิมอยู่มุมซ้ายแล้วเหลือช่องว่างยาวกลางแถว
      และตาข้างซ้ายมีคอลัมน์เวลาอยู่แล้ว
- [x] 7.2 **วันที่ไม่มีเรียนถูกตัดออกจริงเมื่อเลือก "ตัดวันและเวลาที่ไม่มีเรียน"**
      กลับคำ `wallpaper-export` decision 6 ที่คงวันว่างกลางสัปดาห์ไว้แบบแคบ
      เหตุผลเดิมคือกลัวว่า จ.พ.ศ. จะอ่านเป็นเรียนสามวันติด — พอเห็นของจริงแล้ว
      เหตุผลนั้นไม่ยืน เพราะ**ชื่อวันอยู่บนหัวคอลัมน์ทุกคอลัมน์อยู่แล้ว** คนอ่านเห็น
      จ. พ. พฤ. ศ. ก็รู้ว่าข้ามอังคาร ส่วนคอลัมน์แคบที่ว่างเปล่ากลับดูเหมือนเส้นขีด
      ผลพลอยได้ : คอลัมน์ที่เหลือกว้างขึ้นจาก 108.8 เป็น 117.5px
      แก้ scenario `An unused day inside the week` ในสเปกตามไปด้วย
- [x] 7.3 เลื่อนตารางลง — แถบบน 22% -> 30% แถบล่าง 16% -> 8%
      **ความสูงของตารางเท่าเดิม (781 CSS) แค่ย้ายลง 101px** ไม่ได้เล็กลง
      นาฬิกาบน lock screen กินที่บนมากกว่าที่เผื่อไว้ ส่วนล่างมีแค่ปุ่มไฟฉาย/กล้อง
- [x] 7.4 `pngBands` ในเทสต์อ่านสัดส่วนแถบจาก `shared/exportCanvas.js` แทนที่จะฝัง
      0.2/0.14 ไว้ — ตอนย้ายแถบ เทสต์เดิมไปสุ่มสีในตารางแทนที่จะเป็นแถบ แล้วตก
      ด้วยเหตุผลที่ไม่เกี่ยวกับสิ่งที่มันตรวจ

```
   pnpm e2e --project=preview     68 ผ่าน
   pnpm e2e --project=extension   14 ผ่าน
   lint สะอาด · build 1.28 MB
```
