# image-export

## Purpose

Let students download the redesigned study table or exam schedule as a PNG image for sharing.

## Requirements

### Requirement: One-click PNG download of the rendered view

Both redesigned views SHALL offer a download control that captures the content area (header + table/grid) to a PNG file and triggers a browser download.

#### Scenario: Study table download
- **WHEN** the student clicks download on the study table view
- **THEN** a PNG of the grid including the header block downloads, with Thai text and theme colors rendered faithfully

#### Scenario: Exam schedule download
- **WHEN** the student clicks download on the exam schedule view
- **THEN** a PNG of the exam list including the header block downloads

### Requirement: Controls are excluded from the capture

Floating action buttons, pickers, and other interactive controls SHALL NOT appear in the exported image; interactive selectors inside the captured area SHALL be replaced by their plain-text value during capture.

#### Scenario: Exam term selector during capture
- **WHEN** the exam schedule is captured while the Mid/Final selector is inside the captured area
- **THEN** the exported image shows the selected term as static text, not a form control

#### Scenario: Floating controls
- **WHEN** either view is captured
- **THEN** no floating buttons or pickers appear in the image
