# Add Water Measurement — Lab Equipment via USB — User Stories + Page Contract

## User Stories
- As a user, I want to import a complete measurement from lab equipment connected via USB so that I do not have to type the full dataset.
- As a user, I want the imported measurement to appear in my dashboard list so that I can immediately use it for generating a filter.

## Page: `Lab Equipment Import` (`/measurements/new/lab-equipment`)
### What the page must show
- A clear connection status area (e.g., “Waiting for device”, “Connected”, “Reading data”, “Import completed”)
- A preview/summary of the imported measurement (at least Temperature and pH, plus a list/count of additional parameters if present)
- A confirmation action (if we need explicit user confirmation before saving)
- Error feedback (device not found, read/import failure)

### What the page must do (high-level)
- Reads measurement data from the connected lab equipment.
- Creates a measurement record once data is available.
- Converts the readings into the measurement payload (Temperature, pH, and optional parameters) and sends it as JSON to `POST /measurements` with `source = "lab_equipment"`.
- Returns the user to `Dashboard` with the new measurement included.

## Page-to-Page Contract (Navigation)
- `Lab Equipment Import` -> `Dashboard` after the measurement is created.

## Required Backend Contract (Minimal)
See `docs/contracts/page-api-contract.md`:
- `POST /measurements` with `source = "lab_equipment"`

