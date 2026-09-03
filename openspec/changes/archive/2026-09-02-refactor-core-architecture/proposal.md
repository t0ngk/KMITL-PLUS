# Refactor Core Architecture

## Why

The codebase is asymmetric and change-hostile: exam schedule scraping is inlined in its content script with no failure guards, boot logic is duplicated across both content scripts, scraping is coupled to exact `childNodes` indexes, and the study table component mixes five responsibilities in 449 lines on Svelte legacy mode — which already caused one shipped reactivity bug (grid not re-rendering on term switch). Adding any new page or behavior today means copy-paste. Baseline specs (change `capture-baseline-specs`) define what must keep working.

## What Changes

- Restructure into feature folders with a shared core: thin `content/<page>.js` bootstraps, shared `core/boot.js` (font inject, body replace, mount, top-level error guard), `services/reg.js` (all registrar requests incl. exam endpoints, windows-874 decode), `features/<page>/` (scraper + component), `shared/` (export button, picker, theme, Credit).
- Migrate both Svelte components to runes mode, splitting the study table component into focused pieces (grid, header, controls, customize menu).
- Move exam schedule scraping out of the content script into a pure, guarded scraper module (same pattern as study table).
- No behavior changes: every capability spec in `openspec/specs/` must hold before and after. **BREAKING**: none.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none — pure refactor; `skip_specs: true` is set in `.openspec.yaml`)

## Impact

- Every file under `src/` except assets is moved or rewritten; `manifest.json` content-script paths updated.
- No dependency changes; no registrar contract changes.
- Depends on `capture-baseline-specs` being archived first (specs are the acceptance criteria).
