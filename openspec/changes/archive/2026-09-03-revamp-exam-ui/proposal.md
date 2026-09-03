# revamp-exam-ui

## Why

The exam page never had a design pass. `refactor-exam-ui` decomposed it into components and said so explicitly — "no visual redesign (colors, layout, typography)" — while the study table went through the pass that produced `DESIGN.md`. What shipped is the pre-redesign look wearing new component boundaries.

The gap is measurable, not a matter of taste:

```
                   study table                    exam page
   design tokens   ink 11 · line 13 · hover 17    hover 2 · kmitl 1
   colours in use  ink/ink-2/ink-3 line canvas    slate-100 slate-200 slate-900
   chrome          docked 56px full-width band    floating buttons at bottom-4 right-4
   surface         rounded sheet + resting shadow no sheet; the table floats on canvas
   type            11 / 13px                      text-sm (14px)
   language        Thai throughout                the toggle reads "New Design"
```

`slate-*` appears nowhere in `DESIGN.md`. Those are leftovers from before the system existed.

Two of the system's own named rules are broken on this page:

- **The Reserved Band Rule** — "Chrome does not overlap content. The dock occupies a fixed 56px band and the page reserves 80px of bottom padding." The exam page floats its buttons over the content instead.
- **The Local Language Rule** — "Every string the interface renders is Thai." The mode toggle renders `New Design` / `Old Design`, and it labels its *current state* rather than the action, the opposite of the study table's `แบบเดิม`.

There is also an information-architecture problem visible at a glance: the remark column repeats `สอบในช่วงสอบปลายภาค (ในห้องสอบ)Examination during the final exam (in the examination room)` on four consecutive rows, taking more width than the subject names it sits beside.

## What Changes

- Re-skin the exam page onto the design system: `ink` / `ink-2` / `ink-3` for text, `line` for rules, `canvas` behind a white sheet with the `resting-sheet` shadow and 12px radius, and the 11/13px type ramp. No `slate-*` survives.
- **Keep the table.** Students read this page to compare date, time and room down columns; cards would trade that for nothing.
- **Merge the dock.** The exam page adopts the same docked toolbar as the study table instead of its own floating bar, which means `ExamControls.svelte` goes away and `Controls.svelte` serves both pages.
- **Mid/Final becomes a segmented control** inside the sheet, in the design system's own vocabulary, replacing the bare native `<select>` at the top-left. It stays inside the capture frame and it keeps posting the form.
- Rebuild the header block on `HeaderCard`'s language — identity line, context line, term pill — instead of four centred paragraphs.
- Give the remark column a width and a truncation behaviour so it stops dominating the row.
- Promote `DESIGN.md` from the study table's system to the product's: rename it, and add the exam page's components (table rows, date group, segmented control) to it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `exam-schedule-render` requires date grouping, ordering, the per-subject fields, the `ไม่ทราบ` fallbacks, mid/final switching and the old-design toggle. Every one of those survives unchanged; only appearance moves. `image-export`'s rule that controls must not appear in the export is likewise unaffected — merging into the dock moves controls further out of the frame, not into it.

This change sets `skip_specs: true`. The appearance commitment belongs in `DESIGN.md`, which is this project's contract for how things look; the openspec specs are its contract for how things behave, and behaviour is not moving.

## Impact

- `src/features/exam-schedule/ExamSchedule.svelte` — sheet + canvas layout, adopts `Controls.svelte`.
- `src/features/exam-schedule/ExamHeader.svelte` — rebuilt on the header-card language; the hidden form and its empty `student_id` quirk stay exactly as they are.
- `src/features/exam-schedule/ExamTable.svelte` — design-system tokens, remark column constrained.
- `src/features/exam-schedule/ExamControls.svelte` — **deleted**; `Controls.svelte` takes over.
- `src/features/study-table/Controls.svelte` — becomes shared, so its study-only pieces (term pickers, customize menu) must be optional rather than assumed.
- `DESIGN.md` — renamed to the product's system; gains the exam page's components.
- `openspec/config.yaml` — the note that the exam page is deliberately un-redesigned stops being true and has to go.

Notable consequence: `refactor-exam-ui` design decision 3 deliberately left the two dock button styles duplicated, to be resolved once a third example existed. Merging the docks resolves it by **convergence** instead — the second style stops existing. That also removes the last argument for `cva`, which `adopt-ui-primitives` had deferred pending a third consumer.

Out of scope: the grades page, the shadow-root overlay, any change to scraping or the exam form POST mechanism, and `cva`.
