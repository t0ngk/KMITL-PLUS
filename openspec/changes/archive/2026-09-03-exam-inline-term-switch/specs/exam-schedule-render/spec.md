# exam-schedule-render

## MODIFIED Requirements

### Requirement: Mid/Final switching

The student SHALL be able to switch between midterm and final schedules for the current term, and the switch SHALL happen without reloading the page.

#### Scenario: Switch term type

- **WHEN** the student chooses the other exam round
- **THEN** the corresponding schedule loads and renders in the redesigned view without a full page reload

#### Scenario: While the other round is loading

- **WHEN** a round has been chosen and its schedule has not arrived yet
- **THEN** the view shows that it is loading, and a second choice is not accepted until the first resolves

#### Scenario: The other round fails to load

- **WHEN** fetching the chosen round fails
- **THEN** the round currently on screen stays exactly as it was, the student is told the load failed, and the control returns to showing the round actually displayed

### Requirement: Old design remains reachable

The student SHALL be able to toggle back to the original page content, and that content SHALL be the original of whatever the redesigned view is currently showing.

#### Scenario: Toggle old design

- **WHEN** the student activates the old/new design toggle
- **THEN** the original page HTML is shown; toggling again restores the redesigned view

#### Scenario: Toggle old design after switching round

- **WHEN** the student switches to the other exam round and then activates the toggle
- **THEN** the original HTML shown is that of the round now displayed, not the round that happened to be loaded when the page first opened
