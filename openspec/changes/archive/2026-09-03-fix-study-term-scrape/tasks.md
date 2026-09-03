# Tasks — fix-study-term-scrape

Reference: `proposal.md` (the measurements), `specs/study-table-render/spec.md` (what is being committed to), `design.md` (the five decisions). Verification is `pnpm walk`, `pnpm walk:ext`, and the corpus sweep at `preview/sweep.html`.

Ground rule: the study table is the most-exercised component in the project. `pnpm walk` must stay at full pass at every step, not only at the end.

## 1. Baseline

- [x] 1.1 Record the defect as it stands: on the preview study page, read the header's term and the picker's year side by side and confirm they disagree. Verify the same disagreement appears in `pnpm walk:ext` output, so the fix has two independent witnesses.
- [x] 1.2 Record what `getinfo` returns today for all 12 study pages in the corpus — specifically that `year`, `major` and `studentName` are the empty string on every one. Verify by running the real scraper over the corpus, not by reading the code.

## 2. Separate the columns

- [x] 2.1 Change `splitColumns` to split on `/\s{2,}/` (design.md decision 1). Verify against the corpus that every study page now yields a non-empty `year`, `major` and `studentName`, and that no field that used to hold one value has come apart into two.
- [x] 2.2 Run the corpus sweep over all 40 pages. Verify nothing threw, nothing is mangled, and the exam pages are unaffected — they do not go through this function.

## 3. The picker tells the truth

- [x] 3.1 Derive the picker's year and semester from the separated fields, and treat "cannot be determined" as its own state instead of falling back to `years[0]` / `semesters[0]` (design.md decision 4). Verify the picker shows the term the header shows, on a page from each of the four years in the corpus.
      แก้ขอบเขตการตรวจตามของที่มีจริง : fixture ที่ commit ไว้มีปีเดียว walk จึงตรวจ
      2566 (fixture) กับ 2565 (`?term=3/2565`) ส่วนอีกสองปีตรวจที่ต้นทางแทน — รัน
      `getinfo` จริงเหนือ corpus ทั้ง 12 หน้า (2564-2567) ครบทุกปี ดูผลด้านล่าง
- [x] 3.2 Hold `appliedYear` / `appliedSemester` empty until a term is actually known. Verify that a failed fetch cannot restore a term that was never displayed.
- [x] 3.3 Show a placeholder rather than a number when a field is unknown, and issue no fetch until both are chosen. Verify by serving a header the scraper cannot read and confirming the picker names no term, the grid still renders, and choosing one field alone fetches nothing.
- [x] 3.4 Verify that changing only the semester keeps the year on screen — the scenario that sent a student looking at 2565 to 2567.

## 4. ภาคฤดูร้อน

- [x] 4.1 Capture `report_studytable.php` into the corpus and record whether it carries a semester list. Verify the captured page is redacted to the same standard as the committed fixtures if it is committed at all.
      ไม่ต้องเก็บใหม่ : `preview/capture.js` เก็บหน้านี้เป็นหน้าแรกอยู่แล้วทุกครั้ง
      `preview/public/corpus/term-selector.html` มีอยู่ตั้งแต่ต้น — ผมพลาดเองตอน grep
      เฉพาะ `study-table-*` แล้วสรุปว่าไม่มี
      มันมี `select#semester` จริง และเสนอแค่ **2, 1** ไม่มีภาคฤดูร้อน
      ตรวจ PII แล้วไม่มีเลย (ไม่มีเลขติดกัน 5 หลักขึ้นไป ไม่มีชื่อ) จึง commit เป็น
      `preview/public/fixtures/term-selector.html` แบบ byte ตรงกัน ไม่ต้อง redact
- [x] 4.2 Source the semester list from that page when it offers one, falling back to `1`, `2`, `3` (design.md decision 3). Verify the fallback branch is the one recorded in design.md as actually in force.
      **เปลี่ยนตามหลักฐานจาก 4.1** : ไม่มีรายการสำรองแล้ว อ่านจาก reg อย่างเดียว
      ขาดลิสต์ไหนก็ซ่อน picker (design.md decision 3 ที่เขียนใหม่)
- [x] 4.3 Verify ภาคฤดูร้อน appears in the list, loads when chosen, and that arriving on a summer term shows that term in the picker rather than another one.
      **เปลี่ยนตามหลักฐาน** : reg ไม่เสนอภาคฤดูร้อน จึงไม่เสนอเหมือนกัน — และหน้าภาค 3
      ทั้งสี่ปีใน corpus ว่างหมด บัญชีนี้ไม่เคยลงเรียนภาคฤดูร้อน
      ที่ยังตรวจ : เปิดมาบนภาค 3 (`?term=3/2565`) picker ต้องบอก "ภาคเรียนที่ 3" ตามหน้า
      ทั้งที่ไม่มีในลิสต์ ซึ่งคือ decision 4 ทำงาน

## 5. Header presentation

- [x] 5.1 Verify the header now reads `คณะ… · ภาควิชา… · สาขาวิชา…` with the design system's separator, and that the term pill and identity line no longer carry the registrar's padding (design.md decision 5).
- [x] 5.2 Update any walk assertion that matched the old spacing. Verify the assertion now describes the intended output rather than being loosened until it passes.

## 6. Verify

- [x] 6.1 Walk every scenario in the spec delta. Verify each on a page from more than one year, since the defect was invisible on exactly one of them.
- [x] 6.2 Add the new scenarios to `pnpm walk`. Verify the walk fails when `splitColumns` is reverted, and fails when the picker's fallback is restored — two separate negative controls, because the requirement covers both.
- [x] 6.3 Walk every remaining `study-table-render` scenario and verify nothing else moved: the grid, Thai and English day names, the empty state, the header lines, the old-design toggle before and after switching.
- [x] 6.4 Verify the PNG export is unaffected: same capture frame, dock still excluded, the header rendered as static text.
- [x] 6.5 Run `pnpm walk`, `pnpm walk:ext`, the corpus sweep, `pnpm lint` and `pnpm build`.

## 7. Record

- [x] 7.1 Add to `openspec/config.yaml` that the registrar separates header columns with runs of `&nbsp;` and labels from values with a single one, and that scraping must not depend on an exact count. Verify a reader who has never seen this defect would not reintroduce it.
- [x] 7.2 Record that the picker must never present a term it cannot confirm. Verify the note says why — the fallback is what let a wrong year ship unnoticed and poison every switch after it.

## ผลการเดินล่าสุด

- `pnpm walk` — 19/19 ผ่าน (เดิม 13 เพิ่มมา 6 scenario)
- `pnpm walk:ext` — 17/17 ผ่าน (เพิ่ม "picker ตรงกับหัวตารางบน extension จริง")
  ทั้งสอง walk เสิร์ฟ `term-selector.html` ตัวจริงแล้ว ไม่ใช่ลิสต์ที่ stub แต่งเอง
- negative control : คืน `split("   ")` -> ตก 5 scenario ; คืน fallback ของ picker -> ตก 2 scenario
- `getinfo` เหนือ corpus 12 หน้า : ฟิลด์ว่าง 12/12 หน้า -> 0/12 หน้า
- corpus sweep — 40 ไฟล์, threw 0, mangled 0, fixtureGaps 0
- `pnpm lint` สะอาด, `pnpm build` ผ่าน (1.27 MB)
