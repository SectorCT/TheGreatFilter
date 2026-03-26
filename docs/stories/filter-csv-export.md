# CSV Export of Generated Filters — User Stories + Page Contract

## User Stories
- As a user, I want to export a generated filter as a CSV after it is created so that I can share or archive results.
- As a user, I want the exported CSV to be available even before visualization is fully expanded into multiple formats, so that CSV export remains a stable output option.

## Feature: `Export CSV` (from Filter Details)
### What the feature must show/work
- The user opens a generated filter details page.
- If the filter status is `Success`:
  - an `Export CSV` action is visible and enabled.
- If the filter is not successful:
  - export is disabled or hidden, and the user sees the current status.
- When export is triggered:
  - the app downloads a CSV file for that specific filter.

### File format scope
- The CSV schema/content is intentionally to be defined later.
- For now, the required behavior is: “export should download a CSV for a successful filter”.

## Page: `Filter Details` (`/filters/{filterId}`)
## Page-to-Page Contract (Navigation)
- No navigation required; export is an action that stays on `Filter Details`.
- Export action must use `filterId` from `/filters/{filterId}` as the identifier for the export request.

## Required Backend Contract (Minimal)
See `docs/contracts/page-api-contract.md`:
- `GET /filters/{filterId}/export?format=csv`

