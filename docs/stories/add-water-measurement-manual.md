# Add Water Measurement — Manual Input — User Stories + Page Contract

## User Stories
- As a user, I want to manually enter a measurement so that I can start filter generation quickly when I do not have a dataset or hardware sensor.
- As a user, I want clear validation so that I am told if the required fields (`Temperature` and `pH`) are missing.

## Page: `Manual Measurement` (`/measurements/new/manual`)
### What the page must show
- Input fields for:
  - Temperature (required)
  - pH (required)
- Optional inputs for other parameters (shown as an optional “advanced parameters” section)
- Save/Import action (e.g., `Add Measurement`)
- Validation messages inline (and/or above the form)

### What the page must do (high-level)
- User submits a measurement.
- If required fields are missing, generation inputs are blocked and the user is shown actionable validation.
- On success, the measurement appears in the dashboard measurements list.

## Page-to-Page Contract (Navigation)
- `Manual Measurement` -> `Dashboard` after successful creation.

## Required Backend Contract (Minimal)
See `docs/contracts/page-api-contract.md`:
- `POST /measurements`

