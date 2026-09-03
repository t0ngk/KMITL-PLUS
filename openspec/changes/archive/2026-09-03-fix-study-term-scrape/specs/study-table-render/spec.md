# study-table-render

## ADDED Requirements

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
