# Tasks — adopt-e2e-suite

Reference: `proposal.md` (the 29/45 count), `design.md` (the seven decisions). No spec deltas — `skip_specs: true`, because all 45 scenarios already exist and none of their behaviour changes.

Ground rule from design.md decision 4: the translation must not weaken an assertion. "The new test passes" is not evidence that it checks what the old one checked — compare them.

## 1. Baseline

- [x] 1.1 Record the exact assertion each of the 33 existing checks makes, keyed to the scenario it belongs to. Verify the list accounts for every `check(` in `preview/walk.mjs` and every `rec(` in `preview/extwalk.mjs`, so nothing is dropped by being forgotten rather than by being decided.
- [x] 1.2 Record the current pass state of both walks and the wall-clock each takes. Verify the numbers, so a later slowdown or silent gap is attributable.

## 2. The runner

- [x] 2.1 Replace `playwright` with `@playwright/test` and add `playwright.config.js` with the `preview` and `extension` projects (design.md decision 1). Verify both projects can run an empty placeholder test and that the browsers already installed are reused rather than re-downloaded.
- [x] 2.2 Move the preview server startup into a Playwright fixture (or `webServer`), replacing the hand-rolled spawn and fetch-poll in `walk.mjs`. Verify a port conflict fails with a clear message rather than the 30-second timeout the old probe produced.
- [x] 2.3 Move the extension launch — persistent context, `--load-extension`, the registrar route table — into a fixture shared by the extension project. Verify the fixture refuses to run with a stale or missing `.output/chrome-mv3` rather than testing yesterday's build.
- [x] 2.4 Verify a deliberately thrown error in one test leaves every other test's result reported. This is the failure mode that started the change; confirm it is gone rather than assuming the runner handles it.

## 3. Translate what exists (29 scenarios)

One file per capability, test title verbatim from `#### Scenario:` (design.md decision 2).

- [x] 3.1 `e2e/exam-schedule-render.spec.js` — the 9 covered scenarios. Verify each against its 1.1 entry: same condition, no assertion loosened to make the move easy.
- [x] 3.2 `e2e/study-table-render.spec.js` — the 13 covered scenarios. Verify the same way, and verify the U+00A0 normalisation survives: several of these compare header text where the registrar separates label from value with a non-breaking space.
- [x] 3.3 `e2e/study-table-navigation.spec.js` — the 3 covered scenarios.
- [x] 3.4 `e2e/image-export.spec.js` — the 3 covered scenarios.
- [x] 3.5 `e2e/theme-customize.spec.js` — the 1 covered scenario.
- [x] 3.6 `e2e/extension.spec.js` — the extension-only checks that map to no scenario: manifest and icons, content-script injection on the real URL, `boot.js` replacing the page, Prompt font loading, and both directions of the registrar CSS bleed. Verify these are recognisably the same assertions, including the computed-style values the bleed checks depend on.
- [x] 3.7 Verify the full suite passes and that the count of scenarios covered is 29 — the same as before, no more. Anything higher means a scenario was claimed rather than tested.

## 4. The 16 that were never walked

- [x] 4.1 `exam-schedule-render` / **Self-arranged exam** — the registrar writes `จัดสอบเอง` in the date field and the entry must render with `ไม่ทราบ` in date and time and still appear. Verify against the fixture's own self-arranged rows rather than against the generic `ไม่ทราบ` already asserted elsewhere.
- [x] 4.2 `study-table-render` / **Neither list can be read** — no picker is presented at all and the table stays usable. Verify by making the term selector unreadable, and verify the grid still renders.
- [x] 4.3 `study-table-navigation` / **Options unavailable** — the term selector page fails to load. Verify the picker is absent and the displayed table is unaffected, and that this is distinguishable from 4.2 in what the student sees.
- [x] 4.4 `study-table-navigation` / **Fetch failure during switch** — `?fail=study` exists and has never been used. Verify the previous term stays on screen, the dock reports the failure, and the picker returns to the term actually displayed.
- [x] 4.5 `study-table-navigation` / **Past term contains Thai subject names** — the committed fixture has no Thai subject name; every subject in it is English. Add one to `study-table-mega.html` in the same fabricated style as its other edge cases and verify it renders and is not mangled. This is a fixture change; verify the corpus sweep still reports no mangling.
- [x] 4.6 `study-table-navigation` / **Download after switching terms** — verify the PNG export works after a term switch and captures the term now displayed, not the boot-time one.
- [x] 4.7 `image-export` / **Exam term selector during capture** — `ExamHeader` swaps the segmented control for static text while `downloading`. The branch exists with a comment citing this scenario and has never been asserted. Verify the control is absent and the round is present as text during capture, and that it returns afterwards.
- [x] 4.8 `theme-customize` / **Initial coloring** — verify subjects get their assigned colours from the theme rather than merely having some background colour set.
- [x] 4.9 `theme-customize` / **Customize a subject color** — verify choosing a colour changes that subject's blocks and no others.
- [x] 4.10 `theme-customize` / **Reset theme** — verify reset returns every block and the header to the default.
- [x] 4.11 `theme-customize` / **Switch term after customizing** — verify what the spec says happens to a customised theme when the term changes; the answer is in the scenario, not in the current code's behaviour.
- [x] 4.12 `theme-customize` / **Clicking outside closes the menu** — verify the menu closes and focus lands where the scenario says.
      เทสต์เขียนแล้วและ**ตก** เพราะโค้ดไม่ตรงสเปก : เปิดเมนู คลิกปุ่ม "แบบเดิม" ->
      เมนูปิด **และปุ่มทำงานด้วย** (`legacyShown: true, toggleLabel: "แบบใหม่"`)
      ทำตาม design decision 6 — ไม่แก้ทั้งสเปกและโค้ดเอง หยุดถามเจ้าของโปรเจกต์
      เจ้าของเลือกให้แก้โค้ด จึงแยกเป็น change `modal-customize-menu` ซึ่ง apply แล้ว
      **task นี้ปิดได้เพราะ change นั้น ไม่ใช่เพราะมันเขียวมาตั้งแต่ต้น**
- [x] 4.13 `theme-customize` / **Keyboard reaches the menu contents** — keyboard only, no mouse. Verify every interactive element inside the menu is reachable and operable.
- [x] 4.14 `theme-customize` / **Menu state is announced** — verify the trigger's expanded state and the dialog's role and label are what an assistive technology would read, not merely that some attribute exists.
- [x] 4.15 `theme-customize` / **Choosing a term without a mouse** — verify a term can be selected end to end from the keyboard, including that the chosen term is applied.
- [x] 4.16 `theme-customize` / **Pickers are unavailable while a term is loading** — verify on the study table, using `?slow=`, that both pickers refuse input while a fetch is in flight and that the refusal is conveyed by more than colour.

**If any of 4.8–4.16 fails, stop and follow design.md decision 6.** Do not edit the scenario to match the code.

## 5. Coverage

- [x] 5.1 Write `e2e/coverage.mjs`: parse `#### Scenario:` from `openspec/specs/*/spec.md`, read test titles from the matching spec file, exit non-zero listing any scenario without a test (design.md decision 3). Verify it keys on (capability, title) — "Normal page load" and "Toggle old design" each appear in two capabilities.
- [x] 5.2 Verify it reports 45/45 and exits zero, and that deleting one test makes it name that scenario and exit non-zero.
- [x] 5.3 Verify it does **not** fail on a test with no matching scenario, using `extension.spec.js` as the live example.
- [x] 5.4 Wire `pnpm e2e` and `pnpm e2e:coverage`. Verify `e2e:coverage` runs without launching a browser, so it still answers when the suite is red.

## 6. Remove the old and verify the whole

- [x] 6.1 Delete `preview/walk.mjs` and `preview/extwalk.mjs` and their package scripts (design.md decision 4). Verify nothing else references them — `openspec/config.yaml` and archived change documents mention them by name and need updating or, for archived ones, leaving as the historical record they are.
- [x] 6.2 Run negative controls (design.md decision 5) on a representative test from each capability: break the behaviour, confirm that specific test fails for the stated reason, restore. Verify each one failed on its assertion and not on a timeout somewhere unrelated.
- [x] 6.3 Verify `--grep` runs a single capability's file and that a trace is produced for a failing test and can be opened.
- [x] 6.4 Run the corpus sweep, `pnpm lint`, `pnpm build`, `pnpm e2e` (both projects) and `pnpm e2e:coverage`.
- [x] 6.5 Record the wall-clock of each project against the 1.2 baseline. Verify the fast loop is still a fast loop.

## 7. Record

- [x] 7.1 Rewrite the verification section of `openspec/config.yaml`: a runner is used now, the suite lives in `e2e/`, one file per capability and one test per scenario with titles matching verbatim, and `pnpm e2e:coverage` must be green before a change is archived. Verify the note states the size that changed the answer (13 assertions when the old rule was written, ~49 now).
- [x] 7.2 Record that there is deliberately no coverage exception list, and why an allowlist would end the check's usefulness. Verify a reader tempted to add one finds the reason before they do.
- [x] 7.3 Record the harness affordances (`?fail=`, `?slow=`, `?header=broken`, `?term=`) as part of the suite's contract rather than preview trivia, since the loading, failure and unreadable-term scenarios cannot be reached without them.

## ผลการเดินล่าสุด

```
   pnpm e2e --project=preview     45 ผ่าน        34.8 วิ   (baseline: walk 19/19, 35.0 วิ)
   pnpm e2e --project=extension   12 ผ่าน        45.7 วิ   (baseline: walk:ext 17/17, 21.2 วิ)
   pnpm e2e:coverage              45/45 scenario มีเทสต์
   corpus sweep                   41 ไฟล์ threw 0 mangled 0
   pnpm lint                      สะอาด
   pnpm build                     1.27 MB
```

- ตอน apply จบใหม่ ๆ มี 1 อันตกคือ **Clicking outside closes the menu** ซึ่งเป็น defect จริง
  ปิดด้วย change `modal-customize-menu` ตอนนี้เขียวครบ ดู task 4.12
- project extension ช้ากว่า baseline (45.7 vs 21.2 วิ) เพราะเดิมเป็น script เดียวเปิดหน้าเดียว
  เดินยาว ตอนนี้ 12 test แยกกัน เปิดหน้าใหม่ทุกครั้ง — แลกความช้ามากับการที่ test หนึ่งตก
  ไม่ทำให้อีก 11 อันหายไป และลูปเร็วอยู่ที่ `--project=preview` ตามที่ design ตั้งใจ
- negative control 5 อัน (หนึ่งต่อ capability) ตกที่ assertion ของตัวเองทุกอัน ไม่มีอันไหนตกด้วย timeout
  ถอด `currentOldHtml` / คืน `split("   ")` / ถอดการคืน picker ตอน fetch พัง /
  ปิด branch `{#if downloading}` / ถอดการคืนสีหัวตารางตอน reset
- coverage checker ตรวจสองทาง : เปลี่ยนชื่อ test หนึ่งอัน -> 44/45 exit 1 ; คืนแล้ว -> 45/45 exit 0
  และ `e2e/extension.spec.js` ที่ไม่มี scenario รองรับ ไม่ทำให้ตก
