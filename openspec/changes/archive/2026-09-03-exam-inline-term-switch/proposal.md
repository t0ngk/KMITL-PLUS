# exam-inline-term-switch

## Why

Switching between กลางภาค and ปลายภาค flickers. The project owner sees it on the live page; it does not reproduce locally because the harness answers from a fixture with no network round trip.

The cause is structural, not cosmetic. The exam round switch is a full-page form POST, so the browser tears the document down and paints whatever it likes until the content script runs again:

```
   click -> [ours]  ->  browser destroys the document  ->  [not ours at all]  ->  new page loads
                                                            ^^^^^^^^^^^^^^^
                                                        the flicker lives here;
                                                        our JS is not even running
```

A loading state — the obvious first idea — cannot cover it. An overlay only spans the moment before unload; after that the browser owns the screen until our script mounts. It would likely read worse: dim, then flash, then the new page.

The study table does not flicker because it never navigates. It fetches in place, dims the sheet, re-scrapes and swaps the data.

**The equivalent for the exam page is already written and has never been called.** `services/reg.js` exports `fetchExamTable(year, semester, studentId, midOrFinal)`, and its own docstring says it was prepared "for when the switch moves in-page". `preview/regStub.js` already stubs it. `refactor-exam-ui` design decision 4 deferred using it with a stated reason — loading state, error handling and the in-between view "cannot be verified without a live session". That reason expired: the preview harness, the committed fixtures and the intercepted-request extension walk now verify exactly this flow on the study table every single run.

## What Changes

- The exam round switch becomes an in-page fetch through `fetchExamTable()`. No navigation, so the flicker cannot occur.
- While a round is loading, the sheet dims and the dock's status line says so — the same treatment the study table already uses, from the dock both pages now share.
- A failed fetch keeps the current round on screen with a message, rather than a blank page. This follows the project's standing rule that failures show the previous good state.
- **The old-design view starts tracking what is displayed.** Today `oldTable` / `oldDesign` is the HTML captured once at boot, so after switching term or round the "แบบเดิม" toggle shows a *different* term than the redesigned view does. This is fixed on **both** pages: every successful in-page fetch updates the stored original HTML.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `exam-schedule-render`: switching rounds no longer reloads the page, and the old-design view shows the round currently displayed rather than the one loaded at boot.
- `study-table-render`: the old-design view shows the term currently displayed rather than the one loaded at boot. The study table's fetch already existed; only what the toggle shows afterwards changes.

Both are behaviour a student can observe, and both specs currently say "captured at load time" in as many words, so this cannot be left to `DESIGN.md`.

## Impact

- `src/features/exam-schedule/ExamSchedule.svelte` — holds schedule, data, loading and error as state instead of rendering props directly; calls `fetchExamTable`.
- `src/features/exam-schedule/ExamHeader.svelte` — the segmented control calls a handler instead of submitting the form. The hidden `<form>` and its inputs are no longer needed for switching; whether they stay is decided in design.
- `src/features/study-table/StudyTable.svelte` — updates its stored original HTML after each successful term fetch.
- `src/features/study-table/Controls.svelte` — its status line and dim already exist; the exam page starts using them.
- `openspec/specs/{exam-schedule-render,study-table-render}/spec.md` — updated on archive.
- `openspec/config.yaml` — the `await tick()` note about the round switcher describes a mechanism that is going away and must be replaced rather than left to mislead.

The `student_id` field keeps being sent empty, matching what the form has always posted and what the server expects — that quirk is documented and load-bearing, and this change does not touch it.

Out of scope: the grades page, the shadow-root overlay, any visual change beyond the loading treatment, and the exam page's own year/semester selection (the registrar page has none; only the round switches).
