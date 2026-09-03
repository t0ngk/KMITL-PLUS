# preview-harness-fixtures

## Why

Every change to this project ends the same way: the last few tasks sit blocked forever because verification requires a logged-in session on `*.reg.kmitl.ac.th`. `refactor-exam-ui` (3 tasks) and `refactor-study-grid-css-grid` (4 tasks) are both stalled on exactly that, and one of those tasks — capturing a pre-refactor baseline — became permanently impossible while it waited. The `preview/` harness was built to break this dependency but stops short: it mounts only `StudyTable`, and it feeds in an already-scraped object, so `scraper.js` — the most brittle code in the project, indexing into registrar HTML by child position — is never exercised outside a live page.

Saving real registrar HTML once, de-identified, converts an unbounded blocker into a one-time cost.

## What Changes

- Capture a local **corpus**: every `(year, semester)` the account has, for both the study table and the exam table, saved as raw bytes so the **windows-874** encoding is preserved rather than re-saved as UTF-8. The corpus is **gitignored and never committed** — it is dozens of pages of unredacted personal data, and its value is a one-time sweep, not a durable artifact.
- Sweep the real scrapers over that whole corpus. This is the strongest verification available: real bytes, real markup, every term this account has, nothing fabricated.
- Add three redacted **synthetic fixtures** under `preview/fixtures/`, spliced from the corpus and committed: `study-table-mega` (one populated term packing every study-table scenario), `study-table-empty` (an unregistered term — a different page state that cannot share a file), and `exam-mega` (date grouping, `ไม่ทราบ`, `จัดสอบเอง`, the `A/B` merge). No `exam-final` fixture: switching mid/final is a full-page form POST that no fixture can drive.
- Synthetic fixtures are built by copying whole real elements and editing only their text — structure is never authored by hand, and the scrapers' structural invariants are asserted before a fixture is written. Cases the corpus cannot supply are fabricated and labelled `robustness` rather than `fidelity`, so no reader mistakes them for observed registrar behavior.
- De-identify every committed fixture before it is written: replace student id, student name, and any other personally identifying registrar output with fabricated values. Real Thai text and structure are kept — they are what the scrapers parse.
- **De-identify `preview/fixture.js`**, which currently contains a real student id and name. Replaced in the same pass.
- Route the preview harness through the real scrapers: load a fixture, decode it with `TextDecoder("windows-874")` + `DOMParser` the same way `services/reg.js` does, and pass the resulting `Document` to `scrapeStudyTablePage` / `scrapeExamPage`. The hand-built object literals in `fixture.js` stop being the input path.
- Extend the harness to mount `ExamSchedule` as well as `StudyTable`, selectable so both pages can be opened and inspected.
- Update `regStub.js` so term switching in the preview resolves to fixtures instead of an empty document.

## Capabilities

### New Capabilities

None. This is developer tooling — it renders the same pages the extension already renders, from saved input instead of a live page.

### Modified Capabilities

None. No shipped behavior changes: `preview/` is not bundled into the extension, and `src/` changes are limited to nothing (the harness adapts to the existing scraper signatures, not the reverse). This change sets `skip_specs: true`.

## Impact

- `preview/corpus/` — new, every real term as raw registrar bytes. **Gitignored, never committed**; `.gitignore` gains the rule before any capture runs. Local to one machine, so the corpus sweep is not reproducible elsewhere or in CI — accepted, since the project has neither.
- `preview/fixtures/` — new, three synthetic registrar pages (de-identified). Committed, so review the diff for leaked personal data before it lands.
- `preview/corpus.mjs`, `preview/redact.mjs` — new dev-only scripts (split the capture; redact and splice). Not bundled into the extension.
- `preview/fixture.js` — real student id/name replaced with fabricated values; hand-built object literals demoted or removed once fixtures drive the harness.
- `preview/main.js`, `preview/index.html`, `preview/regStub.js`, `preview/vite.config.js` — page selection and fixture loading.
- `.gitignore` — one rule for `preview/corpus/`.
- `src/` — **no changes expected.** If a scraper turns out to need a signature change to be callable from the harness, that is a separate change, not a quiet edit here.
- Unblocks: `refactor-exam-ui` 4.1/4.2 and `refactor-study-grid-css-grid` 3.3/4.1/4.2 become verifiable without a live session for everything except the final in-Chrome walk. It does **not** recover the lost pre-refactor baselines in either change's task 1.1.
- The project convention "no test framework — verification is live scenario walks" is unchanged. This change makes the walk possible offline; it does not add assertions or a test runner.
