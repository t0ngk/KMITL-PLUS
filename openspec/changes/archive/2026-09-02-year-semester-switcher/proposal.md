# Year/Semester Switcher for Study Table

## Why

Graduated students lose the menu link to `report_studytable.php` (the year/semester selector page), so they can no longer navigate to past study tables even though the server still serves the data. Verified live (2026-09-02, graduated account): `report_studytable.php` is still directly accessible and lists the student's real academic years (2564–2567), and a direct `POST year=<BE year>&semester=<n>` to `report_studytable_show.php` returns the full historical table (31 rows for 2566/1). Only the navigation path is broken — the extension can restore it.

## What Changes

- Add a year/semester picker to the extension's study table view (`studyTable.svelte`), rendered alongside the existing floating action buttons.
- Year and semester options are fetched live from `report_studytable.php` (same-origin, session cookie) and parsed from the server's `#year`/`#semester` selects — no guessing or hardcoded ranges.
- Switching year/semester fetches the new table in place (SPA-style, no page reload): `POST` to `report_studytable_show.php`, decode the `windows-874` response, parse with `DOMParser`, re-run the existing scrape pipeline, and update component state.
- Guard the scrape pipeline against empty/partial result pages (currently `getinfo`'s `querySelectorAll("tbody")[1]` throws on sparse pages and blanks the whole extension).

## Capabilities

### New Capabilities
- `study-table-navigation`: fetching available academic years/semesters from the registrar server and switching the rendered study table between them without a page reload.

### Modified Capabilities

(none — existing rendering/scraping behavior unchanged; scrape robustness guard is an internal fix, not a requirement change)

## Impact

- `src/lib/components/studyTable.svelte` — new picker UI + in-place data swap.
- `src/lib/util/studyTable.js` — scrape functions must accept a parsed `Document`/element from `DOMParser` (already pure; minor generalization) plus empty-table guards.
- `src/content/studyTable.js` — initial mount unchanged; may pass current year/semester into the component.
- New util for registrar fetches: POST body encoding, `TextDecoder("windows-874")`, option-list parsing.
- No manifest changes: all requests are same-origin from the content script on `report_studytable_show.php`.
- No new dependencies.
