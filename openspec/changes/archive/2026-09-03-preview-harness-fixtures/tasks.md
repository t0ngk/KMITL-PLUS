# Tasks — preview-harness-fixtures

Reference: `proposal.md` (scope), `design.md` (how), `openspec/specs/{study-table-render,exam-schedule-render}/spec.md` (the scenarios the fixture set must cover). No test framework — verification is running the preview and looking at the page, plus byte-level checks on the fixtures.

Task 2.2 needs a logged-in session on `*.reg.kmitl.ac.th` and must be done by the developer — it is the single gate for the whole change. Everything after it is agent-doable once `preview/corpus/` exists.

Two tiers, per design.md decision 4: `preview/corpus/` holds every real term, unmodified and **gitignored**; `preview/fixtures/` holds three redacted synthetic pages spliced from it, and those are what get committed.

## 1. Stop the leak

- [x] 1.1 Replace the real student id and student name in `preview/fixture.js` with fabricated values; verify by grepping the worktree for both (and for a distinctive substring of the surname) and getting nothing outside `.git`, and confirm no other real identifier is present in the file.
  - Do this first and independently of everything else — it is a live exposure in the working tree, not a step in the harness work.
  - The real values are deliberately **not** written into this file: task notes are committed too, so quoting the id here would reproduce the leak the task exists to close.
  - Scope turned out wider than "the file". The sweep found the same id and name in three more places, all currently untracked but none gitignored, so a single `git add .` would commit them:
    - `preview/fixture.js` — **done**, now `65010500` / `นายตัวอย่าง นามสมมติ` with a header comment warning against putting real values back.
    - `.impeccable/design.json` → `components[1].html` — **done**, same fabricated values; JSON still parses.
    - This tasks file itself, which quoted the id twice — **done**, rewritten to describe the values instead of naming them.
    - `.impeccable/review/{desktop,desktop-1280,menu,now-line}.png` — **done.** All four rendered the real id and name in the study-table header, where `grep` cannot see them. Retaken from the `preview/` harness against the now-clean `fixture.js` using Playwright (installed outside the repo, so `package.json` and the lockfile are untouched), at the original dimensions: 1440x900 for `desktop` / `menu` / `now-line`, 1280x800 for `desktop-1280`.
      - `menu.png` is the customize menu open on the **default** theme. The previous image had hand-picked colors that cannot be reproduced, and inventing a different set would misrepresent it as the recorded state.
      - `now-line.png` needed a frozen clock: `nowInView` is false outside 08:00–20:00 (`Grid.svelte:45`) and the retake ran at ~04:40. `Date` was pinned to 13:20 via an init script, matching the time in the previous image.
      - `DESIGN.md:206` claimed the reference images predated this revision and had not been retaken. That is no longer true, so the line was corrected in the same pass.
  - Text sweep is clean: `grep -rn` for the id, the surname, and a distinctive substring of the given name returns nothing outside `.git`. `git log -S` confirms none of it was ever committed (task 1.2).
- [x] 1.2 Check whether the real values ever reached a commit or a pushed branch (`git log -S<id> --all`, and the same for the name); verify the result and record it here. If any hit is found, stop and decide on history rewrite before this change goes further — a later commit cannot remove it.
  - **Clean — never committed.** `git log -S` for both the id and the surname returns no commits. Consistent with the wider state of the tree: the last commit is `932394e` (2024-11-10) and everything since is uncommitted, so `preview/` has never been in history at all. No rewrite needed.
  - `--all` was used, covering `legacy`, `feat/refactor`, and the current branch plus their remotes.

## 2. Capture the corpus

- [x] 2.1 Add `preview/corpus/` to `.gitignore` **before** anything is captured into it, and verify with `git check-ignore -v preview/corpus/anything.html` that the rule matches.
  - The corpus is dozens of unredacted real pages (design.md decision 4). This task exists first so it can never be committed by accident.
  - `.gitignore:18` → `preview/corpus/`. `git check-ignore -v preview/corpus/anything.html` matches (exit 0); `git check-ignore preview/fixtures/study-table-mega.html` does **not** match (exit 1), so redacted fixtures stay committable.
- [x] 2.2 Write a capture snippet to run in the DevTools console on a logged-in `https://www.reg.kmitl.ac.th/u_student/report_studytable.php`: read every year from `select#year`, then for each `(year, semester)` fetch `report_studytable_show.php` and `report_examtable_show.php` (mid and final), keeping each response as raw `arrayBuffer` bytes; emit one JSON download holding every page base64-encoded with its `(page, year, semester, term)` key. Verify the downloaded JSON contains one entry per combination the selector offered and that no entry is empty.
  - Same-origin, same session, same requests `services/reg.js` already makes — no new access, and no per-page manual save that a browser could re-encode.
  - Snippet written: `preview/capture.js`. Not imported anywhere and not bundled — it is pasted into the console. It captures the term-selector page too (that is what `fetchTermOptions` parses), sweeps semesters `1/2/3` (3 = summer; unregistered terms come back empty and are the raw material for `study-table-empty`), and fetches both exam terms `M`/`F` per semester. Bytes are kept as base64 and never decoded on the way in, so windows-874 survives; the only decode is of the selector page, to read `select#year`. Requests are sequential with a 400 ms delay — reg is a legacy server and should not take 40 parallel requests. `student_id` is posted **empty**, matching what the page's own form sends.
  - **Ran by the developer.** 37 pages, all HTTP 200, none empty-by-error, exactly `1 + 4 years x 3 semesters x 3 pages`. Years offered by `select#year`: 2567, 2566, 2565, 2564. Encoding verified on the raw bytes: `cp874` decodes with zero replacement characters, UTF-8 decoding of the same bytes yields 84, and the pages declare `charset=tis-620`.
- [x] 2.3 Write `preview/corpus.mjs` (dev-only) to split that JSON into `preview/public/corpus/<page>-<year>-<semester>[-<term>].html` as raw bytes; verify each written file decodes cleanly with `TextDecoder("windows-874")` showing correct Thai, and that decoding the same bytes as UTF-8 produces mojibake (proving the encoding survived the round trip).
  - 37 files written, 0 skipped, every one passing the cp874-clean / UTF-8-broken pair. Byte lengths match the JSON entries exactly.
  - **Path changed from `preview/corpus/` to `preview/public/corpus/`** — see the note under 2.4. `.gitignore` follows the new path.
  - The script also writes `manifest.json` beside the pages: `public/` is outside vite's module graph, so `import.meta.glob` cannot see it and the browser side needs an explicit file list.
- [x] 2.4 Sweep the real scrapers over the entire corpus: run `scrapeStudyTablePage` / `scrapeExamPage` against every file and verify none throws, none returns `null` for a page that visibly has a table, empty terms return the documented `null` info / empty schedule, and the subject counts and times match what each page shows.
  - **This is the strongest verification in the change** — real bytes, real structure, every term the account has, no fabrication anywhere.
  - Harness: `preview/sweep.html` + `preview/sweep.js`, opened at `/sweep.html`. It walks the manifest, runs `arrayBuffer` → `TextDecoder("windows-874")` → `DOMParser` → the real scraper for each file, and renders the per-file result as a table plus a JSON verdict.
  - Result: `{"files":37,"threw":0,"mangled":0,"studyPages":12,"studyEmpty":4,"examPages":24,"examEmpty":8}`. No scraper threw and none returned `null` on a page with a table. The 4 empty study pages and 8 empty exam pages are all semester 3 — the account never registered for a summer term — which is exactly the raw material the `study-table-empty` fixture needs.
  - **Trap found, and it invalidated the first run.** Vite puts any `.html` under its root through the HTML pipeline: it reads the file as UTF-8, so every windows-874 Thai byte becomes `U+FFFD`, and it injects `@vite/client`. Measured on one page: 14764 bytes on disk → 15300 bytes over HTTP with 71 `U+FFFD`. The first sweep therefore reported **0 subjects on all 12 study pages** and looked like a scraper bug; it was a transport bug. Serving from `public/` (which vite streams verbatim) makes the fetched bytes byte-identical to disk. The sweep now counts `U+FFFD` per file and fails the row if any appear, so this cannot silently recur.
  - This applies to the committed fixtures too, not just the corpus — see the design.md decision 1 amendment.
- [x] 2.5 Record which scenarios from design.md decision 4's fixture table the corpus **does not** contain, and check while capturing whether the registrar offers an English-language variant (design.md decision 6); verify the list is written into this task's notes, because it is the input to task 3.3's fabrication work and the honest statement of what remains unproven.
  - Computed by the sweep rather than eyeballed: `{"studySubjects":58,"earliestStart":"09:00","latestEnd":"19:30","startsAt0800":0,"endsAt2000":0,"shortestMinutes":60,"blocks15min":0,"daysSeen":"0,1,2,3,4,6","overlapPages":0,"emptyRoom":10,"emptyBuilding":3,"longestNameChars":52,"englishNames":58,"examSubjects":88,"examSelfArranged":20,"examNoTime":20,"examMergedType":26}`.

| Scenario | In corpus? | Consequence for task 3.3 |
|---|---|---|
| exam `จัดสอบเอง` (no date) | **yes**, 20 of 88 | **fidelity** — copy a real row; design.md decision 6 guessed robustness, promote it |
| exam missing time (`ไม่ทราบ`) | **yes**, 20 | **fidelity** |
| exam merged type (`A/B`) | **yes**, 26 | **fidelity** — decision 6 guessed robustness, promote it |
| exam multi-subject date group (`rowspan`) | **yes** | **fidelity** |
| empty room / building | **yes**, 10 / 3 | **fidelity** |
| unregistered term (empty page) | **yes**, semester 3 of all four years | **fidelity** |
| 08:00 start | **no** — earliest is 09:00 | must fabricate → **robustness** |
| 20:00 end | **no** — latest is 19:30 | must fabricate → **robustness** |
| 15-minute block | **no** — shortest real block is 60 min | must fabricate → **robustness** |
| Saturday (`dayIndex` 5) | **no** — days seen are 0,1,2,3,4,6 | must fabricate → **robustness** |
| two subjects overlapping in time | **no** — 0 pages | must fabricate → **robustness** |
| unknown day name (`dayIndexOf` → -1) | **no** — 0 occurrences | must fabricate → **robustness** |
  - **Unexpected: all 58 subject names are English** (`INFORMATION TECHNOLOGY PROJECT` and the like); not one contains a Thai character. The hand-built `preview/fixture.js` used Thai names throughout, so it never matched what the registrar actually returns — worth knowing before any layout claim is made about long Thai names wrapping. Faculty/department text in the header *is* Thai, so the page is mixed, not English-only.
  - No language toggle was pursued during capture. A genuinely Thai-subject-name page therefore remains unproven, and `dayIndexOf`'s English branch (`Mon`) and the period partition's `L`/`P` branch stay unexercised by real data. Recorded as a known gap, not fabricated.

## 3. Build the synthetic fixtures

- [x] 3.1 Write `preview/redact.mjs` (dev-only, not bundled): decode windows-874 → apply the replacement table from design.md decision 2 → re-encode with the TIS-620 encoder from decision 3 → write to `preview/public/fixtures/`. Verify by round-tripping (encode the redacted string, decode it again) and confirming it equals the redacted string exactly, and that the encoder throws rather than substitutes on an unmapped code point.
  - Encoder validated against reality before use: decode→encode over all 37 corpus files reproduces the original bytes exactly, **37/37**. The corpus uses only `0xA1`–`0xEC`, with no bytes in `0x80`–`0x9F` (the part windows-874 adds on top of TIS-620), so the plain TIS-620 table is sufficient — no `iconv` dependency, as decision 3 predicted.
  - The throw-on-unmapped behavior earned its keep immediately: the first build failed on `U+2014` (an em dash) that had crept into a provenance comment *this script writes into the fixture*. A substituting encoder would have written a corrupt byte silently. Fixed by keeping embedded text inside the TIS-620 repertoire.
  - **Refinement on decision 2**: the replacement table is not hardcoded. `redact.mjs` is committed, so writing the real id and name into it would reproduce the leak. Instead `node preview/redact.mjs scan` reports the identifier candidates it finds in the corpus (student id via the `<strong>…</strong>&nbsp;<digits>` header shape and the exam page's `#student_id` input; name parts via the Thai text in the same row), and `build` takes them as `--replace "real=fake"` arguments. Real values live only in the developer's shell history, never in the repo.
- [x] 3.2 Add the splice step from design.md decision 5 to that script: build a fixture by copying whole `<tr>` elements out of corpus pages and editing only their text content, never authoring structure. Verify it asserts, and refuses to write on failure.
  - Splice is text surgery on whole `<tr>` blocks: a real subject row is copied verbatim and only the *inner text* of specific `<td>` elements is replaced (`setCell` rewrites between `>` and `</td>`, never a tag or attribute). Cell indices are derived from the scraper's own reading: `td[n]` is `childNodes[2n+1]`, so code/name/credit/lecture-sec/lab-sec/period/room/building/remark are `td` 2/4/6/8/10/12/14/16/17.
  - Five guards, each refusing to write rather than warning: every subject row has exactly 18 `<td>` (the text-level form of `childNodes.length == 37`); the row count equals the original plus exactly the number of fabricated rows; no fabricated row has an empty period cell; the TIS-620 round-trip of the final text is identical; and none of the `--replace` source values survives in the bytes about to be written.
  - The `childNodes == 37` invariant is additionally checked *in the browser* rather than only by counting tags: the sweep runs the real `scrapeTable` over each fixture, and a structurally wrong row would be filtered out by that very check and simply fail to appear in the output. The expected-subject-count assertion in 3.3 is what makes that observable.
  - Exam fixtures needed no splice at all (see 3.3), so the pair-insertion rule for `tr:nth-child(17)` was never exercised. Recorded rather than claimed.
- [x] 3.3 Assemble the three fixtures from design.md decision 4 (`study-table-mega`, `study-table-empty`, `exam-mega`), fabricating only the cases 2.5 listed as absent, and labelling every case in the fixture as `fidelity` or `robustness` per decision 6.

| Fixture | Built from | Subject rows | Fabricated | Bytes |
|---|---|---|---|---|
| `study-table-mega.html` | `study-table-2566-2.html` | 16 | 7 (all `robustness`) | 23520 |
| `study-table-empty.html` | `study-table-2567-3.html` | 1 (header only) | 0 — pure `fidelity` | 4834 |
| `exam-mega.html` | `exam-table-2566-2-M.html` | — | 0 — pure `fidelity` | 22002 |

  - `exam-mega` needed **no fabrication whatsoever**. That one real page already carries `จัดสอบเอง`, missing exam times, an `A/B` merged type, and a multi-subject date group — the four cases design.md decision 6 had guessed would need inventing. Copying a real page beats authoring one, so the plan collapsed to a straight redaction.
  - The seven fabricated study rows (codes `99000001`–`99000007`, all tagged `robustness` in an HTML comment above each row) cover exactly the gaps 2.5 measured: an 08:00 start, a 20:00 end, a 15-minute block, a Saturday class, two rows overlapping on Friday, and an unknown day name (`ฮ.`) that drives `dayIndexOf` to `-1`.
  - **Verified by running the real scrapers over the fixtures**, not by inspection. The sweep now walks corpus *and* fixtures through the identical `arrayBuffer` → `TextDecoder` → `DOMParser` → scraper path, and computes coverage per source. Fixture coverage: `{"studySubjects":17,"earliestStart":"08:00","latestEnd":"20:00","startsAt0800":1,"endsAt2000":1,"shortestMinutes":15,"blocks15min":1,"saturday":1,"unknownDay":1,"daysSeen":"-1,0,1,2,3,4,5,6","overlapPages":1,"emptyRoom":1,"emptyBuilding":1,"examSubjects":8,"examSelfArranged":5,"examNoTime":5,"examMergedType":2}`.
  - The sweep also asserts the scenario checklist directly and prints what is missing: **`SWEEP_FIXTURE_GAPS []`** — no gap. Overall verdict across both sources: `{"files":40,"threw":0,"mangled":0}`.
  - Every fabricated row surviving into the scraped output is itself the proof that the splice preserved structure: had any row lost its 37-node shape, `scrapeTable`'s filter would have dropped it and the corresponding coverage counter would read 0.
- [x] 3.4 Stamp each fixture with its capture date and its provenance (which corpus pages it was spliced from, what was fabricated); verify by reading each fixture's decoded text end to end that no student id, student name, or other personal identifier survives, and that faculty/department/subject text is intact.
  - This is the review gate before the fixtures are ever committed. Once committed, a leak needs history rewrite.
  - Each fixture ends with an HTML comment naming the source corpus page, the corpus capture timestamp, the fact that identity fields are fabricated, and — for `study-table-mega` — one line per fabricated row with its code, its `robustness` tag, and why it exists.
  - Leak check over the decoded bytes of all three fixtures: **0 occurrences** of the real id and of either real name part; the fabricated `65010500` / `นายตัวอย่าง` / `นามสมมติ` appear where the real values used to be (8/1/1 in `exam-mega`, which also carries the id in its hidden `#student_id` input, 1/1/1 in each study fixture). Faculty, department, programme and subject text are untouched.
  - `git check-ignore`: `preview/public/corpus/` is ignored, `preview/public/fixtures/*` is committable. `pnpm lint` clean.

## 4. Drive the harness through the real scrapers

- [x] 4.1 Add a fixture loader in `preview/` that `fetch`es a fixture and runs `arrayBuffer()` → `TextDecoder("windows-874")` → `DOMParser` — the same three steps as `services/reg.js`; verify by confirming the parsed `Document` carries Thai text with no mojibake.
  - `preview/loadFixture.js`. Returns both the parsed `Document` and `doc.body.innerHTML`, the latter feeding the `oldTable` / `oldDesign` props so the "แบบเดิม" toggle shows **real registrar markup** instead of the old `"<p>old design</p>"` placeholder.
  - Carries the same `U+FFFD` guard as the sweep and throws with the reason (`ไฟล์ต้องอยู่ใต้ preview/public/`), so the vite-transform trap from 2.4 surfaces as an explicit error rather than as an empty schedule.
  - Dropped `?url` from the task wording: it is irrelevant here. `public/` files are addressed by plain path and are outside the module graph entirely.
- [x] 4.2 Rewrite `preview/main.js` to read `?page=study|exam` (default `study`), load the matching fixture, pass the `Document` to `scrapeStudyTablePage` / `scrapeExamPage`, and mount `StudyTable` / `ExamSchedule` with the scraped result; verify both pages render with data that matches what the fixture HTML shows.
  - Both render with **zero console errors**. `?page=study` mounts `StudyTable` (title `KMITL + preview — ตารางเรียน`), `?page=exam` mounts `ExamSchedule` (`— ตารางสอบ`). Both headers show the fabricated `65010500` / `นายตัวอย่าง นามสมมติ`.
  - Structure mirrors `core/boot.js` (scrape → `toProps` → mount) but does not use it: `boot` clears `document.body` and falls back to the untouched page on failure, and there is no original page here. When the scraper returns `null` the harness says so in plain text instead of silently rendering nothing.
  - The study page renders all 17 subjects, and every fabricated case is visible in its expected place: 08:00 flush at the left edge, 19:00–20:00 flush at the right, the 15-minute sliver on Wednesday, Saturday populated, and the two Friday blocks overlapping with the later one painted on top — the documented last-writer-wins outcome, now observable rather than argued.
  - The exam page shows three dated rows plus one `ไม่ทราบ` date group spanning five subjects by `rowspan`, each with a `ไม่ทราบ` time, and merged `ทฤษฎี/ปฏิบัติ` exam types. Every exam scenario in the spec is on screen at once.
- [x] 4.3 Demote `preview/fixture.js`: the hand-built object literals stop being the input path. Delete it if nothing references it; verify no stale imports remain and the preview still boots.
  - **Deleted.** Nothing imported it after 4.2, and the harness boots without it. This also retires the file that held the real student id and name in task 1.1 — the safest possible end state for it.
- [x] 4.4 Extend `preview/regStub.js` so `fetchTermOptions` returns the years the fixtures cover and `fetchStudyTable(year, semester)` resolves to the matching fixture document; verify by switching terms in the preview and seeing the grid re-render with different content, including the empty state.
  - Returns real fixture `Document`s, so term switching runs through `scrapeStudyTablePage` exactly as it does on the live page — the stub no longer short-circuits the scraper with an empty document.
  - Semester 1 resolves to `study-table-mega`, semester 2 to `study-table-empty`, making both states clickable. Verified by driving the picker: 17 subjects → empty state (`ไม่มีข้อมูลภาคเรียนนี้`) → back to 17, no console errors.
  - `fetchExamTable` is stubbed too, for whenever the exam page stops using a full-page form post.
- [x] 4.5 Add links to both pages in `preview/index.html`; verify both open from the index and the page selection survives a reload.
  - `index.html` is now a link hub (study / exam / sweep) and the app moved to `app.html`, so `?page=` selection lives on a URL that survives reload and can be linked to directly. Verified: the hub exposes exactly `./app.html?page=study`, `./app.html?page=exam`, `./sweep.html`.
  - The hub deliberately uses no `DESIGN.md` tokens and declares no literal colors or font sizes — it is a dev surface, and pulling the product design system into it would misrepresent both.

### Observations from section 4 — existing behavior, not this change's scope

Recorded because the harness made them visible for the first time; none is acted on here.

- **A subject whose day cannot be parsed disappears from the grid without a trace.** The fabricated `ฮ.` row scrapes fine (`dayIndexOf` → `-1`, and the sweep counts it), but `Grid.svelte` renders rows 0–6 only, so the subject is silently dropped. On a real page this would mean a class the student is enrolled in simply not being shown. Worth a decision — render it in a fallback row, or surface a warning — in a separate change.
- **The exam page's toggle button is labelled with its current state, the study page's with its action.** `ExamControls.svelte` shows `New Design` while the new design is displayed; `Controls.svelte` shows `แบบเดิม` (the destination). One of the two is wrong; `refactor-exam-ui` design decision 3 already flags these two bars as convergence candidates.
- **The old-design toggle now exercises `.kmitl-table` against real registrar markup**, which nothing did before — the placeholder was `<p>old design</p>`. The scoped element selectors from `refactor-study-grid-css-grid` task 2.1 render the genuine reg table correctly, and the spliced rows line up column-for-column with the real ones, which is independent visual evidence that the splice preserved structure.

## 5. Verify

- [x] 5.1 Walk the `study-table-render` spec scenarios in the preview: normal term renders every subject at its correct day/time, 08:00 and 20:00 items sit flush at the grid edges, empty term shows the empty state, theme customize and reset work, old-design toggle round-trips; verify each behaves as specified.
  - This is what unblocks `refactor-study-grid-css-grid` 3.3 for everything except the in-Chrome walk.
  - Walked as an automated pass over every named scenario, driving the real UI (clicks, selects) rather than inspecting the DOM statically. **25/25 scenarios pass, zero console errors on every page.**
  - *Normal page load* — all 19 subjects render with name, section, type (ท/ป), room/building and start–end time.
  - *Both Thai and English day names* — the two fabricated English rows land on the correct weekday rows (`Mon` → `จ.`, `Tue` → `อ.`), sitting alongside Thai-named subjects on the same rows. This scenario had **no** coverage before: the entire corpus is Thai (task 2.5), so `dayIndexOf`'s English branch and the period partition's `L`/`P` branch had never been exercised by anything. Two `robustness` rows were added to `study-table-mega` to close it; the exact markup of a real English registrar page is still unverified, and the rows are tagged accordingly.
  - *Sparse or empty page* — semester 2 resolves to the empty fixture and renders `ไม่มีข้อมูลภาคเรียนนี้`, not a blank page.
  - *Header render* — all four lines present with the fabricated identity.
  - *Toggle old design* — the real registrar table appears (2 tables under `.kmitl-table`, containing `ตารางเรียนส่วนบุคคล`) and toggling back restores the grid with the same block count.
  - *theme-customize* — the menu lists 18 colour swatches (header + every subject) and offers `คืนค่าสีเริ่มต้น`.
  - *study-table-navigation* — the year options come from the stub's server-side list and term switching re-renders in place.
- [x] 5.2 Walk the `exam-schedule-render` spec scenarios in the preview: date grouping with `rowspan`, alternating day backgrounds, `ไม่ทราบ` fallbacks, `จัดสอบเอง`, the `A/B` exam-type merge, and the ordering rule that puts subjects with no exam time last; verify each behaves as specified.
  - This is what unblocks `refactor-exam-ui` 4.1 for everything except the mid/final reload (which is a real form post and stays live-only).
  - *Normal page load* — 8 rows with code, name, section, credit, exam type and room.
  - *Grouped by date with `rowspan`* — max `rowspan` 5 on the `ไม่ทราบ` group.
  - *Subject without date or time* — both fields render `ไม่ทราบ` and the entry survives.
  - *Unscheduled sorts after scheduled* — the `ไม่ทราบ` group is last.
  - *Duplicate rows merge* — `ทฤษฎี/ปฏิบัติ` appears, the real `A/B` concatenation.
  - *Buddhist-era display* — Thai weekday and month with a พ.ศ. year (`จันทร์ 22 ม.ค. 2567` from a Gregorian `2024-01-22`).
  - *Toggle old design* — the real registrar exam table renders and toggling back restores all 8 rows.
  - *Mid/Final* — the selector is present with exactly `M,F`. The **switch itself is not verified here**: it is a full-page form POST, which no fixture can drive. That single scenario stays live-only, exactly as `refactor-exam-ui` design decision 4 states.
- [x] 5.3 Export a snapdom PNG from both preview pages and confirm fonts, borders, and theme colors render in the image as they do on screen; verify the `downloading` select→span swap on the exam page appears in the exam export.
  - Both downloads fire and produce real files: study `2784x1592`, 392 kB; exam `2400x1222`, 393 kB (both at `scale: 2`). Thai text renders with the embedded Prompt font, theme tints and gridlines match the screen.
  - *Controls excluded* — asserted structurally (the fixed bottom bar is not inside the captured element) and confirmed in both images: no bar, no pickers, no buttons.
  - *Exam term selector during capture* — the export shows `Mid Term` as plain text, and the `<select>` is back in the DOM after the capture completes.
- [x] 5.4 Run `pnpm lint` and `pnpm build` and verify no new findings, and that `preview/`, `preview/public/fixtures/` and `preview/public/corpus/` are absent from the built extension output in `dist/`.
  - `pnpm lint` clean. `pnpm build` succeeds from a cleaned `dist/` in 318 ms.
  - `dist/` contains only the two content scripts, their loaders, the stylesheet, the shared chunk, the manifest and the icons. Grepping the whole tree for `corpus`, `fixtures`, `study-table-mega`, `regStub`, `loadFixture`, `sweep` and the fabricated id returns nothing — the harness is entirely absent from the shipped extension, as is any registrar data.
- [x] 5.5 Confirm `src/` has no diff from this change; if any file under `src/` was touched, stop and raise it as a separate change per design.md's last risk.
  - No file under `src/` was modified. Every `src/` file has an mtime at or before `Sep 3 03:59`, which predates this session, while every file this change touched under `preview/` is stamped `09:58`–`10:04`. (`git diff src/` is not a usable signal on its own here: the whole tree is uncommitted since `932394e`, so it shows the two in-flight refactors regardless.)
  - The harness adapted to the scrapers' existing signatures throughout, which was the point of the constraint.
- [x] 5.6 Final leak check before committing: nothing under `preview/public/corpus/` is committable, and a grep for the real student id and name across the whole worktree returns nothing outside `.git`.
  - `git check-ignore`: `preview/public/corpus/` ignored; `preview/public/fixtures/*` committable.
  - Worktree grep for the real id, the real surname and a distinctive substring of the real given name: **no matches outside `.git`**, and `git log -S` confirms none of it ever reached a commit (task 1.2). The only place any of it still exists is the gitignored corpus and the developer's own shell history.
