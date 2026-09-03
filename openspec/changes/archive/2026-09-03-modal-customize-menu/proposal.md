## Why

`theme-customize` has said this since `adopt-ui-primitives`:

> **WHEN** the customize menu is open and the student clicks anywhere outside it
> **THEN** the menu closes and the click does not also activate whatever was underneath

The second clause is not true. Writing the test for it in `adopt-e2e-suite` measured the actual behaviour:

```
   เปิดเมนู -> คลิกปุ่ม "แบบเดิม"
     menuOpen: false        เมนูปิด  ถูก
     legacyShown: true      ปุ่มทำงานด้วย  ผิด
     toggleLabel: "แบบใหม่"
```

One click does two things. The buttons at risk sit in the same dock as the menu's own trigger: dismissing the menu by clicking near it can flip the page to the legacy view, or start a PNG export nobody asked for.

The menu is already announced as a dialog — `role="dialog"`, `aria-haspopup="dialog"`, and focus is trapped inside it while open, all verified by tests that pass. Keyboard users get modal behaviour; mouse users do not. The requirement is not asking for anything unusual, only for those two to agree.

`bits-ui` cannot be configured out of this. `interactOutsideBehavior` decides *whether the popover closes*, not whether the click reaches the page; `onInteractOutside` can only cancel the dismissal, which is the opposite of what is needed. The dismissal fires on `pointerup` and the button underneath fires on the `click` that follows it — two different events, and no prop stands between them.

## What Changes

- While the customize menu is open, a transparent layer covers the page beneath it. Clicking anywhere outside the menu closes it and that click goes no further.
- Nothing else about the menu changes: Escape still closes it and returns focus to the trigger, focus is still trapped, the trigger still reports its state, and the colour controls and reset behave exactly as before.
- The failing test in `e2e/theme-customize.spec.js` starts passing. Its assertions are untouched; only how it clicks changes, from `locator.click()` to a click at the button's coordinates. `locator.click()` waits until the button can receive the click, which is precisely what a working layer prevents forever — aiming at the point is what the scenario describes ("clicks anywhere outside it") and it lets the test assert directly that the button did not fire.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The requirement already exists and is unchanged; this makes the code match it. `skip_specs: true` is set for that reason.

## Impact

- `src/features/study-table/CustomizeMenu.svelte` — the only file with the menu in it.
- `e2e/theme-customize.spec.js` — the acceptance check; its click method changes, its assertions do not.
- `openspec/changes/adopt-e2e-suite/tasks.md` — task 4.12 closes once this lands.

Out of scope: the term pickers (`TermSelect.svelte`). They are listboxes, not dialogs, and no scenario says a click that dismisses one must be swallowed. Changing them would be applying a dialog's rule to a control that is not one.
