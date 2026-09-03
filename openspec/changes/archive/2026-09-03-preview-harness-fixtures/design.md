# Design — preview-harness-fixtures

## Context

See proposal.md for motivation. Current state that shapes the approach:

- `preview/` is a second Vite root (`preview/vite.config.js`, port 5199) that mounts `StudyTable.svelte` directly from `main.js` with object literals from `fixture.js`. It aliases `../../services/reg` to `regStub.js` so term switching does not hit the network.
- `preview/fixture.js` contains a real student id and name. That is the first thing this change fixes.
- Both scrapers already accept a `Document` produced by `DOMParser`, which is exactly what a fixture can supply:
  - `scrapeStudyTablePage(root)` → `{ info, schedule }`, `null` only when `root` is falsy.
  - `scrapeExamPage(root)` → `{ schedule, data }`, or `null` when the nested exam-table selector is absent. It calls `documentOf(root)` = `root.ownerDocument ?? root`, and a `DOMParser` document has a null `ownerDocument`, so passing the document itself works.
- `services/reg.js` decodes registrar responses with `arrayBuffer()` + `TextDecoder("windows-874")` + `DOMParser`. Any fixture path that does not reproduce those three steps is testing something other than what ships.
- The exam content script (`content/examSchedule.js`) removes the registrar's own stylesheet (`prepare`) before mounting, and `core/boot.js` clears `document.body`. Neither runs in the preview, which mounts components into an empty page instead.
- Registrar pages are small static HTML (tens of KB), so committing several is cheap.

## Goals / Non-Goals

**Goals:**

- No personally identifying data anywhere in `preview/`, including the file that has it today.
- The preview's input path is byte-identical in kind to production: saved windows-874 bytes → `TextDecoder` → `DOMParser` → the same scraper the extension calls.
- Both pages (study table, exam schedule) openable in the harness, with the fixture set covering the edge cases the specs name: empty term, `จัดสอบเอง`, duplicate exam-type merge, a subject with no exam time.
- A one-time sweep of the scrapers over **every term the account actually has**, which is stronger evidence than any synthetic page and is currently done by nobody.

**Non-Goals:**

- No assertions, snapshots, or test runner. The project convention is verification by looking at the page; this change makes looking possible offline and stops there.
- No changes to `src/`. The harness adapts to the scrapers' current signatures.
- The preview does **not** exercise `core/boot.js` (its fallback-on-scrape-failure path) or the exam page's stylesheet removal. Those stay live-only; a fixture cannot reproduce "the registrar's CSS is fighting our layout" because the harness page has no registrar CSS to begin with.
- The corpus is **not** a durable artifact. It is gitignored, exists on one machine, and the sweep it enables cannot be re-run by anyone else or in CI. Accepted deliberately — see decision 4.
- No `exam-final` fixture: the mid/final switch is a full-page form POST that no fixture can drive.
- Does not recover the lost pre-refactor baselines in `refactor-exam-ui` / `refactor-study-grid-css-grid`.

## Decisions

### 1. Fixtures stored as raw windows-874 bytes, loaded with `?url` + `fetch`

```
   preview/fixtures/study-table-normal.html   (windows-874 bytes, as served by reg)
        |
        |  import url from "./fixtures/....html?url"
        v
   fetch(url) -> arrayBuffer()
        |
        v
   new TextDecoder("windows-874").decode(buffer)
        |
        v
   new DOMParser().parseFromString(html, "text/html")
        |
        v
   scrapeStudyTablePage(doc)  /  scrapeExamPage(doc)
```

- Why not `?raw`: Vite's `?raw` returns the file decoded as **UTF-8**. Thai text in a windows-874 file would arrive already mojibaked, and the bug class this fixture exists to catch would be baked into the fixture.
- Why not save the fixtures pre-decoded as UTF-8: it works for rendering, but it deletes the decode step from the path under test. The encoding is listed in `config.yaml` as a hard-won, live-verified fact; a harness that skips it will not notice when it breaks.
- `fetch` + `arrayBuffer` reuses the exact three-step sequence from `services/reg.js`.

**Amended during task 2.4 — `?url` alone is not enough, and the file must live in `public/`.**

The original wording assumed vite's dev server streams a file untouched when it is imported with `?url`. It does not, for `.html`. Any `.html` under the vite root goes through the HTML pipeline, which reads it as UTF-8 and re-serves it: every windows-874 Thai byte becomes `U+FFFD`, and `@vite/client` is injected. Measured on one corpus page: **14764 bytes on disk → 15300 bytes over HTTP, containing 71 `U+FFFD`**.

This is not a cosmetic difference. The first corpus sweep ran against transformed bytes and reported zero subjects on all twelve study pages — a result that reads exactly like a broken scraper. The scrapers were fine; the transport had destroyed the input.

```
   preview/corpus/x.html   --> vite HTML pipeline --> UTF-8 mangled + @vite/client   WRONG
   preview/public/corpus/x.html --> served verbatim (publicDir) --> byte-identical    RIGHT
```

Consequences carried into the rest of the design:

- Saved registrar HTML — corpus **and** the committed fixtures — lives under `preview/public/`. `publicDir` is the only location vite guarantees to serve as-is.
- `public/` is outside vite's module graph, so `import.meta.glob` cannot enumerate it. The generator writes a `manifest.json` beside the pages and the browser reads the file list from that.
- Anything that loads a fixture counts `U+FFFD` in the decoded string and treats a non-zero count as a failure. A silent re-encode must never again be mistaken for a scraping bug.

### 2. De-identification happens once, at capture time, in a committed script

A small Node script under `preview/` (dev-only, not bundled) reads a saved page, decodes it, applies a replacement table, re-encodes to windows-874, and writes the fixture.

- Replacement table: student id → a fabricated id of the same digit count; student name → a fabricated Thai name; anything else the registrar prints that identifies a person. Faculty, department, programme, subject names and codes are **kept** — they are the structure being parsed.
- Why a script rather than hand-editing: the source pages are windows-874, so hand-editing in a UTF-8 editor silently re-encodes the whole file. A script makes the redaction reviewable and repeatable when a fixture is refreshed.
- Why the redaction is recorded in the script rather than applied and forgotten: the next person capturing a fixture needs the same list, and a reviewer needs to see what was considered identifying.

### 3. Hand-rolled TIS-620 encoder instead of an `iconv` dependency

`TextDecoder` handles windows-874, but `TextEncoder` is UTF-8-only, so re-encoding after redaction needs its own path.

- TIS-620 is a trivial single-byte mapping: `0x00`–`0x7F` are ASCII, and `0xA1`–`0xFB` map linearly to `U+0E01`–`U+0E5B`. ~10 lines, no dependency, and it fails loudly on any character outside the map (which is the right behavior — a fabricated name must not introduce characters the registrar could never emit).
- Alternative (`iconv-lite` as a devDependency): more general than needed and adds a dependency to a project whose `pnpm-workspace.yaml` pins releases deliberately; rejected.
- Alternative (redact only ASCII fields, leave the Thai name): avoids encoding entirely, but the student name is the most identifying field on the page; rejected.

### 4. Two tiers: an uncommitted corpus of every real term, and a small committed synthetic set

```
   tier 1   preview/corpus/     every (year, semester) the account has, raw bytes,
              |                 unmodified, gitignored — never committed
              |                 value: proves the scrapers survive real registrar
              |                        output across years, not just one page
              |
              |   redact.mjs (decision 2) + splice (decision 5)
              v
   tier 2   preview/fixtures/   3 synthetic pages, redacted — committed
                                value: one page per page-state that packs every
                                       scenario the specs name
```

`report_studytable.php` lists the account's real years in `select#year`; each `(year, semester)` is a POST to `report_studytable_show.php`, and `services/reg.js` already has `fetchTermOptions` / `fetchStudyTable` / `fetchExamTable` for exactly those calls. The corpus is captured by running those from the browser console on a logged-in reg page — same origin, existing session, the same request the extension already makes.

- Why the corpus is **not committed**: it is dozens of pages of unredacted personal data. Redacting and reviewing all of it costs more than it returns, and its value is a one-time sweep ("does the scraper handle every real term this account has?"), not a durable artifact. Gitignored, kept local.
- Consequence, accepted: the corpus sweep is not reproducible on another machine or in CI. The project has no CI and no test framework, so nothing is lost that existed before.
- Why three synthetic fixtures and not one: `study-table-empty` is a *different page state* from a populated table — an unregistered term renders a page with no table for `getinfo` to read, so it cannot coexist with the populated case. Study table and exam schedule are different URLs, so they cannot share a file either. Three is the floor:

| Fixture | Page state | Packs |
|---|---|---|
| `study-table-mega` | populated term | all 7 days incl. weekend, lecture-only / lab-only / lecture+lab pairs, an 08:00 start and a 20:00 end flush at the grid edges, a 15-minute block, two subjects overlapping in time, a long subject name, an empty room/building |
| `study-table-empty` | unregistered term | `getinfo` → `null`, the empty state |
| `exam-mega` | mid-term exam page | multi-subject date groups (`rowspan`), alternating day backgrounds, a missing time (`ไม่ทราบ`), `จัดสอบเอง` (no date), a duplicate exam-type merge (`A/B`), a subject with no exam time sorted last |

- A fourth `exam-final` fixture is **not** included: switching mid/final is a real form POST and a full page reload, which `refactor-exam-ui` design decision 4 keeps live-only. A fixture cannot exercise it, so one would only add bytes to review.

### 5. Synthetic fixtures are spliced from real rows — structure is never authored

The rule: **copy whole real elements out of the corpus, edit only their text content.** Never write a `<tr>` by hand.

Both scrapers index into the DOM by child position, so an authored row that is structurally off by one node produces a fixture the scraper "passes" against while the real page would fail — the exact opposite of what this change is for. Splicing from real rows makes that impossible by construction.

Invariants the splice must preserve, asserted before a fixture is written:

| Page | Invariant | Source |
|---|---|---|
| study table | every subject `<tr>` has exactly `childNodes.length == 37` | `R.filter(row => row.childNodes.length == 37)` in `scrapeTable` |
| study table | the first row passing that filter is the header and is dropped | `R.drop(1)` |
| study table | child indices 5 / 9 / 13 / 17 / 21 / 25 / 29 / 33 / 35 = id / name / credits / lecture sec / lab sec / periods / room / building / remark | `scrapeTable` |
| study table | period cell children are partitioned by text containing `ท`/`L` vs `ป`/`P`; room and building read `[0]` = lecture, `[1]` = lab after dropping empties | `scrapeTable` |
| exam | subject rows start at `tr:nth-child(17)` and step by 2 — separator rows sit between them, so rows are spliced in **pairs** | `FIRST_SUBJECT_ROW`, `SUBJECT_ROW_STEP` |
| exam | header fields read from `tr:nth-child(4/6/8/10)` under `EXAM_TABLE_BODY` | `scrapeHeader` |
| exam | data cells are the even-indexed children of a row | `cellTexts` |

- Alternative (author a minimal HTML page that satisfies the selectors): far smaller and easier to read, but it encodes the developer's *belief* about the registrar's markup rather than the markup. Rejected — the belief is the thing under test.

### 6. Every synthesized case is tagged fidelity or robustness

The account has one student's data, so the corpus will not contain every scenario. Cases that must be created are split into two kinds, and each is labelled in the fixture:

| Kind | Means | Examples |
|---|---|---|
| **fidelity** | the registrar really emits this; the corpus has it somewhere and it was copied in | lecture+lab on one subject, 08:00 / 20:00 edges, a 15-minute block, multi-subject date groups |
| **robustness** | the registrar has never been observed emitting this; the code handles it defensively and the fixture is fabricated to reach that branch | `dayIndexOf` → `-1`, `monthNumberOf` → `NaN`, empty room/building |

- Why the labels matter: a fixture is read months later with no memory of how it was built. Unlabelled, a fabricated `-1` day looks like evidence the registrar emits unknown day names. It is not — it is evidence the renderer does not crash when it does.
- Cases sitting between the two, where the text is plausibly real but the surrounding structure was never observed (`จัดสอบเอง` in the date cell, an `A/B` merged exam type), are tagged **robustness** with a note, not fidelity. Promote them if a real one later turns up in a corpus sweep.
  - **Both were promoted.** The task 2.4 sweep found 20 real `จัดสอบเอง` rows and 26 real merged exam types in the corpus, so both are **fidelity** and get copied rather than fabricated. The guess above was wrong in the safe direction, which is the point of tagging.
  - The sweep also settled the other way around for the study table: 08:00 starts, 20:00 ends, 15-minute blocks, Saturday classes, overlapping subjects and unknown day names are all **absent** from 58 real subjects, so every one of them is fabricated and tagged **robustness**. Task 2.5 holds the full table.
- English-language registrar pages are a genuine fidelity gap worth closing during capture: `dayIndexOf` accepts `Mon`, the period partition accepts `L`/`P`, and `monthNumberOf` accepts `Nov`, so the code claims support that has never been proven against a real page. Look for a language toggle while capturing the corpus; if none is reachable, record that as a known gap rather than fabricating an English page.

### 7. Page selection by query parameter, one entry point

`preview/main.js` reads `?page=study|exam` (default `study`), loads the matching fixture, scrapes it, and mounts the matching component. `index.html` gets links to both.

- Why not two HTML entry points: the load-decode-scrape sequence is shared; duplicating it in a second entry is how the two drift.
- `regStub.js` grows a map from `(year, semester)` to a fixture document so the study table's term switcher resolves to real pages instead of the empty document it returns today.

## Risks / Trade-offs

- [A fixture leaks personal data into git history, where deleting it later does not remove it] → Redaction runs at capture time, before the file is ever written to `preview/fixtures/`; the fixture diff is reviewed as text before the first commit; the existing `fixture.js` values are replaced in the same change. Treat a leak as requiring history rewrite, not a follow-up commit.
- [The corpus — dozens of unredacted real pages — gets committed by accident] → `preview/corpus/` is added to `.gitignore` in the same task that creates it, before any capture runs. A `git status` check is part of that task, not an afterthought.
- [A synthesized case makes the scraper pass against markup the registrar never emits] → Decision 5: rows are spliced from real corpus elements with only text edited, and the structural invariants are asserted before the fixture is written. Decision 6: anything still fabricated is labelled `robustness`, so no reader mistakes it for observed behavior.
- [The mega-fixture becomes hard to review — one page with ~20 subjects and every edge case at once] → Accepted trade-off: fewer files means less surface to check for leaked data, and the study-table grid genuinely holds that many subjects. If a case cannot be seen clearly among the others, split it out rather than declaring it verified.
- **[CLOSED, and it was hiding a real bug]** The "registrar's own stylesheet is untestable offline" gap recorded above was closed by `fix-registrar-css-bleed` (2026-09-03). `registrar.css` is a public asset with no personal data, so it is now committed as a fixture and served by both the harness and the extension walk. The gap was not inert: it concealed `SELECT { font-size: 11px; font-family: Microsoft Sans Serif }` overriding the dock's term selects, because an unlayered registrar rule beats any Tailwind utility in `@layer utilities`. Worth remembering as a case where a documented, accepted testing gap was where the defect lived.
- [The corpus sweep passes, the fixtures render, and the extension still breaks on a page the account never had (another faculty's layout, a different programme's table)] → Out of reach with one account. Recorded as a known limit; the live in-Chrome walk stays in every change's task list.
- [Fixtures go stale — the registrar changes its HTML and the preview keeps passing] → Fixtures are a floor, not a ceiling: the final in-Chrome walk against the live site stays in every change's task list. Record the capture date in each fixture so staleness is visible.
- [The harness renders correctly but the extension does not, because `boot.js` and the exam stylesheet removal never run] → Stated as a non-goal above; the live walk remains the only evidence for those two behaviors.
- [The hand-rolled encoder mangles a character silently] → It throws on any unmapped code point rather than substituting; round-trip the fixture (encode → decode) and compare against the redacted string before writing.
- [Scoping creep: a scraper "needs a small change" to be callable from the harness] → Proposal states `src/` is untouched. If that turns out to be false, stop and raise a separate change rather than editing shipped code under a tooling task.

## Migration Plan

Additive; nothing existing depends on `preview/`. Rollback = delete `preview/fixtures/` and revert the harness files. The one non-revertible part is the `fixture.js` de-identification, which should not be reverted.
