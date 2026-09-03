# theme-customize

## ADDED Requirements

### Requirement: Customize menu is dismissible and returns focus

The customize menu SHALL be dismissible without using the mouse and SHALL NOT trap the student inside it. When it closes, focus SHALL return to the control that opened it.

This is behavior the redesigned view did not previously have: the menu could only be closed by clicking its trigger again, and a student who opened it from the keyboard had no way out.

#### Scenario: Escape closes the menu

- **WHEN** the customize menu is open and the student presses Escape
- **THEN** the menu closes and keyboard focus is on the control that opened it

#### Scenario: Clicking outside closes the menu

- **WHEN** the customize menu is open and the student clicks anywhere outside it
- **THEN** the menu closes and the click does not also activate whatever was underneath

#### Scenario: Keyboard reaches the menu contents

- **WHEN** the student opens the menu from the keyboard
- **THEN** focus moves into the menu, every colour control and the reset action are reachable by keyboard alone, and focus does not escape to the page behind while the menu is open

#### Scenario: Menu state is announced

- **WHEN** the customize menu is open or closed
- **THEN** its trigger reports the current state to assistive technology, and the menu itself is exposed as a single labelled region rather than loose content

### Requirement: Term selection is operable by keyboard

The year and semester pickers SHALL be operable entirely by keyboard, and the currently applied term SHALL be identifiable without relying on colour alone.

#### Scenario: Choosing a term without a mouse

- **WHEN** the student focuses a term picker and uses the keyboard to open it and choose an option
- **THEN** the schedule loads for that term, exactly as it does when the option is chosen with a mouse

#### Scenario: Pickers are unavailable while a term is loading

- **WHEN** a term is being fetched
- **THEN** the pickers do not accept a second selection until the first resolves, and that unavailable state is conveyed by more than colour
