# study-table-render

## Purpose

Replace the registrar's legacy study table page (`report_studytable_show.php`) with a redesigned weekly timetable grid rendered by the extension, without losing access to the original page content.

## Requirements

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

The student SHALL be able to toggle back to the original (pre-extension) page content and return to the redesigned view. The content shown SHALL be the original of whatever term the redesigned view is currently showing.

#### Scenario: Toggle old design

- **WHEN** the student activates the old/new design toggle
- **THEN** the original page HTML is shown; toggling again restores the redesigned grid with its state

#### Scenario: Toggle old design after switching term

- **WHEN** the student switches year or semester and then activates the toggle
- **THEN** the original HTML shown is that of the term now displayed, not the term that happened to be loaded when the page first opened

### Requirement: The term picker reflects the term on screen

The picker SHALL show the academic year and semester of the table the student is currently looking at, and SHALL offer exactly the years and semesters the registrar's own term selector offers. When the term of the displayed table cannot be determined, the picker SHALL NOT present a term instead.

#### Scenario: Picker agrees with the header

- **WHEN** the study table page opens on any term the registrar serves
- **THEN** the year and semester in the picker are the year and semester the header shows for that table

#### Scenario: The lists come from the registrar

- **WHEN** the student opens either list
- **THEN** the years and semesters offered are the ones the registrar's term selector offers, with nothing added that the registrar does not list

#### Scenario: Neither list can be read

- **WHEN** the registrar's term selector cannot be read
- **THEN** no picker is presented at all, and the table on screen remains usable

#### Scenario: Arriving on a term the registrar does not list

- **WHEN** the student opens the study table page on a term that is not in the registrar's own lists
- **THEN** the picker names the term actually displayed rather than replacing it with one from the lists

#### Scenario: Changing only the semester keeps the year

- **WHEN** the student changes the semester without touching the year
- **THEN** the table that loads is for the year already on screen

#### Scenario: The term cannot be read

- **WHEN** the page's header does not yield a year or a semester
- **THEN** the picker does not claim a term, and the grid still renders whatever was scraped

### Requirement: Header fields are separated as the registrar wrote them

The header SHALL present faculty, department, major, semester, academic year, student ID and student name as distinct values, whatever whitespace the registrar uses to separate them.

#### Scenario: Non-breaking spaces separate the columns

- **WHEN** the registrar separates the fields of a header cell with `&nbsp;` rather than ordinary spaces
- **THEN** each field is read as its own value, and none of them comes back empty because the separator was not recognised

#### Scenario: Every header field carries a value

- **WHEN** the redesigned view renders a page whose header is complete
- **THEN** major and student name hold their own scraped values rather than the empty string
