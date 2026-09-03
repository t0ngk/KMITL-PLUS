# study-table-navigation

## Purpose

Let a logged-in student (including graduated students who have lost the site's menu link) browse their study table for any academic year/semester the registrar still holds, directly from the extension's study table view.

## ADDED Requirements

### Requirement: Year/semester options come from the registrar server

The extension SHALL obtain the list of selectable academic years and semesters from the registrar's own selector page for the logged-in session, and SHALL present exactly those options — never a guessed or hardcoded range.

#### Scenario: Options load on study table view
- **WHEN** the extension renders the study table view for a logged-in student
- **THEN** a year/semester picker is shown whose year options match the years the registrar serves for that student's account

#### Scenario: Options unavailable
- **WHEN** the selector page cannot be fetched or parsed (network error, session expired, layout change)
- **THEN** the picker is hidden or disabled and the current study table remains rendered and usable

### Requirement: Switching loads the selected term's table in place

Selecting a different year/semester SHALL load and render that term's study table without a full page navigation, preserving the extension's rendered view.

#### Scenario: Switch to a past term with data
- **WHEN** the student selects a year/semester for which the registrar has registration data
- **THEN** the study table view updates to show that term's subjects, and the displayed year/semester header reflects the selection

#### Scenario: Switch to a term without data
- **WHEN** the student selects a year/semester for which the registrar returns an empty table
- **THEN** the view shows an explicit empty state (not a crash, blank page, or stale previous table presented as current)

#### Scenario: Fetch failure during switch
- **WHEN** the table request fails (network error, session expired)
- **THEN** the previously rendered table stays visible and the failure is indicated to the user

### Requirement: Thai text renders correctly

Study table content fetched programmatically SHALL be decoded with the registrar's legacy Thai encoding (windows-874/TIS-620) so subject names, headers, and day names render correctly.

#### Scenario: Past term contains Thai subject names
- **WHEN** a fetched term's table contains Thai text
- **THEN** the rendered table shows the text without mojibake

### Requirement: Downloaded image excludes the picker

The year/semester picker SHALL NOT appear in the PNG exported by the existing download feature.

#### Scenario: Download after switching terms
- **WHEN** the student downloads the study table image for any selected term
- **THEN** the image contains that term's table and header but no picker controls
