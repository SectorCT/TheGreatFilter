# Add Water Measurement — Map-Based Selection (GemStat) — User Stories + Page Contract

## User Stories
- As a user, I want to browse a map of measurement centers so that I can select a relevant location.
- As a user, I want to click a location and load all available measurements for that station (all categories and all dates) so that I can understand its water quality history.
- As a user, I want to pick a date from that station history and see the water quality at that date so that my filter generation is based on up-to-date data.
- As a user, I want to use the selected date’s derived measurement directly for filter generation so that the workflow stays simple.

## Page: `GemStat Map` (`/measurements/map`)
### What the page must show
- An interactive map with selectable locations (measurement centers)
- For the hovered/selected location:
  - historical water quality overview
  - current water quality overview
- Controls to select a location and a date/context
- A clear “Use this measurement” action

### What the page must do (high-level)
- When the user opens the map page, the app must first fetch **all GemStat locations** (including name/country/type and coordinates) to render markers.
- When the user clicks a specific location marker, the app fetches the full station measurements history for that station (`GET /gemstat/station-measurements`).
- The UI groups the returned rows by `parameterCode` and plots graphs over time, and lets the user pick a specific date.
- When the user selects a date, the app derives a measurement payload:
  - `Temperature` and `pH` are required for measurement creation
  - all other parameters are optional
- The derived measurement payload is then sent as JSON to `POST /measurements` with `source = "gemstat"`.

## Page-to-Page Contract (Navigation)
- `GemStat Map` -> `Dashboard` after measurement is created/available for selection.
- Alternative (optional UX): `GemStat Map` -> directly opens filter generation flow using that measurement.

## Required Backend Contract (Minimal)
See `docs/contracts/page-api-contract.md`:
- `GET /gemstat/locations` (fetch all markers metadata for the map UI)
- `GET /gemstat/station-measurements` (fetch full station measurement history rows after marker click)
- (Optional optimization) `GET /gemstat/snapshots` (by `locationId` and `date`) can be used later to reduce payload size
- `POST /measurements` with `source = "gemstat"` to create the selected measurement from the derived date payload

