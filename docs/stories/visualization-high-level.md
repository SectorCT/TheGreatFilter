# Visualization (High-Level) — User Stories + Page Contract

## User Stories
- As a user, I want to visually inspect a generated filter so that I can understand what was produced beyond raw data.
- As a user, I want visualization to be accessible from the filter details flow so that I do not have to navigate through multiple pages.
- As a user, I want the app to allow exploring generated filters even while visualization rendering specifics are defined later.

## Feature: Visualization on Filter Details
### What it must show/work
- On `Filter Details` page, once filter generation is `Success`, the UI provides a visualization area.
- The visualization area must let users “explore” the generated filter (basic inspection even if advanced controls are added later).
- Visualization rendering must not block access to the filter details and CSV export.

### What to handle in UI states
- While status is `Pending` / `Generating`: show a placeholder (e.g., “Visualization will be available after generation completes”).
- On `Success`: show the visualization.

## Page: `Filter Details` (`/filters/{filterId}`)
## Page-to-Page Contract (Navigation)
- Visualization lives inside filter details (no required navigation to a separate visualization page yet).
- Visualization must use the same `filterId` from `/filters/{filterId}` as the data source for loading filter details.

## Required Backend Contract (Minimal)
- Visualization uses the same filter details data entry (`GET /filters/{filterId}`) once status is `Success`.
- Detailed rendering format is intentionally to be defined later.

