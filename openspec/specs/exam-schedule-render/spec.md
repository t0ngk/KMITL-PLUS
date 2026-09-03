# exam-schedule-render

## Purpose

Replace the registrar's legacy exam table page (`report_examtable_show.php`) with a redesigned exam schedule list grouped by exam date.

## Requirements

### Requirement: Redesigned schedule replaces the legacy page

When the exam table page loads, the extension SHALL scrape the legacy table and render exam entries grouped by date, ordered by start time, showing per subject: exam date (Thai Buddhist-era display), start–end time, subject code, subject name, section, credit, exam type, and room.

#### Scenario: Normal page load
- **WHEN** a student opens the exam table page with scheduled exams
- **THEN** the redesigned list shows one date group per exam day with all subjects of that day as rows

#### Scenario: Subject without scheduled date or time
- **WHEN** an exam row has no date or no time
- **THEN** that field renders as "ไม่ทราบ" and the entry still appears (unscheduled entries sort after scheduled ones)

#### Scenario: Duplicate subject rows
- **WHEN** the legacy table repeats a subject across consecutive rows (multiple exam-type lines)
- **THEN** the redesigned view shows one entry whose exam type concatenates the variants ("A/B")

### Requirement: Dates parse as Gregorian and display in the Buddhist calendar

Scraped exam dates use Thai month abbreviations with a two-digit GREGORIAN year (verified live: "พ. 8 พ.ย. 23" = 2023-11-08 CE). The extension SHALL parse them as Gregorian internally (so sorting and grouping are correct) and display them in Thai locale with the Buddhist year.

#### Scenario: Short Gregorian year scraped
- **WHEN** the page shows an exam on "พ. 8 พ.ย. 23"
- **THEN** the entry is stored as 2023-11-08 and displays as a Thai date in year 2566

#### Scenario: Self-arranged exam
- **WHEN** the date field contains "จัดสอบเอง" instead of a date (observed live for project subjects)
- **THEN** the entry renders with "ไม่ทราบ" in the date and time fields and still appears in the list

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
