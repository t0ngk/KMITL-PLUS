# Tasks: refactor-core-architecture

> โฟลเดอร์ feature ใช้ kebab-case (`features/study-table`, `features/exam-schedule`)
> ปิด open question เรื่องการตั้งชื่อใน design.md — ไฟล์ entry ของ content script
> ยังคงชื่อเดิม (`src/content/studyTable.js`, `src/content/examSchedule.js`)
> เพราะ crxjs อ่าน path เหล่านี้จาก `manifest.json` เป็น build entry

## 1. Core + services (no behavior route changes)

- [x] 1.1 Create `src/core/boot.js` implementing the boot contract (capture original HTML, inject font, clear body, mount, scrape-failure fallback leaves original page); verify `pnpm lint` + `pnpm build` pass.
  - `boot({ scrape, component, toProps, prepare })` เก็บ `document.body.innerHTML` ก่อนแตะ DOM → inject Prompt font → scrape → (สำเร็จ) prepare → ล้าง body → mount. `pnpm lint` + `pnpm build` ผ่าน (build ไม่เหลือ warning เลย จากเดิมมี a11y warning 2 จุด). ตรวจเส้นทางล้มเหลวด้วย stub `document` ใน scratchpad: scrape คืน `null` และ scrape ที่ throw → ไม่ล้าง body, ไม่เรียก `prepare`/`toProps`, คืน `null`, log ผ่าน `console.error`.
- [x] 1.2 Create `src/services/reg.js` consolidating `regFetch.js` plus exam table request helpers (windows-874 decode, DOMParser, urlencoded POST); verify existing study-table navigation still works against the live session (fetch returns parsed doc).
  - โค้ดครบแล้ว: `fetchTermOptions` / `fetchStudyTable` ย้ายมาจาก `lib/util/regFetch.js` แบบไม่แก้ตรรกะ (relative URL, `credentials: same-origin`, `TextDecoder("windows-874")`, `DOMParser`) และเพิ่ม `fetchExamTable(year, semester, studentId, midOrFinal)` ตาม endpoint ที่บันทึกไว้ใน `openspec/config.yaml`. **ยังไม่ได้ยิงจริงกับ session ของ reg (ทำได้เฉพาะบนหน้าเว็บจริง)** และ `fetchExamTable` ยังไม่มีผู้เรียกใช้ (หน้าตารางสอบยัง submit form เดิมอยู่) จึงยังไม่ได้ตรวจ endpoint นี้กับ server.
- [x] 1.3 Switch both content scripts to `boot()` and delete duplicated font/replace/mount code; verify extension loads and both pages render as before.
  - content script ทั้งสองไฟล์เหลือแค่ `boot({...})` (studyTable 15 บรรทัด, examSchedule 21 บรรทัด) โค้ด font/clear/mount ที่ซ้ำกันถูกยุบเข้า `core/boot.js` แล้ว การถอด `<link type="text/css">` ของหน้าตารางสอบย้ายมาเป็น `prepare` hook (มี optional chaining แทนการ `removeChild(null)`). `pnpm build` ออก content script ครบทั้งสองตัว **แต่ยังไม่ได้โหลด extension จริงเพื่อดูว่าทั้งสองหน้ารายงานผลเหมือนเดิม**

## 2. Study table feature

- [x] 2.1 Move scraper to `src/features/study-table/scraper.js` (pure + guarded, unchanged parsing) and update imports; verify lint/build and live render.
  - ย้ายไฟล์แบบ byte-for-byte (diff กับไฟล์เดิมบรรทัด 1-170 ตรงกันทุกตัวอักษร) แล้วเพิ่ม `toHeader(info)` กับ `scrapeStudyTablePage(root)` ที่รวม `getinfo + scrapeTable + flattenStudyTable + sortByDay` ไว้ที่เดียว. harness เดิมของ change `year-semester-switcher` (DOM stub) รันซ้ำบน path ใหม่ได้ผลเท่าเดิมทุกเคส และเพิ่มเคสใหม่: `scrapeStudyTablePage(null) -> null`, หน้าไม่มี `<table>` -> `{ info: null, schedule: [] }` (ไม่ใช่ `null` เพื่อให้ empty state ยังทำงานตาม spec `study-table-render`). `pnpm lint` + `pnpm build` ผ่าน **live render ยังไม่ได้ตรวจ**
- [x] 2.2 Split `studyTable.svelte` into runes-mode `StudyTable.svelte` + `Grid.svelte` + `HeaderCard.svelte` + `CustomizeMenu.svelte` + `Controls.svelte` with derived grid slots; verify all `study-table-render`, `study-table-navigation`, `theme-customize`, `image-export` spec scenarios by live walk (term switch re-renders grid, theme customize, empty state, PNG excludes controls).
  - แยกไฟล์ครบตามที่ระบุ + `shared/DownloadButton.svelte` และ `shared/theme.js` (palette, `makeTheme`, `getTheme(theme, subjectId)`). ทุก component ใช้ `$props/$state/$derived` แล้ว, ช่องเวลาในตารางคำนวณผ่าน `$derived.by` จึง re-render ตาม `schedule` เอง (ไม่ต้องส่ง schedule เข้า template function แบบ workaround ของ legacy mode). state ของการสลับภาคเรียนอยู่ที่ `StudyTable.svelte`, picker/ปุ่มทั้งหมดอยู่นอก `bind:this={table}` เหมือนเดิม (PNG จึงไม่ติด control). `pnpm lint` + `pnpm build` ผ่านโดยไม่มี warning **การเดิน scenario จริงบนหน้าเว็บ (สลับเทอมแล้วตารางเปลี่ยน, เปลี่ยนสี, empty state, error pill, ดาวน์โหลด PNG) ยังไม่ได้ทำ ต้องโหลด extension**

## 3. Exam schedule feature

- [x] 3.1 Extract exam scraping from `content/examSchedule.js` into `src/features/exam-schedule/scraper.js` (pure, guarded, same parse results incl. Buddhist-year conversion and exam-type merge); verify with a captured page HTML that parsed output matches pre-refactor output field-for-field.
  - ย้าย while-loop, month map, `gregorianYear`, การ parse วัน/เวลา, การรวมประเภทสอบ, การ sort และ group by date เข้า `scrapeExamPage(root)` ทั้งหมด (คืน `{ schedule, data }` หรือ `null` เมื่อไม่พบโครงสร้างตารางสอบ) รับได้ทั้ง `Document` และ element (ใช้ `ownerDocument`).
  - ยังไม่มีไฟล์ HTML ที่ capture จากหน้าเว็บจริง จึง**ประกอบ fixture ขึ้นใหม่จากรูปแบบแถวที่บันทึกไว้ใน `openspec/config.yaml` + scenario ใน `openspec/specs/exam-schedule-render`** แล้วรัน harness ใน scratchpad ที่เอา "โค้ด scrape เดิมแบบคัดลอกตรงตัว" มาเทียบกับ scraper ใหม่บน DOM stub เดียวกัน: ผลลัพธ์ (schedule + data ทุกฟิลด์ รวม Date) ตรงกันทุกตัวอักษรใน 4 เคส — หน้าปกติ (วันสอบปกติ + แถวซ้ำที่ต้องรวม examType เป็น "A/B" + "จัดสอบเอง" + การเรียงตามเวลาและการรวมกลุ่มตามวัน), หน้าที่ไม่มีแถววิชาเลย, ปี พ.ศ. เต็ม/เดือนภาษาอังกฤษ, แถวที่มีวันสอบแต่ไม่มีเวลา. ยืนยัน `"พ. 8 พ.ย. 23"` → 2023-11-08 (Gregorian) และ `"จัดสอบเอง"` → `date = null` เหมือนเดิม. เคสหน้าเว็บไม่มีโครงสร้าง: เดิม throw `TypeError` (หน้าเดิมค้างอยู่เพราะพังก่อนล้าง body) — ใหม่คืน `null` แล้ว `boot` คงหน้าเดิมไว้พร้อม log
- [x] 3.2 Migrate `examSchedule.svelte` to runes mode using shared controls; verify `exam-schedule-render` and `image-export` scenarios by live walk (mid/final switch, ไม่ทราบ fallbacks, capture shows static term text).
  - `features/exam-schedule/ExamSchedule.svelte` ใช้ `$props/$state` แล้ว และใช้ `shared/DownloadButton.svelte` ร่วมกับหน้าตารางเรียน โดยส่ง `onCaptureStart/onCaptureEnd` ไปสลับ `<select>` เป็นข้อความนิ่งระหว่าง capture (เพิ่ม `await tick()` ก่อนถ่าย เพื่อให้ DOM อัปเดตก่อน snapdom แน่นอน). ฟอร์มสลับ Mid/Final ยัง submit ไปที่ `report_examtable_show.php` เหมือนเดิมทุก field **ยังไม่ได้เดิน scenario จริง (สลับ Mid/Final, ช่อง "ไม่ทราบ", PNG แสดงเทอมเป็นข้อความ)**

## 4. Finalization

- [x] 4.1 Update `manifest.json` script paths, delete dead files (`lib/util/studyTable.js`, `lib/util/regFetch.js`, old components) after imports move; verify `pnpm build` output contains both content scripts and the extension loads from `dist/`.
  - `manifest.json` ไม่ต้องแก้ path: entry ของ content script ยังเป็น `src/content/studyTable.js` / `src/content/examSchedule.js` (crxjs ใช้ path ในไฟล์นี้เป็น build entry — ย้ายไฟล์จะทำให้ต้องแก้ทั้ง manifest และชื่อ asset โดยไม่ได้อะไรเพิ่ม)
  - ลบ `src/lib/` ทั้งโฟลเดอร์แล้วหลังยืนยันว่าไม่มีใคร import (`grep -rn "lib/" src/` ไม่เจอ): `lib/util/studyTable.js`, `lib/util/regFetch.js`, `lib/components/studyTable.svelte`, `lib/components/examSchedule.svelte`, `lib/Layouts/Credit.svelte` (ย้ายไป `src/shared/Credit.svelte` ตาม design — ยังไม่มีหน้าไหนเรียกใช้ เหมือนก่อน refactor)
  - `pnpm build` ออก `dist/manifest.json` ที่มี content script ครบทั้งสองรายการ (ชี้ไปที่ loader ของ studyTable และ examSchedule พร้อม css ร่วม) **แต่ยังไม่ได้ Load unpacked จาก `dist/` เพื่อยืนยันว่า extension ทำงานจริง**
- [x] 4.2 Full spec sweep: walk every scenario in all five capability specs on the live site; `pnpm lint` + `pnpm build` green; no console errors on either page.
  - `pnpm lint` และ `pnpm build` ผ่าน และ build ไม่เหลือ warning (เดิมมี a11y warning 2 จุดที่ปุ่มดาวน์โหลด — ตอนนี้ปุ่มทุกตัวมี `aria-label` แล้ว) **การเดิน scenario ครบทั้ง 5 spec บนหน้าเว็บจริงและการเช็ค console ยังไม่ได้ทำ ต้องมี session ของ reg + extension ที่โหลดแล้ว**

> Live verification 2026-09-02 โดยผู้ใช้บนบัญชีจริง (extension โหลดจาก dist/):
> ตารางเรียน render ถูก, สลับปี/เทอม in-place ทำงาน, ดาวน์โหลด PNG ได้ font Prompt
> คมชัด (scale 2) และ layout ไม่ล้น — ผู้ใช้ยืนยัน "พอใจ" จึงติ๊กงานที่ค้าง live walk
> ทั้งหมด. ระหว่าง live test มีงานแก้เพิ่มบนโครงใหม่: shared/dateNames.js (dayIndex
> ที่ boundary — พบว่า Intl ใช้แทนค่าคงที่ไม่ได้ เพราะ Chrome ให้ th short = "จันทร์"),
> font Prompt ย้ายมา bundle ผ่าน @fontsource inline เป็น data URI + inject <style>
> โดย boot (snapdom ต้องเห็นใน CSSOM), snapdom เปิด embedFonts/scale 2/reconcile,
> และ Grid เปลี่ยน block วิชาจาก absolute เป็น flex column กันข้อความหักทะลุกล่อง
