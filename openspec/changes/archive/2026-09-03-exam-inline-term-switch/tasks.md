# Tasks — exam-inline-term-switch

Reference: `proposal.md` (why a loading overlay cannot fix this), `specs/` (the behaviour now being committed to), `design.md` (the four decisions). Verification runs in the `preview/` harness and against the built extension in Chrome with registrar requests intercepted.

Ground rule: the study table is the most-exercised component in the project and this change touches it. Its spec walk must stay at full pass at every step, not just at the end.

## 1. Baseline

- [x] 1.1 Record what the old-design toggle shows today on **both** pages after a term or round change: switch, toggle, and read which term the legacy HTML actually describes. Verify it shows the boot-time term on both, so the defect is on record as pre-existing rather than introduced here.
- [x] 1.2 Record the current round-switch mechanism end to end — that clicking a round submits the form, the browser navigates, and the intercepted POST carries `mid_or_final`. Verify it passes now, so a later failure is attributable to this change.
      หลักฐานคือ extension walk ของ `revamp-exam-ui` : `navigation true, server ได้รับ
      mid_or_final=F` — การเดินครั้งนั้นคือที่ที่เจอบั๊ก `await tick()` ด้วย ไม่ได้เดินซ้ำ
      ตอน apply เพราะกลไกนั้นถูกถอดออกไปแล้ว การเดินใหม่จะวัดของที่ไม่มีอยู่

## 2. Switch rounds in place

- [x] 2.1 Give `ExamSchedule.svelte` the state the study table has: props read once as initial values, then owned `currentSchedule`, `currentData`, `switching` and `switchError`. Verify the page renders identically before any switching is wired.
- [x] 2.2 Add `selectRound()` calling `fetchExamTable()` with the same field values the form posts — including the empty `student_id` — then re-scrape and swap. Verify the schedule changes without the document unloading: no navigation event fires, and the same DOM node that held the sheet before the switch still holds it after.
- [x] 2.3 Wire the segmented control to `selectRound()` instead of submitting; keep the hidden `<form>` and its inputs in the DOM as the record of what the registrar expects (design.md decision 2). Verify the form is still present and still carries `year`, `semester` and an empty `student_id`.
- [x] 2.4 Remove the `await tick()` submit workaround and the comment describing it; it documents a mechanism that no longer exists. Verify nothing else depended on it.

## 3. Loading and failure

- [x] 3.1 Dim the sheet and show the dock's status line while a round is loading, reusing what `Controls.svelte` already provides. Verify a second choice is refused while one is in flight, and that the refusal is conveyed by more than colour.
- [x] 3.2 On a failed fetch, keep the round currently on screen, report the failure in the dock's status slot, and return the segmented control to the round actually displayed — not the one clicked. Verify by making the fetch fail and confirming the page still shows a schedule, never a blank sheet.

## 4. The old-design toggle follows the displayed term

- [x] 4.1 Update the stored original HTML on every successful exam round fetch; verify that switching round and then toggling shows the round now displayed.
- [x] 4.2 Do the same in `StudyTable.svelte` for year/semester; verify that switching term and then toggling shows the term now displayed, closing the pre-existing defect recorded in 1.1.
- [x] 4.3 Verify the toggle still works with no switching at all on both pages — the boot-time HTML is still what shows when nothing has been fetched.

## 5. Verify

- [x] 5.1 Walk every scenario in the two spec deltas: switching without reload, the loading state, the failure path, the toggle after switching, and the toggle without switching. Verify each on both pages where it applies.
- [x] 5.2 Add the new scenarios to the standing spec walk so they are checked on every future change. Verify the walk fails if the old-design HTML stops tracking the displayed term.
      ไม่มี standing walk อยู่จริง — ที่ผ่านมาเป็น script ชั่วคราวใน scratchpad ทุกครั้ง
      จึงสร้าง `preview/walk.mjs` (`pnpm walk`, 13 scenario) และย้าย extension walk มาเป็น
      `preview/extwalk.mjs` (`pnpm walk:ext`, 16 scenario) ดู design.md decision 6
      negative control : ถอด `currentOldHtml = page.body.innerHTML` ออกทั้งสองหน้า
      แล้ว walk ตก 2 scenario ("แบบเดิมตามรอบ/เทอมที่กำลังดูอยู่") ใส่กลับแล้วผ่าน 13/13
- [x] 5.3 Walk every remaining `exam-schedule-render` and `study-table-render` scenario and verify nothing else moved: grouping, ordering, `ไม่ทราบ`, `จัดสอบเอง`, the `A/B` merge, the grid's edges and overlaps, the empty state.
- [x] 5.4 Verify the PNG export is unaffected on both pages — same capture frame, controls still excluded, the round still shown as static text.
- [x] 5.5 Run the corpus sweep, `pnpm lint` and `pnpm build`.
- [x] 5.6 Walk the built extension in Chrome with registrar requests intercepted: switch rounds and confirm **no navigation occurs** and the intercepted request carries the chosen round. Verify no console errors.

## 6. Record

- [x] 6.1 Replace the `openspec/config.yaml` note about the round switcher: the `await tick()` before `form.submit()` describes a mechanism being removed, and leaving it would send the next reader down a path that no longer exists. Verify the replacement states the current one — an in-page fetch, with the form kept as the record of the registrar's field names.
- [x] 6.2 Record that `refactor-exam-ui` design decision 4 deferred this with a reason that expired — verification without a live session — and that the harness built since is what made it possible. Verify a reader can follow the thread from that deferral to here.
- [x] 6.3 **Ask the project owner to confirm the flicker is gone on the live page.** It cannot be measured locally, because the fixture answers with no network round trip; the harness verifies everything except the symptom that started this. Verify this task is not marked complete on local evidence alone.
      เจ้าของโปรเจกต์ยืนยันบนหน้าจริงแล้ว : "ไม่กระพริบแล้ว" — ปิดด้วยหลักฐานจากหน้าจริง
      ไม่ใช่จาก harness ตามที่ task กำหนด

## ผลการเดินล่าสุด

- `pnpm walk` — 13/13 ผ่าน
- `pnpm walk:ext` — 16/16 ผ่าน (สลับรอบ : `navigation false`, `mid_or_final=F`,
  `student_id=` ว่างตามเดิม, "แบบเดิม" ให้ `F`)
- corpus sweep — 40 ไฟล์, threw 0, mangled 0, fixtureGaps 0
- `pnpm lint` สะอาด, `pnpm build` ผ่าน (1.27 MB)
