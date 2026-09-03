# Capture Baseline Specs for Existing Behavior

## Why

The extension's existing behavior (study table rendering, exam schedule rendering, PNG export, theme customization) has no specs — only the new `study-table-navigation` capability is covered. The upcoming full refactor needs a behavioral baseline to verify against, or "refactored without breaking anything" is unfalsifiable. Requirements are captured by observing the real registrar pages through the Orca embedded browser (live logged-in session available).

## What Changes

- Reverse-engineer and document current extension behavior as specs, verified against the live registrar site via Orca browser where scraping contracts are involved (page structure, field positions, encodings).
- No production code changes in this change.

## Capabilities

### New Capabilities
- `study-table-render`: scraping the registrar study table page and rendering the redesigned weekly grid, including old-design toggle.
- `exam-schedule-render`: scraping the registrar exam table page and rendering the redesigned exam list, including mid/final switching and old-design toggle.
- `image-export`: exporting the rendered study table / exam schedule as a PNG download.
- `theme-customize`: per-subject and header color customization of the study table.

### Modified Capabilities

(none)

## Impact

- Adds four capability specs under `openspec/specs/` (via delta specs in this change).
- Populates `openspec/config.yaml` `context` with project facts (tech stack, windows-874 rule, scraping conventions) so future changes inherit them.
- No runtime code, manifest, or dependency changes.
