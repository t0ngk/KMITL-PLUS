# image-export

## MODIFIED Requirements

### Requirement: One-click PNG download of the rendered view

Both redesigned views SHALL offer a download control that captures the content area (header + table/grid) to a PNG file and triggers a browser download. The control SHALL offer the available formats rather than committing to one, and the landscape format SHALL produce what it produced before.

#### Scenario: Study table download

- **WHEN** the student chooses the landscape format on the study table view
- **THEN** a PNG of the grid including the header block downloads, with Thai text and theme colors rendered faithfully

#### Scenario: Exam schedule download

- **WHEN** the student chooses the landscape format on the exam schedule view
- **THEN** a PNG of the exam list including the header block downloads

#### Scenario: Formats are offered before downloading

- **WHEN** the student activates the download control
- **THEN** the available formats are presented and nothing is downloaded until one is chosen

## ADDED Requirements

### Requirement: Portrait export fits a phone screen

Both views SHALL offer a portrait export at a single fixed aspect ratio that is taller than current phones, so that a phone cropping the image to fill its screen removes only the top and bottom, never the left and right edges where the days are.

#### Scenario: Portrait study table

- **WHEN** the student chooses the portrait format on the study table
- **THEN** a portrait PNG downloads in which days are columns and time runs down the page, carrying the same subjects, colours, times and rooms as the landscape export

#### Scenario: Portrait exam schedule

- **WHEN** the student chooses the portrait format on the exam schedule
- **THEN** a portrait PNG downloads showing each exam as its own entry rather than as a row of a wide table, with nothing truncated away

#### Scenario: The image is never cropped along its width

- **WHEN** the exported image is displayed on a phone whose screen is less tall than the image
- **THEN** every day column remains within the image; only the top and bottom are outside the screen

### Requirement: The student chooses what the image reserves and how much it covers

The portrait export SHALL offer two independent choices: whether to leave the areas a lock screen occupies blank, and whether to draw the whole week or only the part of it the term uses. Both SHALL be available in every combination.

#### Scenario: Reserved bands

- **WHEN** the student asks for the reserved-band variant
- **THEN** the top and bottom of the image are left blank so the clock and the dock do not overlap the grid, and the grid occupies the band between them

#### Scenario: Full canvas

- **WHEN** the student asks for the full-canvas variant
- **THEN** the grid fills the image with no reserved bands

#### Scenario: Content-fitted extent

- **WHEN** the student asks for the content-fitted variant and the term uses neither the first hour nor the weekend
- **THEN** those hours and days are absent from the image and the remaining columns and rows are correspondingly larger

#### Scenario: An unused day inside the week

- **WHEN** the content-fitted variant is chosen and a day between two used days has no classes
- **THEN** that day still appears, as a narrower column, so the days on either side are not read as consecutive

#### Scenario: Extent does not apply to the exam schedule

- **WHEN** the student opens the format menu on the exam schedule
- **THEN** only the reserved-band choice is offered, because an exam list contains only the entries that exist
