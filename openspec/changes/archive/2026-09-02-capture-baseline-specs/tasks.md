# Tasks: capture-baseline-specs

## 1. Verify captured behavior against the live site (Orca browser)

- [x] 1.1 Via the Orca embedded browser on the logged-in registrar session, open `report_examtable_show.php` (mid and final where available), record the real table structure (column order, date/time text formats, duplicate-row behavior, charset), and correct `specs/exam-schedule-render/spec.md` where observation differs from the drafted requirements.
  - Verified 2566/1 M+F and 2567/2 F. Columns: order|code|name|sec|credit|type|date|time|room. **Major correction found:** short date years are GREGORIAN ("พ. 8 พ.ย. 23" = 2023), not Buddhist — spec requirement rewritten, and the `gregorianYear` helper in `src/content/examSchedule.js` corrected (uncommitted prior fix had it backwards; would have produced year 1980). Also observed "จัดสอบเอง" in the date field → new scenario added. Duplicate-order rows (ทฤษฎี/ปฏิบัติ) confirmed. Charset windows-874 confirmed.
- [x] 1.2 Re-verify the study table page structure (`report_studytable_show.php`) for at least two terms and confirm `specs/study-table-render/spec.md` scenarios (Thai/English day names, sparse page, header fields) match reality; amend the spec where they do not.
  - Verified 2565/1, 2566/1, 2566/2: `tbody[1]` header childNode indexes 6/10/14/18 all correct, subject rows have exactly 37 childNodes. Thai day names observed; English variant not reachable in this session (site language is session-bound) — handled by code, noted as unobserved. Sparse-page shape observed earlier (empty POST → header-only table). No spec amendments needed.

## 2. Reconcile with the running extension

- [x] 2.1 Walk each drafted scenario against the current extension build (loaded unpacked) and mark any scenario the current code does NOT actually satisfy; either soften it to observed behavior or flag it to the user as a gap decision — specs must describe verified current behavior, not aspirations.
  - Code-walk of every scenario: all are implemented by current code. Live-verified by the user: study table render, year/semester switch, empty state, theme colors. **Pending live confirmation (flagged, not spec gaps):** exam page render after the year-parse correction, PNG download since the snapdom swap, customize menu + Reset Theme since the makeTheme signature change. These are verification debts carried into the refactor change's live walks, not behavior gaps.

## 3. Project context

- [x] 3.1 Populate `openspec/config.yaml` `context` with verified project facts (Svelte 5 + Vite MV3 extension, pnpm, oxlint/anti-slop, windows-874 encoding rule, scraping conventions, registrar endpoints); verify `openspec validate capture-baseline-specs` passes.
