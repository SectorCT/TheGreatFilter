# Frontend API List

Base URL:

- `http://<backend-host>:8000/api`

## Authentication

### `POST /auth/signup/`

- Auth: public
- Body:

```json
{
  "email": "user@example.com",
  "full_name": "Optional Name",
  "organization_name": "Optional Org",
  "role_title": "Optional Role",
  "country": "Optional Country",
  "password": "secret123",
  "password2": "secret123"
}
```

- Response:

```json
{
  "token": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "userId": 1,
    "username": "generated-or-existing-username",
    "email": "user@example.com",
    "full_name": "Optional Name",
    "organization_name": "",
    "role_title": "",
    "country": "",
    "dateJoined": "2026-03-26T00:00:00Z"
  }
}
```

### `POST /auth/login/`

- Auth: public
- Body:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

- Response:

```json
{
  "token": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "userId": 1,
    "username": "generated-or-existing-username",
    "email": "user@example.com",
    "full_name": "Optional Name",
    "organization_name": "",
    "role_title": "",
    "country": "",
    "dateJoined": "2026-03-26T00:00:00Z"
  }
}
```

### `POST /auth/logout/`

- Auth: required
- Body:

```json
{
  "refresh": "jwt-refresh-token"
}
```

## Studies

### `GET /studies/`

- Auth: required
- Returns the current user's studies

### `POST /studies/`

- Auth: required
- Body:

```json
{
  "name": "Study name",
  "description": "Optional description",
  "status": "active"
}
```

### `GET /studies/{id}/`

- Auth: required

### `PUT /studies/{id}/`

- Auth: required

### `DELETE /studies/{id}/`

- Auth: required

## Measurements

### `GET /measurements/`

- Auth: required
- Returns the current user's measurements

### `POST /measurements/`

- Auth: required
- Used for manual or lab-equipment measurements
- Body:

```json
{
  "name": "optional",
  "source": "manual|lab_equipment|csv_import|gemstat",
  "temperature": 22.1,
  "ph": 7.3,
  "parameters": [
    {
      "file": "optional",
      "parameterCode": "As-Tot",
      "parameterName": "Arsenic Total",
      "unit": "mg/l",
      "value": 0.011
    }
  ],
  "sampleLocation": {}
}
```

- Response:

```json
{
  "measurementId": "uuid"
}
```

### `GET /measurements/{id}/`

- Auth: required
- Returns full measurement details

### `GET /measurements/map/`

- Auth: required
- Returns map-ready measurement dots
- Example response:

```json
{
  "results": [
    {
      "measurementId": "uuid",
      "name": "River sample",
      "source": "gemstat",
      "temperature": 17.6,
      "ph": 7.75,
      "latitude": -26.925888,
      "longitude": -58.507027,
      "parameterCount": 24,
      "sampleDate": "2018-08-22",
      "sampleTime": "10:45:00",
      "sampleLocation": {
        "station_id": "ARG00003",
        "country": "Argentina",
        "water_type": "River station",
        "station_identifier": "Paraguay River - at Puerto Bermejo",
        "latitude": -26.925888,
        "longitude": -58.507027
      },
      "createdAt": "2026-03-26T00:00:00Z"
    }
  ],
  "count": 1
}
```

### `POST /measurements/import/csv/`

- Auth: required
- Content type: `multipart/form-data`
- Fields:
  - `file` required
  - `name` optional

## Filters

### `GET /filters/`

- Auth: required
- Returns generated filters for the current user

### `POST /filters/generate/`

- Auth: required
- Body:

```json
{
  "studyId": "uuid",
  "measurementId": "uuid"
}
```

- Response:

```json
{
  "filterId": "uuid",
  "status": "Pending"
}
```

### `GET /filters/{filterId}/status/`

- Auth: required
- Use this endpoint for periodic polling

### `GET /filters/{filterId}/`

- Auth: required
- Returns full filter details
- Example response:

```json
{
  "filterId": "uuid",
  "studyId": "uuid",
  "measurementId": "uuid",
  "status": "Success",
  "filterInfo": {
    "filterStructure": {},
    "experimentPayload": {},
    "resultPayload": {},
    "summaryMetrics": {}
  },
  "createdAt": "2026-03-26T00:00:00Z"
}
```

### `GET /filters/{filterId}/export/`

- Auth: required
- Returns CSV export

## System

### `GET /health/`

- Auth: public
- Health check endpoint

## Important Notes

- Protected endpoints require `Authorization: Bearer <token>`.
- Filter generation requires both `studyId` and `measurementId`.
- Frontend should use `/measurements/map/` for the map, not old GemStat-specific endpoints.
- Status updates are polling-based, not websocket-based.
- Filter generation currently runs end to end but returns placeholder orchestrator output until the real external container is connected.
