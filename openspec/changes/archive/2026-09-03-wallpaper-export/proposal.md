## Why

Students set their timetable as a phone wallpaper. The PNG the extension exports today is 2784×1592 — a landscape sheet that, on a phone, is either a thin strip in the middle of the screen or cropped to a few hours.

The export is also the only thing the extension produces that leaves the browser. Everything else lives on a desktop page; this one file gets carried around, and its shape is wrong for where it ends up.

Measuring the corpus shows the landscape grid is wasteful even on a desktop:

```
   เทอม     วิชา  วัน  วันไหน           ช่วงเวลา
   2566-1    6    4   จ อ พฤ ศ        09:00-18:00
   2566-2    8    6   จ อ พ พฤ ศ อา    09:00-19:30
   2565-1    7    5   จ อ พ พฤ ศ       09:00-16:00
   2565-2    6    4   จ - พ พฤ ศ       09:00-18:00
   2564-1    6    4   - อ พ พฤ ศ       09:00-16:00
   2564-2    6    4   จ อ พ - ศ        09:00-19:30
```

No term in the corpus starts before 09:00, and none uses all seven days — four is typical. The grid always draws 08:00–20:00 across seven days regardless, so a real timetable is squeezed into roughly half the pixels it could have.

## What Changes

- The download control becomes a menu of formats rather than a single action. Landscape stays exactly as it is; portrait is added.
- **Portrait export swaps the grid's axes**: days become columns, time runs down the page. This is the arrangement a phone screen can carry — seven columns of 77px beats twelve columns of 24px, and trimming to the term's real extent takes a column past 120px.
- **One aspect ratio, 21:9 (1080×2520)**, chosen so the image is taller than any current phone. When a phone crops to fill, it then always crops top and bottom, never the sides where the day columns are.
- **Two independent choices**, both offered:
  - *canvas*: fill the whole image, or leave the top 22% and bottom 16% blank so the lock-screen clock and the dock do not sit on top of the grid. The blank bands double as crop tolerance.
  - *extent*: the full week and 08:00–20:00, or only the days and hours the term actually uses. Empty days at the edges of the week are dropped; an empty day **between** used days stays as a narrow column, because collapsing it would make four scattered days read as four consecutive ones.
- The exam schedule gets a portrait form too, but as **stacked cards, not a rotated table** — eight columns at this width leaves 67px each, which cannot hold a subject name. The extent choice does not apply there: an exam list already contains only what exists.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `image-export`: the download control is no longer one click to one file — it offers formats. A portrait export is added with a fixed aspect ratio, optional reserved bands, and an optional content-fitted extent. What the landscape export produces does not change.

## Impact

- `src/shared/DownloadButton.svelte` — becomes a menu; the landscape path stays.
- `src/features/study-table/Grid.svelte` — gains the swapped-axis arrangement.
- `src/features/exam-schedule/` — a card layout for portrait.
- `src/shared/` — the off-screen render target the portrait capture needs, since what is exported is no longer what is on screen.
- `openspec/specs/image-export/spec.md` — updated on archive.
- `e2e/image-export.spec.js` — new scenarios; `e2e/harness/` may need a way to reach the portrait states.

Out of scope: any change to what the landscape export produces, any change to the on-screen views at narrow widths (they are broken at 390px, but that is a separate problem — the extension does not run on mobile browsers anyway), printing, and any per-device aspect ratio beyond the single one chosen here.
