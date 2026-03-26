# Filter Generation Flow — User Stories + Page Contract

## User Stories
- As a user, I want to trigger filter generation from a selected measurement so that I can obtain a new filtration design tailored to my use case.
- As a user, I want the app to accept my generation request and show a status refresh so that I can track progress during long-running work.
- As a user, I want to access the generated filter details after generation succeeds so that I can decide what to do next.

## Feature: `Generate Filter` (from Dashboard)
### What the feature must show/work
- The user selects a measurement from the measurement list.
- The user clicks “Generate Filter”.
- The app creates an in-progress filter entry immediately and shows it in the “All Filters” list:
  - status `Pending` (accepted but not started yet, or initial stage)
  - status `Generating` while work is in progress
- The dashboard keeps the status updated (periodic refresh).
- When the status becomes `Success`, the user can open filter details.

### Required UI states
- No selection: disable “Generate Filter”
- Request accepted: show `Pending` state
- In progress: show `Generating`
- Failure: show `Failed` and an actionable retry path (if supported)

## Page: `Filter Details` (`/filters/{filterId}`)
### What it must show
- The selected filter status while it is not successful
- Once status is `Success`:
  - the filter information (exact structure intentionally unspecified for now)
  - entry point to visualization (defined as a feature)
  - entry point to export as CSV

## Page-to-Page Contract (Navigation)
- `Dashboard` -> `Filter Details` when the user opens a completed filter (or when they click a filter row).
- The `Filter Details` page must read `filterId` from `/filters/{filterId}` and use it as the key for:
  - status refresh
  - loading filter information

## Required Backend Contract (Minimal)
See `docs/contracts/page-api-contract.md`:
- `POST /filters/generate` (returns 200 + `filterId`)
- `GET /filters/{filterId}/status` (poll/refresh)
- `GET /filters/{filterId}` (allowed after success)

