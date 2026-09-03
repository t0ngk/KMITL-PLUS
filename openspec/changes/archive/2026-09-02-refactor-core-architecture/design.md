# Design: Core Architecture Refactor

## Context

See proposal.md — Why. Current layout and debt: two content scripts with duplicated boot logic; exam scraping inlined and unguarded; index-coupled scraping; one 449-line legacy-mode component; `study-table-navigation` feature already follows the target pattern (pure scraper + fetch service) and is the template. Acceptance criteria = the five capability specs in `openspec/specs/` after `capture-baseline-specs` archives.

## Goals / Non-Goals

**Goals**
- One obvious place per concern; adding a registrar page = new feature folder + manifest line.
- Runes mode everywhere — eliminate the legacy static-dependency-analysis bug class.
- All scraping pure, guarded, and callable on both the live `document` and DOMParser documents.

**Non-Goals**
- New user-facing behavior (e.g., exam-page year picker) — future changes on top of the new structure.
- TypeScript migration, test framework introduction, dependency changes.
- Visual redesign; markup/styles move but pixels stay.

## Decisions

**D1: Feature-folder layout.**
```
src/
  content/studyTable.js        -> boot(features/studyTable)
  content/examSchedule.js      -> boot(features/examSchedule)
  core/boot.js                 -> capture oldHtml, inject font, clear body,
                                  mount component, catch scrape errors -> fallback to original page
  services/reg.js              -> fetchDocument (windows-874 + DOMParser),
                                  study table GET/POST, exam table POST
  features/study-table/        -> scraper.js, StudyTable.svelte, sub-components
  features/exam-schedule/      -> scraper.js, ExamSchedule.svelte
  shared/                      -> DownloadButton, TermPicker, theme.js, Credit.svelte
```
Rejected: flat `lib/` split by kind (components/util) — that's the current shape; it scatters one feature across three directories.

**D2: Boot contract.** `boot({ scrape, component, propsFrom })`: on scrape failure or null result, leave the original page untouched (better than today's blank page) and log. This makes the guard requirement structural instead of per-page discipline.

**D3: Runes migration.** `$state`/`$derived`/`$props` throughout; derived grid slots (`$derived.by`) replace template function calls, so reactivity is runtime-tracked and the `createTimeSlot` trap class disappears. Split StudyTable into: `Grid.svelte`, `HeaderCard.svelte`, `CustomizeMenu.svelte`, `Controls.svelte` (picker + download + toggle); parent holds term state.

**D4: Exam scraper extraction.** Port `content/examSchedule.js` scraping (row walk, month map, Buddhist-year conversion, dedupe/merge of exam types, grouping by date) into `features/exam-schedule/scraper.js` as pure functions with the same guard contract as the study table scraper. Content script shrinks to a `boot()` call. Existing date-fns usage moves along.

**D5: Keep index-based scraping, centralized.** Rewriting scrapers to structural/label-based matching is tempting but risks behavior drift with no spec coverage for edge pages; indexes stay, but each scraper documents its expected row shape and returns null on mismatch (guards). Structural matching is a future change once baseline specs are trusted.

**D6: Order.** Refactor lands only after `capture-baseline-specs` is archived. Each phase must keep `pnpm lint` + `pnpm build` green and the extension loadable; live smoke per phase against the specs' scenarios.

## Risks / Trade-offs

- [Big-bang file moves make review hard] → phase by feature: core+services first (no behavior route change), then study table, then exam schedule; extension loadable after each phase.
- [Runes migration subtly changes update timing] → spec scenarios (term switch, theme customize, empty state) are the regression list; walk them per phase.
- [Old-design toggle depends on captured pre-mount HTML] → boot() owns the capture; scenario "toggle old design" in both render specs guards it.
- [No automated tests exist] → out of scope here; specs + manual scenario walks are the net. Test harness is a candidate follow-up change.

## Migration Plan

Three phases (core/services → study-table feature → exam-schedule feature), each a loadable build. Rollback = revert the phase commit; no data or server contract involved.

## Open Questions

- ~~Naming: `features/study-table` vs `features/studyTable`~~ — **resolved at implementation**: feature folders use kebab-case (`features/study-table`, `features/exam-schedule`); Svelte components keep PascalCase filenames. Content-script entry files keep their existing camelCase names (`src/content/studyTable.js`, `src/content/examSchedule.js`) because crxjs uses the `manifest.json` paths as build entries.
