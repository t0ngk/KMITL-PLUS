# image-export

## MODIFIED Requirements

### Requirement: One-click PNG download of the rendered view

Both redesigned views SHALL offer a download control that captures the content area (header + table/grid) to a PNG file and triggers a browser download. The control SHALL offer the available formats rather than committing to one, every format SHALL be chosen the same way, and a single action SHALL start the download.

#### Scenario: Study table download

- **WHEN** the student chooses the landscape format on the study table view
- **THEN** a PNG of the grid including the header block downloads, with Thai text and theme colors rendered faithfully

#### Scenario: Exam schedule download

- **WHEN** the student chooses the landscape format on the exam schedule view
- **THEN** a PNG of the exam list including the header block downloads

#### Scenario: Formats are offered before downloading

- **WHEN** the student activates the download control
- **THEN** the available formats are presented and nothing is downloaded until one is chosen

#### Scenario: One way to start a download

- **WHEN** the student has chosen a format and set whatever that format offers
- **THEN** a single download action starts it, the same action for every format

### Requirement: Portrait export fits a phone screen

Both views SHALL offer a portrait export at a single fixed aspect ratio that is taller than current phones, so that a phone cropping the image to fill its screen removes only the top and bottom, never the left and right edges where the days are. Text inside the image SHALL be readable at the width the format allows.

#### Scenario: Portrait study table

- **WHEN** the student chooses the portrait format on the study table
- **THEN** a portrait PNG downloads in which days are columns and time runs down the page, carrying the same subjects, colours, times and rooms as the landscape export

#### Scenario: Portrait exam schedule

- **WHEN** the student chooses the portrait format on the exam schedule
- **THEN** a portrait PNG downloads showing each exam as its own entry rather than as a row of a wide table, with nothing truncated away

#### Scenario: The image is never cropped along its width

- **WHEN** the exported image is displayed on a phone whose screen is less tall than the image
- **THEN** every day column remains within the image; only the top and bottom are outside the screen

#### Scenario: Subject names read as words

- **WHEN** a class occupies two hours or more in the portrait grid
- **THEN** its subject name is shown whole, not broken into fragments of a few characters, in Thai as well as in English

#### Scenario: Room and section survive

- **WHEN** a class occupies two hours or more in the portrait grid and its slot is not shared with two or more other classes
- **THEN** its time, room and section are readable rather than cut off after a few characters

#### Scenario: The name comes first when only one thing fits

- **WHEN** a class shares its slot with two or more others, leaving its column too narrow for both the name and the details
- **THEN** the name is what is shown

#### Scenario: A class too short to label

- **WHEN** a class is too short for its name to fit even along the block
- **THEN** what does fit is shown and the rest is cut, rather than the block being left blank or the text spilling outside it

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
- **THEN** that day is absent too, and the day names on the remaining columns are what tells the student which days were skipped

#### Scenario: Extent does not apply to the exam schedule

- **WHEN** the student opens the format menu on the exam schedule
- **THEN** only the reserved-band choice is offered, because an exam list contains only the entries that exist

## ADDED Requirements

### Requirement: The portrait export carries no identifying details

An exported wallpaper is seen by people other than the student. The portrait export SHALL NOT contain the student's ID, name, faculty, department or programme. It SHALL still say which term it is of.

#### Scenario: Nothing identifies the student

- **WHEN** either view is exported in the portrait format
- **THEN** the image contains no student ID, no student name, and no faculty, department or programme

#### Scenario: The term is still stated

- **WHEN** either view is exported in the portrait format
- **THEN** the image says which semester and academic year it shows

#### Scenario: The landscape export is unchanged

- **WHEN** either view is exported in the landscape format
- **THEN** the header is exactly what it was, identity included, because that image is the one the student keeps for themselves
