# Design — exam-inline-term-switch

## Context

See proposal.md for why a loading overlay cannot fix the flicker. Current state that shapes the approach:

- `ExamHeader.svelte` holds a hidden `<form>` posting `year`, `semester`, an intentionally empty `student_id`, and `mid_or_final`. The segmented control writes the round into a hidden input, awaits a tick, and calls `form.submit()`.
- `ExamSchedule.svelte` renders `schedule`, `data` and `oldDesign` straight from props. It has no state beyond the view mode, the capture flag and the capture target.
- `StudyTable.svelte` is the shape this change copies: props are read once through `untrack` as initial values, then the component owns `currentSchedule`, `header`, `switching` and `switchError`, and `selectTerm()` fetches, re-scrapes and swaps.
- `services/reg.js` already exports `fetchExamTable(year, semester, studentId, midOrFinal)`, unused. `preview/regStub.js` already stubs it.
- `Controls.svelte` is shared by both pages and already renders a status line showing `กำลังโหลด…` while `switching`, and the sheet already dims via `opacity-60`. Both are gated behind the study table's own state today.
- `boot.js` captures `document.body.innerHTML` once, before anything is touched, and passes it down as `oldTable` / `oldDesign`.

## Goals / Non-Goals

**Goals:**

- Switching rounds never unloads the document, so the flicker cannot happen.
- Loading and failure are visible and follow the project's existing rule: a failure shows the previous good state, never a blank one.
- The old-design toggle stops lying about which term it is showing, on both pages.

**Non-Goals:**

- No visual redesign beyond the loading treatment.
- No change to scraping, grouping, export, or the empty-`student_id` quirk.
- No year/semester selection on the exam page — the registrar's exam page offers only the round.

## Decisions

### 1. Copy the study table's shape rather than invent a second one

`ExamSchedule.svelte` takes its props as initial values through `untrack`, then owns `currentSchedule`, `currentData`, `switching` and `switchError`, with a `selectRound()` that mirrors `selectTerm()`.

- Why copy rather than abstract: two consumers of the same shape is not yet evidence of the right abstraction, and the same restraint that kept `cva` out applies here. A shared `useTermSwitch` helper invented for two call sites would be guessing at the third.
- The mirror is deliberate and worth stating: anyone who understands the study table's switch now understands the exam page's, and any bug found in one is worth checking in the other.

### 2. The hidden form stays, and stops being the mechanism

The `<form>` and its inputs remain in the DOM; the segmented control no longer submits it.

- Why keep it: it is the only place recording what the registrar expects — the field names, and the empty `student_id` with the comment explaining that the server resolves the student from the session. Deleting it deletes that documentation, and `fetchExamTable` posts the same fields.
- Why not submit it: submitting is the navigation this change exists to remove.
- The alternative — delete the form and move its knowledge into a comment on the fetch — is cleaner markup and worse provenance. Rejected; the form is where the registrar's contract has always been written down.

### 3. `oldHtml` follows the displayed term, on both pages

Every successful in-page fetch replaces the stored original HTML with the body of the document just fetched.

```
   before                              after
   ------                              -----
   boot captures oldHtml once          boot captures oldHtml once
   term switch replaces data only      term switch replaces data AND oldHtml
        |                                   |
   "แบบเดิม" shows the boot-time term    "แบบเดิม" shows what you are looking at
```

- This is a **pre-existing defect in the study table**, not something the exam page introduces. Nobody had reported it because switching term and then toggling old design is an unusual path. Fixing it on the exam page alone would leave the two pages disagreeing about what the toggle means.
- Both specs say "captured at load time" in as many words, which is why this needs a spec delta rather than a quiet fix.
- The fetched `Document` is already in hand for scraping, so its `body.innerHTML` is free.

### 4. Loading and failure reuse what the dock already has

`switching` dims the sheet and drives the dock's status line; `switchError` puts a message in the same slot. Both already exist for the study table in the shared `Controls.svelte`.

- Why not a spinner or a skeleton: the study table established dim-plus-status as this system's answer, `DESIGN.md` records the dim as one of two motion tokens, and inventing a second loading language for the sibling page would be the same inconsistency this page was just revamped to remove.
- On failure the segmented control must return to showing the round actually displayed, not the one the student clicked — otherwise the control claims a state the page is not in. The study table already does this with `selectedYear`/`appliedYear`; the exam page needs the same pairing.

### 5. Where the deferral came from

`refactor-exam-ui` design decision 4 considered moving this switch in-page and deferred
it, on the stated grounds that the loading state, the error handling and the in-between
view "cannot be verified without a live session". That was true when it was written.

`preview-harness-fixtures` then built the corpus, the committed fixtures and the
`preview/` app, and later changes added the intercepted-request extension walk. The
study table's own in-page switch has been verified that way on every change since. So
the reason expired rather than being overruled — nothing about the judgement was wrong,
the thing it was waiting on got built.

Two states still had no way to appear in a harness that answers instantly from a
fixture: loading, and failure. `preview/regStub.js` gained `?slow=<ms>` and `?fail=`
for exactly those two, which is what makes decision 4's remaining objection answerable
rather than merely stale.

### 6. The scenario walks become committed scripts (decided during apply)

Task 5.2 asks for the new scenarios to be added to "the standing spec walk". There was
no such thing: every walk so far was an ad-hoc Playwright script in a scratchpad that
died with its session, which is why each change re-derived one. The task cannot be done
honestly without creating the artifact it assumes.

So `preview/walk.mjs` (`pnpm walk`) and `preview/extwalk.mjs` (`pnpm walk:ext`) are now
committed, and `playwright` is a devDependency. This contradicts the Migration Plan as
originally written; the plan below records the change rather than hiding it.

- `pnpm walk` starts the preview server itself, walks the offline scenarios of both
  specs, prints pass/fail per scenario and exits non-zero on any failure.
- `pnpm walk:ext` loads the built extension into real Chrome with every reg request
  intercepted. It is the only thing that exercises the manifest, content-script
  injection, and the registrar's own CSS.
- `preview/regStub.js` gained `?fail=` and `?slow=<ms>` because the loading and failure
  states have no duration when a fixture answers instantly.

### 7. Refreshing loses the chosen round, and that is accepted (decided during apply)

Reported by the project owner after apply: choose ปลายภาค, press refresh, and the page
comes back on กลางภาค. Measured on the built extension in Chrome, and it is real on both
pages:

```
   exam   : กดปลายภาค  -> reload -> ปุ่ม active = กลางภาค
   study  : สลับไปภาค 1 -> reload -> กลับภาค 2 (blocks 0 -> 9)
```

This is the price of decision 1, and the risk list below did not see it coming. The form
submit was not only the mechanism that flickered — it was also what put the chosen round
into the browser's own history, so a reload re-sent the POST and the round survived (at
the cost of a "confirm form resubmission" prompt, and the flicker). Fetching in place
leaves the chosen term in component memory only, which the browser has no reason to keep.

The study table has behaved this way since its switch was written; nobody hit it because
switching term and then refreshing is a rare path. The exam round is toggled far more
often, which is why it surfaced there first.

**Decision: leave it.** After a refresh the page shows the term the registrar serves,
which is at least a state the registrar and the extension agree on.

The two ways to keep it were both considered and rejected:

- **URL state** (`replaceState`/`pushState`, read back at boot) — the honest version, and
  it would restore the back button too. But the registrar's page is a POST endpoint, so
  restoring means the registrar answers with its default first, then we fetch the saved
  term and swap. Every refresh would show the wrong round for one paint. That is the
  flicker this change exists to remove, moved to a different moment.
- **`sessionStorage`** — same restore cost with the state hidden somewhere a reader will
  not look, no shareable link, and a new tab still starts on the default.

Avoiding the extra paint means holding the render until the restore fetch lands, which
makes every refresh slower for everyone, including students who never switched anything.
Not worth it for a path taken this rarely.

## Risks / Trade-offs

- [Someone reads the in-page switch scenarios and assumes the chosen round survives a refresh] → It does not, by decision 7. The specs say nothing about refresh in either direction, which is why the decision is written here rather than left to be rediscovered.
- [The flicker is not actually fixed, because it was caused by something else] → It cannot be measured locally (the fixture answers instantly), so the acceptance test is the project owner switching rounds on the live page. Everything else is verified in the harness; this one judgement is not the harness's to make.
- [In-page switching diverges from what the registrar's own page does, so the old-design HTML and the redesigned view drift in some case not thought of] → Decision 3 keeps them in step by construction; the spec delta names the scenario so a walk checks it.
- [Losing the form submit loses the only proof that the registrar accepts these fields] → Decision 2 keeps the form. `fetchExamTable` posts the same names, and the extension walk asserts on the intercepted body.
- [The study table regresses while fixing its `oldHtml`] → It is the most-exercised component in the project and the spec walk covers its toggle; the walk must stay at full pass, and the new scenario is added to it.
- [A slow fetch leaves the sheet dimmed with no way out] → Failure restores the previous state and reports it. There is no timeout beyond the browser's; adding one is out of scope and would be inventing a policy no other fetch in this project has.

## Migration Plan

Single change, revertible. No manifest or build changes. One devDependency is added
(`playwright`) together with two committed walk scripts — see decision 6 for why that
departs from the original plan. The visible differences are that the round switch no longer reloads the page, that loading and failure are now shown, and that the old-design toggle follows the displayed term on both pages.
