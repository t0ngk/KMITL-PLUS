# study-table-render

## MODIFIED Requirements

### Requirement: Old design remains reachable

The student SHALL be able to toggle back to the original (pre-extension) page content and return to the redesigned view. The content shown SHALL be the original of whatever term the redesigned view is currently showing.

#### Scenario: Toggle old design

- **WHEN** the student activates the old/new design toggle
- **THEN** the original page HTML is shown; toggling again restores the redesigned grid with its state

#### Scenario: Toggle old design after switching term

- **WHEN** the student switches year or semester and then activates the toggle
- **THEN** the original HTML shown is that of the term now displayed, not the term that happened to be loaded when the page first opened
