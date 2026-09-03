# Design — fix-study-term-scrape

## Context

See proposal.md for why. Measurements that shape the approach:

- The registrar separates a header cell's **label from its value** with a single `&nbsp;`, and one **column from the next** with a run of 3 or 5 `&nbsp;`. Counted across the 12 study pages in the corpus: 24 single runs and 12 runs of 5 in the term cell, 24 single and 12 of 3 in the department cell, 36 single and 12 of 5 in the student cell. No column is separated by fewer than three.
- `splitColumns` splits on the literal `"   "`. In JavaScript `\s` already matches U+00A0; the three-space literal does not.
- `getinfo` reads its cells by `childNodes` index (6, 10, 14, 18). Those indices held on all 12 corpus pages and on the live page, even though the node count ranged from 28 to 60. **Position is not the proven fault here** — the separator is.
- `HeaderCard` already joins the fields it is given (`faculty · department · major`, `studentId studentName`, `semester year`). Nothing needs restructuring for the recovered fields to appear.
- `StudyTable.svelte` derives the picker's year and semester by regex over the header strings, then, in `onMount`, replaces anything not found in the option lists with `years[0]` / `semesters[0]`.
- The registrar's term selector page is already in the corpus (`term-selector.html`) — `preview/capture.js` grabs it first on every run, because `fetchTermOptions()` parses it.
- The exam page reads `#year` / `#semester` from the registrar's own hidden inputs. The study page has no such field: the year appears exactly once in the whole document, inside that header cell. Parsing the text is the only source available.

## Goals / Non-Goals

**Goals:**

- The picker's term and the table on screen are the same term, or the picker says it does not know.
- The fix rests on what the registrar actually writes, not on a count of spaces.
- The picker offers what the registrar offers, and nothing invented on top.

**Non-Goals:**

- No change to the grid, the dock layout, switching behaviour, capture, or the old-design toggle.
- No rewrite of the positional cell reads (see decision 2).
- Nothing about the exam page, and nothing about what a refresh restores (`exam-inline-term-switch` decision 7 settles that on purpose).

## Decisions

### 1. Split on runs of whitespace, not on a literal

`splitColumns` splits on `/\s{2,}/` instead of `"   "`.

- `\s` covers U+00A0, so the same expression handles both the registrar's `&nbsp;` runs and any ordinary spacing, without the code having to name a character the registrar might swap next time.
- Two, not three: three is merely the smallest run observed today. Depending on an exact count is precisely what broke this, and a single separator is never used between columns — it is always used between a label and its value, which is inside a column and must not split.
- Rejected — matching `&nbsp;` in the HTML before parsing: the DOM has already turned entities into characters by the time the scraper sees them, so this would mean re-reading the raw bytes to answer a question the text can already answer.
- Rejected — splitting on `/ {2,}/` only: it fixes the observed page and leaves the ASCII case that `splitColumns` was originally written for.

This single change also restores `major` and `studentName`, which have been empty on every page since the function was written.

### 2. Do not rewrite the positional reads on speculation

The `childNodes` indices stay.

- The temptation is to locate cells by their Thai labels instead. But the indices were checked on 12 real pages and on the live page and never moved; rewriting them would trade a mechanism with evidence behind it for one that couples the scraper to display text, on the strength of a drift nobody has seen.
- What that rewrite was really defending against — the header becoming unreadable for a reason we did not predict — is covered by decision 4, which is cheaper and works for any cause rather than one guessed cause.
- If the indices do drift later, the picker will now say so instead of inventing a year, and the walk will fail. That is the right time to revisit this.

### 3. Both lists come from the registrar, and there is no fallback list

`fetchTermOptions` already fetches `report_studytable.php` for the year list. The semester list is read from the same page, from `#semester`. If either list is empty, the picker is not shown at all.

This decision was rewritten during apply, after the page it depends on turned out to be in the corpus already — `preview/public/corpus/term-selector.html`, captured by `preview/capture.js` on every run. It says:

```
   <select id="year">      2567, 2566, 2565, 2564
   <select id="semester">  2, 1
```

That changes the answer twice over:

- The registrar's selector offers **no summer term**. The earlier plan was to add `3` on the grounds that `study-table-YYYY-3` exists in the corpus for all four years. Those pages do exist — and every one of them is empty; this account never registered in a summer term. So the evidence says the pages are reachable, not that anyone has a timetable there. Offering a semester the registrar itself does not offer, to reach a page nobody has been shown to have content on, is the same species of invention as substituting `years[0]`. Dropped.
- A fallback list is no longer defensible either. It existed to cover "what if that page has no semester select", and the page does have one. Keeping a literal for a case that does not occur means shipping an unverified branch — and the only honest content for that literal would be `1, 2`, which is what the page already says.

If the registrar adds a summer term to its own selector, the picker gains it with no code change. Until then, a student on a term outside the lists is still told the truth about it by decision 4; they simply cannot re-select it from the list, which is exactly the registrar's own behaviour.

### 3b. The registrar's selector page becomes a committed fixture

`preview/public/fixtures/term-selector.html` is the real page, byte-identical to the corpus copy, and both the preview stub and the extension walk now serve it instead of a list written by hand.

- This is the defect that hid the one above: the preview stub returned `["1","2","3"]` and the extension walk served a synthesised page with only `#year`, so both walks passed while the real page disagreed with both. A stub that invents its answer cannot fail.
- `preview/regStub.js` calls the same `readTermOptions()` the extension calls, so the parsing itself is under test rather than reimplemented.
- No redaction was needed: the page carries year and semester options, a button, and the page's own Thai labels. Checked for digit runs of five or more and there are none — no student ID, no name.

### 4. When the term cannot be read, the picker says so and still works

If a year or a semester cannot be determined from the page, the picker shows a placeholder for that field rather than a number, and a fetch is only issued once both are known.

```
   วันนี้                                หลังแก้
   -----------------------------        -----------------------------
   อ่านปีไม่ออก                            อ่านปีไม่ออก
     -> เดาเป็น years[0] = 2567             -> "เลือกปีการศึกษา"
     -> ป้ายบอกเทอมที่ไม่ได้แสดงอยู่            -> ไม่มีอะไรอ้างเทอมที่ไม่จริง
     -> กดเปลี่ยนภาคเรียน = เด้งไป 2567       -> ยังเลือกได้ แต่ต้องเลือกให้ครบก่อนจึงจะยิง
```

- Why not hide the picker: an unreadable header is exactly when a student most needs a way out of the page. Removing the control punishes them for the registrar's markup.
- Why not keep the current fallback with a warning next to it: a control that displays `2567` is claiming `2567`, and no adjacent text undoes that. The rule this project already follows for failed fetches — show the previous good state, never a made-up one — applies here too.
- `appliedYear` / `appliedSemester` follow the same rule: they hold nothing until a term is actually known, so the failure path of `selectTerm` cannot restore a term that was never displayed.

### 5. The header's spacing changes, and that is the fix working

Once the columns separate, `HeaderCard` joins them itself:

```
   ก่อน   คณะเทคโนโลยีสารสนเทศ · ภาควิชา ...     สาขาวิชา ...
                                        ^^^^^ 3 nbsp ที่รอดมาในสตริงเดียว
   หลัง   คณะเทคโนโลยีสารสนเทศ · ภาควิชา ... · สาขาวิชา ...
```

The term pill and the identity line change the same way. This is a visible difference on every page, it is the design system's own separator replacing the registrar's padding, and any walk assertion that matched the old spacing needs updating rather than the code being bent to preserve it.

## Risks / Trade-offs

- [`/\s{2,}/` splits something that was meant to stay together] → No column in the corpus is separated by fewer than three whitespace characters and no label-to-value gap uses more than one, so the margin is wide. The corpus sweep runs the real scraper over all 40 pages and would surface a field that came apart.
- [A student who did register in a summer term cannot reach it, because the registrar's selector does not list it] → Unproven either way: no page in the corpus has summer content, and the registrar's own UI offers no way there, so such a student cannot reach it on the registrar's site either. If one turns up, the fix is one entry in `readTermOptions`, and decision 3 records exactly what evidence would justify it.
- [Both lists now have to be readable or the picker disappears entirely] → That is the same rule the year list already had; the difference is that failure is now visible as a missing control rather than as a confidently wrong year.
- [Recovered `major` and `studentName` reveal PII that was previously blank on screen] → They are the student's own name and major on their own page, which the registrar already prints above the table; the redacted fixtures keep carrying invented values.
- [The "term unknown" state is unreachable in the harness, so it ships unverified] → The preview stub can serve a header the scraper cannot read, the same way `?fail=` and `?slow=` were added for states a fixture cannot otherwise produce.
- [Fixing the picker changes what a term switch fetches, and the study table is the most-exercised component here] → `pnpm walk` must stay at full pass throughout, and the new scenarios join it.

## Migration Plan

Single change, revertible. No dependency, manifest or build changes. Visible differences: the picker shows the term actually on screen, its lists follow the registrar's own selector, the header's column separators become the design system's, and major and student name appear where they were blank.
