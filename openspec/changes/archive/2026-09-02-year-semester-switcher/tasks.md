# Tasks: year-semester-switcher

## 1. Fetch layer

- [x] 1.1 Create `src/lib/util/regFetch.js` with `fetchTermOptions()` (GET `report_studytable.php`, parse `#year` option values) and `fetchStudyTable(year, semester)` (urlencoded POST `command=&year=..&semester=..` to `report_studytable_show.php`, decode via `TextDecoder("windows-874")`, return `DOMParser` document); verify with `pnpm lint` and a manual console run on the live page returning real year list and a non-empty parsed table for a known term.
  - Code complete. Verified offline with a stubbed `fetch`/`DOMParser`: relative URLs, POST body exactly `command=&year=2566&semester=1`, windows-874 bytes decode to correct Thai, `#year` options trimmed/deduped, missing `#year` → `[]`, non-2xx → throw. `pnpm lint` passes. **Live console run on the registrar page still pending.**

## 2. Scrape robustness

- [x] 2.1 Guard `getinfo` and `scrapeTable` in `src/lib/util/studyTable.js` against missing/sparse tables (return `null`/empty array instead of throwing); verify by feeding an empty `DOMParser` document and confirming no exception and empty results.
  - Verified with a DOM-stub harness (no test deps added): `getinfo` returns `null` for null root / no tbody / empty tbody; sparse tbody yields empty-string fields; `scrapeTable`, `flattenStudyTable`, `sortByDay` return `[]` for null/empty roots; malformed period text is dropped instead of throwing; normal rows still parse identically.
- [x] 2.2 Ensure content script initial mount survives a sparse live page (no blank-page crash) by handling `null` info/empty schedule at mount; verify by simulating a stripped DOM before mount logic runs.
  - `src/content/studyTable.js` now passes `info?.field ?? ""` and an empty schedule mounts the component's empty state. Verified via the stub pipeline (null root → `null` info + `[]` schedule, no exception).

## 3. Picker UI + in-place switch

- [x] 3.1 Add year/semester picker to `studyTable.svelte` floating controls (years from `fetchTermOptions()`, semesters [1,2]), initialized from the currently displayed term; verify picker renders with server-derived years on the live page.
  - Code complete; picker sits in the fixed bottom-right control bar, years loaded in `onMount`, selection initialized from the scraped header (digits extracted defensively, falls back to first server year / semester 1). **Live render check pending.**
- [x] 3.2 On picker change, fetch the selected term via `fetchStudyTable`, re-run scrape pipeline, and swap `schedule` + header state in place (no page reload); verify switching to a past term with data renders that term's subjects and header.
  - Code complete (props copied into internal `currentSchedule`/`header` state, theme regenerated on swap). **Live switch check pending.**
- [x] 3.3 Render an explicit empty state when a fetched term has no rows, keeping the picker usable; verify by selecting a term known to be empty.
  - Code complete: "ไม่มีข้อมูลภาคเรียนนี้" replaces the grid while the header (with the selected term) and the picker stay rendered. **Live empty-term check pending.**
- [x] 3.4 Keep previous table rendered and surface an error indication when the fetch fails; verify by switching while offline (devtools network block).
  - Code complete: on failure the previous table stays, an error pill ("โหลดตารางเรียนไม่สำเร็จ") shows next to the picker, and the selects revert to the displayed term. **Live offline check pending.**

## 4. Capture + regression

- [x] 4.1 Confirm the picker is excluded from the snapdom PNG (lives outside the captured `table` ref) and the exported image shows the selected term's header; verify by downloading images for two different terms.
  - Structurally guaranteed: the picker is inside the `fixed` control bar, outside the `bind:this={table}` capture root; the captured header renders the switched term. **Live download comparison pending.**
- [x] 4.2 Full regression on the live page as a graduated account: initial load, switch across all listed years, Thai text integrity (no mojibake), theme customize + download still work; verify `pnpm lint` and `pnpm build` pass.
  - `pnpm lint` and `pnpm build` pass (no new warnings). Live regression performed by the user on a graduated account: switching year/semester now swaps the table in place. Two fixes came out of live testing: (1) select values re-sync via per-option `selected` after server options load, (2) `createTimeSlot` takes the schedule as an explicit argument so legacy-mode static dependency analysis re-renders the grid on swap (plus Reset Theme call updated to the new `makeTheme(schedule)` signature).
