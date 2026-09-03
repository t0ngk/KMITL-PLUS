# study-table-render

## Purpose

Replace the registrar's legacy study table page (`report_studytable_show.php`) with a redesigned weekly timetable grid rendered by the extension, without losing access to the original page content.

## ADDED Requirements

### Requirement: Redesigned grid replaces the legacy page

When the study table page loads, the extension SHALL scrape the legacy table and render a weekly grid in its place: rows Mon–Sun, columns in 15-minute slots from 08:00 to 20:00, each registered subject drawn as a block spanning its class period.

#### Scenario: Normal page load
- **WHEN** a student opens the study table page with registered subjects
- **THEN** the legacy page body is replaced by the redesigned grid showing every subject at its day/time position with subject name, section, type (ท/ป), room/building, and start–end time

#### Scenario: Both Thai and English day names
- **WHEN** the registrar serves day names in Thai ("จ.") or English ("Mon")
- **THEN** subjects appear on the correct weekday row in both cases

#### Scenario: Sparse or empty page
- **WHEN** the page contains no scrapable table (empty term, session expired, layout change)
- **THEN** the extension renders its empty state instead of crashing to a blank page

### Requirement: Header shows student and term identity

The grid header SHALL show faculty, department + major, semester + academic year, and student ID + name scraped from the page.

#### Scenario: Header render
- **WHEN** the redesigned view renders
- **THEN** all four header lines show the scraped values; fields missing from the page render as blanks, not errors

### Requirement: Old design remains reachable

The student SHALL be able to toggle back to the original (pre-extension) page content and return to the redesigned view.

#### Scenario: Toggle old design
- **WHEN** the student activates the old/new design toggle
- **THEN** the original page HTML captured at load time is shown; toggling again restores the redesigned grid with its state
