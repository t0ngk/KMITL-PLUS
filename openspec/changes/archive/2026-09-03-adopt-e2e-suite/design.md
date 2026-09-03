# Design — adopt-e2e-suite

## Context

See proposal.md for why. What shapes the approach:

- `preview/walk.mjs` spawns the preview Vite server itself, opens a fresh page per group of assertions, and reports through `check(name, boolean, detail)`. `preview/extwalk.mjs` launches a persistent Chromium context with `--load-extension` and intercepts every `reg.kmitl.ac.th` request with committed fixtures. 33 assertions between them.
- The fixtures are three redacted registrar pages plus `registrar.css` and `term-selector.html`. The corpus of 40 real pages is gitignored; nothing committed may depend on it.
- The preview harness answers instantly, so loading and failure states have no duration. `?slow=<ms>`, `?fail=`, `?header=broken` and `?term=<sem>/<year>` exist for exactly that reason and are load-bearing.
- Scenario titles are not unique across the whole spec set: "Normal page load" and "Toggle old design" each appear in two capabilities. They are unique **within** a capability.
- `openspec/config.yaml` records "no test framework — verification is scenario walks ... playwright is a devDependency only for those two walk scripts, not a test runner." That sentence was written when the walks held 13 assertions.

## Goals / Non-Goals

**Goals:**

- Every scenario in `openspec/specs` has a test, and that fact is checkable by running a command rather than by reading two files.
- One failing scenario does not hide the result of any other.
- A failure says which value was wrong, not merely that something was.

**Non-Goals:**

- No change to extension behaviour. If a test written faithfully against a scenario fails, that is a finding, not a licence to edit either side (see decision 6).
- No CI in this change.
- No new harness affordance beyond what the 45 existing scenarios need.
- No coverage metric beyond scenario-to-test. Line coverage is not the question being asked.

## Decisions

### 1. `@playwright/test`, two projects

The runner replaces both scripts. `playwright.config.js` declares two projects:

```
   project "preview"                    project "extension"
   ---------------------------------    ---------------------------------
   ต่อ preview vite server               chromium --load-extension
   ไม่ต้อง build                          ต้อง pnpm build ก่อน
   เร็ว รันบ่อย                            ช้า รันก่อนปิด change
   ครอบ scenario ในสเปกทั้งหมด             ครอบสิ่งที่มีแต่ extension จริงเท่านั้น
```

- Why a runner at all: per-test isolation, retries, trace on failure, `--grep`, and `expect()` diffs. The convention that forbade one was written against 13 assertions; at 49 the cost of hand-rolling those is no longer smaller than the cost of the dependency. Decision 7 records the reversal rather than letting it drift.
- Why two projects and not two config files: they share fixtures, reporters and the scenario-title discipline. Splitting the config splits that.
- Why keep the extension project separate rather than merge: it needs a build artefact and a persistent context, it is an order of magnitude slower, and CI will likely treat it differently. Keeping it a named project is what makes that later choice cheap.

### 2. File per capability, test per scenario, titles verbatim

```
   openspec/specs/theme-customize/spec.md
       #### Scenario: Escape closes the menu
                    |
                    v
   e2e/theme-customize.spec.js
       test("Escape closes the menu", ...)
```

- The file name is the capability directory name. That is what disambiguates the two duplicated titles — "Normal page load" in `study-table-render.spec.js` and in `exam-schedule-render.spec.js` are different tests, and the pair (file, title) is unique.
- Verbatim, not paraphrased: the moment a title is improved in one place the link breaks silently. If a scenario's name reads badly, rename it in the spec and let the test follow.
- Tests that map to no scenario are allowed and expected — the extension project checks the manifest, font loading and the registrar CSS bleed, none of which is a scenario. The checker only asks the question in one direction (decision 3).

### 3. `pnpm e2e:coverage` fails on an uncovered scenario, and there is no exception list

`e2e/coverage.mjs` parses `#### Scenario:` lines out of `openspec/specs/*/spec.md`, extracts test titles from the matching `e2e/<capability>.spec.js`, and exits non-zero listing any scenario with no test.

- One direction only: a scenario without a test fails; a test without a scenario does not. Tests exist for things specs do not describe (build output, CSS containment), and demanding a scenario for each would push implementation detail into the specs.
- **No exception list, by explicit choice.** An allowlist is where this kind of check goes to die: the first genuinely awkward scenario gets added, then the second, and within a few changes the green light means nothing. If a scenario turns out to be unreachable offline, that is a design question — it gets answered here, in this document, by changing the approach or the harness, not by adding a line to a list.
- The checker is not a test. It is a script `pnpm e2e:coverage` runs, so it can be run without a browser and stays useful when the suite itself is red.

### 4. The walks are deleted, not kept alongside

`preview/walk.mjs` and `preview/extwalk.mjs` go once their assertions have moved.

- Two suites asserting the same things is how one of them rots: the one that is slower to run stops being run, then stops being updated, then starts failing for reasons nobody investigates.
- The move is a translation, not a rewrite. Every assertion is carried across and must not weaken on the way. The task list makes that an explicit check rather than an assumption, because "it passes" is not evidence that it still asserts the same thing.

### 5. Negative controls stay, and get written down

Twice in recent changes an assertion passed for the wrong reason and only a deliberate break caught it: a header match that was really matching an `<option>`, and a `selectOption` that fired `change` on a re-selection a real user cannot perform. The practice found real defects and must survive the migration.

- A negative control is: break the code the scenario describes, confirm the specific test fails, restore. It is done during apply and its result recorded in the task, not left as a permanent test.
- `@playwright/test` makes this cheaper, not harder — `--grep` runs the one test, and a diff says whether it failed for the intended reason rather than by timing out somewhere else.

### 6. If an accessibility test fails, neither side is edited quietly

Five `theme-customize` scenarios have never been executed. There is a real chance a faithful test fails.

```
   test ตกเพราะ...            สิ่งที่ทำ
   ------------------------  --------------------------------------
   โค้ดไม่ตรงสเปก              หยุด ถามเจ้าของโปรเจกต์ แยกเป็น change ของมันเอง
   เทสต์เขียนผิด               แก้เทสต์
   สเปกเขียนสิ่งที่ไม่ได้ตั้งใจ     หยุด ถาม — ห้ามแก้สเปกให้เข้ากับโค้ดที่มีอยู่
```

The third row is the one that matters. Editing a scenario until the current behaviour satisfies it converts a spec into a description, and the whole point of the spec is that it is not one.

### 7. The convention reversal is recorded, not slipped in

`openspec/config.yaml` gets rewritten to say a runner is now used, with the number that changed the answer: the rule was written when the walks held 13 assertions and this suite lands at roughly 49.

- Anyone reading the old sentence would reasonably conclude a test runner was rejected on principle. It was not; it was rejected at a size that no longer applies.
- `playwright` as a bare devDependency is replaced by `@playwright/test`. Same browsers, same download, one dependency rather than two.

## Risks / Trade-offs

- [Translating 33 assertions weakens some of them silently, and the suite is green for less reason than before] → Each moved assertion is checked against the original in the task list, and decision 5's negative controls are run against the new tests, not remembered from the old ones.
- [The accessibility scenarios turn out to be unimplemented and the change balloons] → Decision 6 stops rather than absorbs. The suite can land with those tests failing and the finding written up; a red test that describes real missing behaviour is worth more than a deleted one.
- [`e2e:coverage` becomes noise the first time someone adds a scenario mid-change] → It is a separate command, not part of `pnpm e2e`, so a change in progress is not blocked by it. It is run before closing a change, where the answer is supposed to be yes.
- [The extension project is slow enough that people stop running it] → It is a named project; `pnpm e2e --project=preview` is the fast loop and the full run is what closes a change. The same discipline the two scripts already had, made explicit.
- [`@playwright/test` pulls the project toward unit tests it does not want] → The scope is the scenario set, and decision 3's one-directional check keeps the pressure pointed at spec coverage rather than at code coverage.

## Migration Plan

Reversible in one commit: the deleted walks are recoverable from git and the new suite is additive until they are removed. `@playwright/test` replaces `playwright`; browsers are already installed. No manifest, build or extension-behaviour change.

## Open Questions

- Whether the extension project belongs in CI, and what it needs there. Deferred deliberately — it does not change the suite's shape, only where it runs.
