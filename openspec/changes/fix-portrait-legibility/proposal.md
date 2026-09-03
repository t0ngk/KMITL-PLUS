## Why

The portrait export shipped, the project owner used it on a real account, and it does not do the job. Three findings, all from the exported images rather than from review:

**Subject names are unreadable.** Measured on the real export: the canvas is 540 CSS px, the hour-label column takes 36, so seven day columns get 67px each and a block's inner width is 65px. At the design system's 13px name size that is **six characters per line**, which is why `SOFTWARE VERIFICATION AND VALIDATION` renders as `SOFTWA / RE / VERIFICA / TION / AND / VALIDAT`.

**The room and section line is cut to nothing.** `IT Project Base2 ชั้น 2 · 1 (ท)` is 31 characters; 11 fit. Every block shows `IT Projec…`. Room and section are exactly what a glance at a wallpaper is for.

**The image carries the student's ID and full name.** A wallpaper is the one thing from this extension that other people see. Nothing about the timetable needs it.

A fourth, separate: the format menu mixes two interaction models — `แนวนอน` is a button that downloads on click, while `แนวตั้ง` is a heading with checkboxes and a second button. The project owner's words: it is not understandable.

## What Changes

- **Text inside a grid block is rotated to run down the block.** A line's length stops being the block's width (65px, six characters) and becomes its height (162px for a three-hour class, about 23 characters). The number of lines becomes the block's width divided by the line height, roughly four. Measured on the real fixture: names that were shattered now render whole, Thai included.
- The time and room lines rotate with the name rather than staying horizontal, as a second column beside it. Leaving them horizontal would put two reading directions in one block for no reason, and rotated they get the same 162px of line length instead of 65px.
- **The portrait export drops the student's identity.** No student ID, no name, no faculty or department. The term stays; that is what the image is of.
- **The format menu becomes one flow**: choose a format, adjust what that format offers, press one download button. Not two kinds of control in one menu.

Not everything is fixable at this width and this change does not pretend otherwise. A one-hour class is 53px tall, so a rotated line has 53px to work with and long names still clip there. Blocks in a three-way overlap are narrower still. Both are recorded rather than papered over.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `image-export`: the portrait export gains a readability requirement and a requirement that it carries no identifying details. The format-menu scenario is restated around a single download action.

## Impact

- `src/features/study-table/PortraitGrid.svelte` — the rotation, and the line budget that follows from it.
- `src/features/study-table/StudyExport.svelte`, `src/features/exam-schedule/ExamExport.svelte` — a header for the export that is not the on-screen header.
- `src/shared/DownloadMenu.svelte` — the menu.
- `openspec/specs/image-export/spec.md` — updated on archive.
- `e2e/image-export.spec.js` — the new scenarios, and the existing ones that drive the menu.

Out of scope: the on-screen views, the landscape export, the exam portrait's card layout (it is a list at full width and reads correctly), and the aspect ratio.
