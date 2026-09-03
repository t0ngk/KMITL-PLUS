# theme-customize

## Purpose

Let students personalize the study table's appearance before sharing or exporting it.

## ADDED Requirements

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
