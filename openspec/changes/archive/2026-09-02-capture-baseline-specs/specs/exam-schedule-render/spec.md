# exam-schedule-render

## Purpose

Replace the registrar's legacy exam table page (`report_examtable_show.php`) with a redesigned exam schedule list grouped by exam date.

## ADDED Requirements

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

The student SHALL be able to switch between midterm and final schedules for the current term.

#### Scenario: Switch term type
- **WHEN** the student changes the Mid Term / Final selector
- **THEN** the corresponding schedule loads and renders in the redesigned view

### Requirement: Old design remains reachable

The student SHALL be able to toggle back to the original page content.

#### Scenario: Toggle old design
- **WHEN** the student activates the old/new design toggle
- **THEN** the original page HTML captured at load time is shown; toggling again restores the redesigned view
