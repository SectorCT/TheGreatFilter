# Add Water Measurement — Import From CSV — User Stories + Page Contract

## User Stories
- As a user, I want to import measurements from a CSV file so that I can bring data from external sources.
- As a user, I want validation feedback when the CSV is missing required information so that I can fix issues quickly.

## Page: `CSV Import` (`/measurements/import/csv`)
### What the page must show
- A file picker for selecting the CSV file
- A “validate & preview” step (before fully importing), showing:
  - whether required fields are present (at least `Temperature` and `pH` for our required measurement workflow)
  - a preview/summary of imported parameters (count + basic list)
- Clear validation errors with human-readable messages

### What the page must do (high-level)
- Import the measurement from the CSV file.
- Create a measurement record and make it visible in `Dashboard`.
- Parse the CSV into the required measurement payload (Temperature, pH, and optional parameters) and send it as JSON to `POST /measurements` with `source = "csv_import"`.

## Page-to-Page Contract (Navigation)
- `CSV Import` -> `Dashboard` after the measurement is imported successfully.

## Required Backend Contract (Minimal)
See `docs/contracts/page-api-contract.md`:
- `POST /measurements` with `source = "csv_import"`

CSV column format:
- Intentionally to be further defined later.
- The product must ensure required information is validated and errors are reported.

