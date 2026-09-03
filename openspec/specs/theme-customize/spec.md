# theme-customize

## Purpose

Let students personalize the study table's appearance before sharing or exporting it.

## Requirements

### Requirement: Per-subject and header colors

The study table view SHALL assign each distinct subject a color from a fixed palette (unique per subject where palette size allows) and SHALL let the student change each subject's color and the header background color individually.

#### Scenario: Initial coloring
- **WHEN** the study table renders
- **THEN** every block of the same subject shares one color and different subjects have different colors

#### Scenario: Customize a subject color
- **WHEN** the student picks a new color for a subject in the customize menu
- **THEN** all blocks of that subject update immediately and the export reflects the new color

#### Scenario: Reset theme
- **WHEN** the student resets the theme
- **THEN** subject colors regenerate from the palette and the header returns to the default color

### Requirement: Theme survives term switching

Changing the displayed term SHALL regenerate subject colors for the new term's subjects without breaking the customize menu.

#### Scenario: Switch term after customizing
- **WHEN** the student switches year/semester
- **THEN** the new term's subjects are colored and remain individually customizable

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
