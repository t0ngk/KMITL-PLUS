## Why

The specs describe 45 scenarios. 29 of them are walked. The other 16 are described and never checked, and nothing in the project says which is which — counting them meant grepping two files by hand.

```
   capability                scenario   เดิน   ไม่เดิน
   ------------------------  --------   ----   ------
   study-table-render           14       13      1
   exam-schedule-render         10        9      1
   study-table-navigation        7        3      4
   image-export                  4        3      1
   theme-customize              10        1      9
   ------------------------  --------   ----   ------
                                45       29     16
```

`theme-customize` is the hole: one shallow check in `extwalk.mjs` (open the menu, press Escape) against ten written scenarios, five of them the accessibility behaviour that `adopt-ui-primitives` deliberately chose to put in the spec rather than skip. Colour customisation, reset, keyboard reach, announced state, choosing a term without a mouse — none of it is exercised.

The second problem is the shape of the walks, not their content. Both are one long script:

- A locator timeout throws and the whole run dies printing nothing. This happened twice while applying `fix-study-term-scrape`; twelve passing results were lost each time because the failure came before the summary.
- `check(name, boolean, detail)` collapses a conjunction into one bit. When it fails you re-derive which clause broke. Two rounds were spent that way in one session — once on U+00A0 in an assertion, once on a selector that never existed.
- No trace, no retry, no way to run one scenario. Editing one theme behaviour means waiting for all 33 checks.

Neither problem is worth fixing alone. Fixing coverage alone makes an 800-line file that still dies on the first throw. Fixing the runner alone leaves 16 scenarios unchecked and no way to know it. Doing both allows the thing that pays for the work: **one test per scenario, named exactly as the spec names it**, so coverage becomes a command instead of a grep.

## What Changes

- The two walk scripts become a `@playwright/test` suite under `e2e/`, one file per capability, one test per scenario, test titles matching the spec's `#### Scenario:` lines verbatim.
- The 16 unwalked scenarios get tests, accessibility included.
- `pnpm e2e:coverage` reads `openspec/specs/*/spec.md`, compares scenario names to test titles, and **fails when a scenario has no test**. There is no exception list.
- `preview/walk.mjs` and `preview/extwalk.mjs` are deleted. Everything they assert moves; nothing runs in parallel with the new suite.
- `openspec/config.yaml` reverses its "no test framework" convention and records why.

The harness affordances stay exactly as they are: `?fail=`, `?slow=`, `?header=broken`, `?term=` in `preview/`, and the intercepted-registrar setup for the built extension. They are the only reason the loading, failure and unreadable-header states can be reached at all.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change adds no behaviour and removes none: all 45 scenarios are already written and already normative. `skip_specs: true` is set for that reason.

The one thing to watch is that five accessibility scenarios have never been executed. If a test written faithfully against the spec fails, the spec is not what gets edited — see design.md.

## Impact

- `e2e/` — new; the suite, its fixtures, and the coverage checker.
- `playwright.config.js` — new; two projects, one against the preview server and one against the built extension.
- `package.json` — `@playwright/test` replaces the bare `playwright` devDependency; `walk` / `walk:ext` scripts become `e2e` and `e2e:coverage`.
- `preview/walk.mjs`, `preview/extwalk.mjs` — deleted.
- `preview/regStub.js`, `preview/main.js`, `preview/loadFixture.js` — unchanged; the suite drives the same affordances.
- `openspec/config.yaml` — the verification convention.

Out of scope: CI (the extension project needs a loaded extension in a real browser and deserves its own decision), any change to the extension's behaviour, and any new harness affordance beyond what the existing scenarios need.
