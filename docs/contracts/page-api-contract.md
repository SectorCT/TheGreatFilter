# Page API Contract (Navigation + Minimal Backend Calls)

This document defines the expected contract between frontend pages/components and the backend services they must call.
The goal is to make page behavior unambiguous while keeping the internal filter data structure intentionally unspecified for now.

## 1. Suggested Routes (Frontend)

- `GET /auth`  
  Shows Login / Sign Up when the user is not authenticated.

- `GET /dashboard`  
  Shows the user’s previous filters and water measurements.

- `POST /auth/login` and `POST /auth/signup`  
  Authentication actions (used by the `auth` flow).

- Measurement creation flows (entry points from the dashboard):
  - `GET /measurements/new/manual`
  - `GET /measurements/new/lab-equipment`
  - `GET /measurements/map`
  - `GET /measurements/import/csv`

- Map locations metadata (used by the map-based measurement selection page):
  - `GET /gemstat/locations` (fetch all locations)

- Filter generation flows:
  - `POST /filters/generate` (triggered from the dashboard “Generate filter” action)
  - `GET /filters/{filterId}` (filter details + visualization entry point)
  - CSV export action is triggered from the filter details page (see “Export” section).

## 2. Shared Data Contracts (Minimal JSON Shapes)

The following shapes describe what pages must have access to. Fields not listed here can exist, but these are the required minimums.

## 2.4 Navigation / Route-Param Contract (Frontend)
Pages must coordinate using route parameters and shared identifiers. The following values are required for navigation.

- Auth flow:
  - `Auth` -> `Dashboard` does not require route params.
  - The authenticated session must be established and preserved (e.g., via a token in the app session store).

- Dashboard flow:
  - `Dashboard` -> measurement creation/import pages does not require route params.
  - `Dashboard` -> `Filter Details` must use `filterId` in the route:
    - `/filters/{filterId}`

- Filter generation flow:
  - When the user triggers `Generate Filter`, the app must obtain and store the returned `filterId` so it can:
    - show the filter immediately in the “All Filters” list
    - refresh status using the `filterId`
    - navigate to `/filters/{filterId}` when the status is `Success`

- Export flow:
  - `Filter Details` uses the current `filterId` from `/filters/{filterId}` to trigger CSV export actions.

### 2.1 Measurement
```json
{
  "measurementId": "string",
  "source": "manual|lab_equipment|gemstat|csv_import",
  "createdAt": "ISO-8601 string",
  "temperature": "number",
  "ph": "number",
  "parameters": [
    {
      "file": "string",
      "parameterCode": "string",
      "parameterName": "string",
      "unit": "string",
      "value": "number"
    }
  ]
}
```

Product rule:
- Manual entry requires `temperature` and `ph`.
- All generation inputs must include `temperature` and `ph`.

### 2.2 Filter (List + Status)
```json
{
  "filterId": "string",
  "measurementId": "string",
  "createdAt": "ISO-8601 string",
  "status": "Pending|Generating|Success|Failed"
}
```

### 2.3 Filter Details (Status = Success)
The `filterInfo` is intentionally opaque for now.
```json
{
  "filterId": "string",
  "status": "Success",
  "filterInfo": "object (opaque for now)",
  "createdAt": "ISO-8601 string"
}
```

## 3. Backend Endpoints Required by Pages

This is the minimal set needed to make page flows work end-to-end.

### 3.1 Authentication
#### `POST /auth/login`
Request:
```json
{ "email": "string", "password": "string" }
```
Response:
```json
{ "token": "string", "user": { "userId": "string", "email": "string" } }
```

#### `POST /auth/signup`
Request:
```json
{ "email": "string", "password": "string" }
```
Response:
```json
{ "token": "string", "user": { "userId": "string", "email": "string" } }
```

### 3.2 Measurements
#### Create measurement (single endpoint for all sources): `POST /measurements`
Request:
```json
{
  "source": "manual|lab_equipment|gemstat|csv_import",
  "temperature": "number",
  "ph": "number",
  "parameters": [ { "file":"string", "parameterCode":"string", "parameterName":"string", "unit":"string", "value":"number" } ]
}
```
Response:
```json
{ "measurementId": "string" }
```

#### Map snapshot lookup (GemStat): `GET /gemstat/snapshots`
Used by the map-based measurement selection page.
Query parameters:
`locationId=string`, `date=ISO-8601 string`
Response:
```json
{ "measurement": { /* Measurement shape */ } }
```

#### Map locations metadata: `GET /gemstat/locations`
Used when the user opens the map so the UI can render all markers and labels.
Response:
```json
{ "locations": [ /* Location metadata objects */ ] }
```
For the exact shape, see `docs/contracts/gemstat-map-contract.md`.

### 3.3 Filter Generation
#### Trigger generation: `POST /filters/generate`
This is called when the user triggers “Generate Filter” from a chosen measurement.
Request:
```json
{ "measurementId": "string" }
```
Response:
```json
{
  "filterId": "string",
  "status": "Pending"
}
```

#### Status refresh: `GET /filters/{filterId}/status`
Response:
```json
{
  "filterId": "string",
  "status": "Pending|Generating|Success|Failed",
  "updatedAt": "ISO-8601 string"
}
```

#### Fetch filter details: `GET /filters/{filterId}`
Allowed when status is `Success`.
Response:
```json
{
  "filterId": "string",
  "status": "Success",
  "filterInfo": "object (opaque for now)",
  "createdAt": "ISO-8601 string"
}
```

### 3.4 CSV Export
#### Export generated filter: `GET /filters/{filterId}/export?format=csv`
Used from the filter details page.
Response:
- Either a CSV file download (recommended):
  - `Content-Type: text/csv`
  - `Content-Disposition: attachment; filename="filter-{filterId}.csv"`
- Or a JSON payload containing a temporary download URL (allowed as an alternative):
  ```json
  { "downloadUrl": "https://..." }
  ```

CSV format:
- intentionally to be defined later

## 4. Page Contract Rules (How Pages Must Behave)

1. The Dashboard must show both completed and in-progress filters.
2. In-progress filters must visibly show `Pending` and `Generating`.
3. Filter details should be accessible from the dashboard, but must handle non-success statuses:
   - show status until `Success`
   - disable export until `Success`
4. Visualization should be available on filter details for `Success`, but CSV export must not depend on visualization being finalized.

