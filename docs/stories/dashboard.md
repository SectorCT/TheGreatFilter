# Dashboard — User Stories + Page Contract

## User Stories
- As a user, I want a dashboard that shows my previous filters and measurements so that I can reuse or compare results.
- As a user, I want in-progress filters to be visible with clear status labels (`Pending`, `Generating`) so that I know what is happening.

## Page: `Dashboard` (`/dashboard`)
### What the page must show
- A list of my filters:
  - Completed filters
  - In-progress filters with status shown as `Pending` or `Generating`
- A list of my water measurements
- Entry points/actions to add a new measurement:
  - Manual input
  - Lab equipment via USB
  - Map selection (GemStat dataset)
  - Import from CSV
- A primary action to generate a new filter from a selected measurement

### What the page must do (high-level)
- Allow navigation to measurement creation/import flows
- Allow triggering filter generation from a selected measurement
- Keep filter status visible and up to date via periodic refresh or on-demand refresh

## Page-to-Page Contract (Navigation)
- `Dashboard` -> Measurement flows:
  - `/measurements/new/manual`
  - `/measurements/new/lab-equipment`
  - `/measurements/map`
  - `/measurements/import/csv`
- `Dashboard` -> Filter generation details:
  - Either open `/filters/{filterId}` after generation trigger, or keep showing status in the list and allow opening `/filters/{filterId}` later

## Required Backend Contract (Minimal)
See `docs/contracts/page-api-contract.md` for the minimal endpoints:
- Filter generation trigger:
  - `POST /filters/generate`
- Filter status refresh:
  - `GET /filters/{filterId}/status`
- Fetch filter details when user opens details page:
  - `GET /filters/{filterId}`

