# Add Water Measurement — Map-Based Selection (GemStat) — User Stories + Page Contract

## User Stories
- As a user, I want to browse a map of measurement centers so that I can select a relevant location.
- As a user, I want to pick a location and date and see the latest available water quality so that my filter generation is based on up-to-date data.
- As a user, I want to use the selected snapshot directly for filter generation so that the workflow stays simple.

## Page: `GemStat Map` (`/measurements/map`)
### What the page must show
- An interactive map with selectable locations (measurement centers)
- For the hovered/selected location:
  - historical water quality overview
  - current water quality overview
- Controls to select a location and a date/context
- A clear “Use this measurement” action

### What the page must do (high-level)
- When a user selects location + date, the app fetches the latest available snapshot for that selection.
- The selection is converted into a measurement payload (Temperature, pH, and optional parameters) and sent as JSON to `POST /measurements` with `source = "gemstat"`.

## Page-to-Page Contract (Navigation)
- `GemStat Map` -> `Dashboard` after measurement is created/available for selection.
- Alternative (optional UX): `GemStat Map` -> directly opens filter generation flow using that measurement.

## Required Backend Contract (Minimal)
See `docs/contracts/page-api-contract.md`:
- `GET /gemstat/snapshots` (by `locationId` and `date`)
- `POST /measurements` with `source = "gemstat"` to create the selected measurement from the fetched snapshot

