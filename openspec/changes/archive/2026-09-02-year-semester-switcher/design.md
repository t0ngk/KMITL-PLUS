# Design: Year/Semester Switcher (SPA-style, Approach B)

## Context

See proposal.md — Why. Verified live against a graduated account (2026-09-02):

- `GET report_studytable.php` still works; its `#year` select lists the student's real years (2564–2567), `#semester` lists 1/2 for the chosen year (server refreshes semester options per year via a self-POST `RefreshEdit()`).
- `POST report_studytable_show.php` with `command=&year=2566&semester=1` (urlencoded) returns the full historical table (31 `<tr>`, real subject codes) for a graduated session. Header echoes the requested term.
- Responses are windows-874/TIS-620; `fetch().text()` mojibakes Thai. `TextDecoder("windows-874")` over `arrayBuffer()` decodes correctly.
- Current pipeline: content script on `report_studytable_show.php` scrapes `document` via pure functions in `src/lib/util/studyTable.js` (`getinfo`, `scrapeTable` — both take a root element) and mounts `studyTable.svelte` with the results.

Constraints: MV3 content script, same-origin requests only (session cookie rides along automatically), no background/service worker needed.

## Goals / Non-Goals

**Goals**
- In-place term switching: no page reload, component state swap only.
- Server-derived option lists.
- Survive empty/partial responses without blanking the extension.

**Non-Goals**
- Exam schedule page picker (same pattern, separate change).
- Caching/offline history of past tables.
- Supporting the pre-extension "old design" toggle view for fetched terms (old design shows whatever page the content script originally replaced).

## Decisions

**D1: SPA fetch + DOMParser over form-POST reload.**
The scrape utils are already pure functions over a DOM root, so `new DOMParser().parseFromString(decodedHtml, "text/html")` plugs straight in. Chosen over the exam-page-style hidden-form reload because switching becomes instant and state (theme colors, customize menu) survives. Rejected alternative: form POST navigation — simpler but reloads, loses component state, and was observed to be flaky (POST body dropped in at least one embedded-browser test).

**D2: Fetch helper module `src/lib/util/regFetch.js`.**
One place owns: urlencoded POST body building, `arrayBuffer()` + `TextDecoder("windows-874")`, `DOMParser` parse. Two functions:
- `fetchTermOptions()` → GET `report_studytable.php`, parse `#year` option values (semesters fixed 1/2; see D5).
- `fetchStudyTable(year, semester)` → POST `report_studytable_show.php` body `command=&year=..&semester=..`, return parsed `Document`.
Relative URLs — content script runs on the same directory path, so `report_studytable.php` resolves correctly on both `www.` and `new.` hosts covered by the manifest match.

**D3: Component owns switch state; content script unchanged in role.**
`studyTable.svelte` gains `year`/`semester`-aware picker state and on change runs `fetchStudyTable` → `getinfo`/`scrapeTable`/`flattenStudyTable`/`sortByDay` → replaces `schedule` + header props locally (convert props it needs into internal state initialized from props). Content script keeps doing the initial scrape from the live page — first paint stays instant, no extra request.

**D4: Empty/partial-page guards in scrape utils.**
`getinfo` currently dereferences `querySelectorAll("tbody")[1]` and fixed child indexes — throws on sparse pages. Guard: if expected nodes are missing, return `null` / empty schedule instead of throwing; component renders an empty state ("ไม่มีข้อมูลภาคเรียนนี้") and keeps the picker usable. Same guard protects the initial mount (crash currently blanks the whole page).

**D5: Semester options fixed to [1, 2].**
The server's semester list is year-dependent only via a full selector-page round-trip (`RefreshEdit` self-POST). Not worth a request per year change; POSTing a semester with no data safely returns an empty table, which D4 renders as an empty state. Revisit only if summer term (3) turns out to exist for some students.

**D6: Picker placement + capture exclusion.**
Picker lives with the floating action buttons (fixed, outside the captured `table` element ref), so the existing snapdom capture excludes it for free — same mechanism that keeps the buttons out of the PNG today. Selected term must be visible inside the captured header (it already is: faculty/semester/year block).

## Risks / Trade-offs

- [Registrar layout change breaks parsing] → all parsing already lives in `studyTable.js`/`regFetch.js`; guards from D4 degrade to empty state instead of crash.
- [Session expiry mid-browse: fetch returns login redirect HTML] → `getinfo` guard returns null → empty state; acceptable. Optionally detect login page markers and message "session หมดอายุ".
- [windows-874 TextDecoder availability] → supported in all Chromium targets of this extension (MV3, Chrome 88+); no polyfill needed.
- [Fetched doc differs subtly from live doc (no scripts run)] → scraping is static text/structure only; no script-dependent content observed in the table.

## Migration Plan

Pure additive UI; ship in a normal release. Rollback = revert the release. No stored state, no server contract changes.

## Open Questions

- Empty-state copy/design (text only vs. illustration) — cosmetic, decide during implementation.
- Whether to show semester 3 if a real account ever exposes it (D5 revisit trigger).
