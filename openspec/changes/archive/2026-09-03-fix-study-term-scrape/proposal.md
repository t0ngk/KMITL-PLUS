## Why

The term picker on the study table claims a year the grid is not showing. Open the table for 2565 ภาคเรียนที่ 2 and the header reads `ประจำภาคเรียนที่ 2   ปีการศึกษา 2565` while the picker reads `ปีการศึกษา 2567`.

The registrar separates the columns of its header cells with `&nbsp;`:

```
<strong>ประจำภาคเรียนที่</strong>&nbsp;2&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>ปีการศึกษา</strong>&nbsp;2565
```

`splitColumns` in `features/study-table/scraper.js` splits on three ASCII spaces, which never match U+00A0. Every header cell therefore comes back as one column, so `info.year`, `info.major` and `info.studentName` are the empty string on **every page the registrar serves** — confirmed on the live page (the separator code points read `160`) and on all twelve study pages in the corpus.

The header still looks right by accident: column zero carries the whole sentence and `HeaderCard` prints it. The picker does not get that luck. It parses a year out of `info.year`, finds nothing, and `StudyTable.svelte` quietly substitutes `years[0]` — the newest year the registrar offers.

The wrong year is not confined to the label. `onSelectTerm(selectedYear, semester)` sends whatever the picker holds, so a student looking at 2565 who changes only the semester is thrown to 2567.

Two smaller things surfaced while tracing it, and they belong to the same requirement:

- `semesters` is hard-coded to `["1", "2"]`. The registrar's own selector page happens to offer the same two — but a literal in a component cannot follow the registrar when that changes, and the year list is already read from that page, so the semester list has no reason to be different.
- The picker is not described in `study-table-render` at all. That is why nothing caught this: no scenario ever asserted that what it says matches what is on screen.

## What Changes

- The header stops being split on an exact number of spaces. Columns are separated by a run of whitespace of any kind and any length, which is what makes the parse survive `&nbsp;`. (Locating the fields by their Thai labels instead was considered and rejected — see design.md decision 2.)
- `major` and `studentName` stop being empty. They are scraped today, discarded today, and the spec already says all four header lines show their scraped values.
- The semester list is read from the registrar's own selector page, the same page the year list already comes from. It stops being a literal in the component, and nothing is offered that the registrar does not offer.
- **The picker never states a term it is not showing.** When the term cannot be read, it says so or steps aside; substituting a plausible year is what let this defect live undetected.
- The term picker gets requirements, so a walk can check it from now on.

Not a redesign: the dock, the grid, the header layout and the switching behaviour are untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `study-table-render`: adds a requirement that the term picker reflects the term on screen, offers exactly what the registrar offers, and refuses to state a term it cannot confirm. The existing header requirement is restated so that "the scraped values" means the separated fields, not one field carrying the whole line.

## Impact

- `src/features/study-table/scraper.js` — `splitColumns` / `getinfo`; the header fields stop depending on ASCII spacing and node position.
- `src/features/study-table/StudyTable.svelte` — where the year and semester for the picker come from, the `semesters` literal, and what happens when the term cannot be read.
- `src/features/study-table/Controls.svelte` — only if the picker needs a "term unknown" presentation.
- `openspec/specs/study-table-render/spec.md` — updated on archive.
- `preview/walk.mjs` — new scenarios; the current walk passes while this defect is live, which is itself a gap.

Out of scope: the exam page (it reads `#year` / `#semester` straight from the registrar's own hidden inputs and was verified to agree with its header text on the live page), the exam page's missing year/semester selection, and anything about what a refresh restores — `exam-inline-term-switch` decision 7 settles that deliberately.
