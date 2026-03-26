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
- Returns the current user's measurements as aggregate records

### `POST /measurements/`

- Auth: required
- Used for manual or lab-equipment measurements
- Body:

```json
{
  "name": "optional",
  "source": "manual|lab_equipment|csv_import|gemstat",
  "sampleDate": "2026-03-26",
  "sampleTime": "10:30:00",
  "depth": 1.2,
  "volume": {
    "value": 10,
    "unit": "L"
  },
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
- Returns the full aggregate measurement payload, including `rows` and `measurementsByDate`

### `GET /measurements/map/`

- Auth: required
- Returns unique map-ready lab/station locations
- Example response:

```json
{
  "results": [
    {
      "measurementId": "uuid",
      "locationId": "ARG00003",
      "name": "Paraguay River - at Puerto Bermejo",
      "source": "gemstat",
      "latitude": -26.925888,
      "longitude": -58.507027,
      "dateCount": 12,
      "snapshotCount": 14,
      "latestSnapshot": {
        "dateKey": "2018-08-22",
        "snapshotIndex": 0,
        "sampleTime": "10:45:00",
        "temperature": 17.6,
        "ph": 7.75,
        "parameterCount": 24,
        "summary": "water 10L - NaCl 1%, Ag 0.001%"
      },
      "sampleLocation": {
        "station_id": "ARG00003",
        "country": "Argentina",
        "water_type": "River station",
        "station_identifier": "Paraguay River - at Puerto Bermejo",
        "latitude": -26.925888,
        "longitude": -58.507027
      }
    }
  ],
  "count": 1
}
```

### `GET /measurements/locations/{locationId}/`

- Auth: required
- Returns the full aggregate payload for one clicked lab/station/location
- Frontend should render the selector UI from the `rows` array
- Example response:

```json
{
  "measurementId": "uuid",
  "locationId": "ARG00003",
  "name": "Paraguay River - at Puerto Bermejo",
  "source": "gemstat",
  "createdAt": "2026-03-26T00:00:00Z",
  "sampleLocation": {
    "station_id": "ARG00003",
    "country": "Argentina",
    "water_type": "River station",
    "station_identifier": "Paraguay River - at Puerto Bermejo",
    "latitude": -26.925888,
    "longitude": -58.507027
  },
  "dateCount": 2,
  "snapshotCount": 3,
  "latestSnapshot": {
    "dateKey": "2025-06-24",
    "snapshotIndex": 0
  },
  "rows": [
    {
      "dateKey": "2025-06-24",
      "snapshotIndex": 0,
      "label": "2025-06-24 - water 10L - NaCl 1%, Ag 0.001%",
      "sampleTime": "10:30:00",
      "depth": 1.2,
      "volume": {
        "value": 10,
        "unit": "L"
      },
      "temperature": 20.4,
      "ph": 7.1,
      "parameterCount": 2,
      "summary": "water 10L - NaCl 1%, Ag 0.001%",
      "parameters": [
        {
          "parameterCode": "NaCl",
          "parameterName": "Sodium Chloride",
          "unit": "%",
          "value": 1.0
        },
        {
          "parameterCode": "Ag",
          "parameterName": "Silver",
          "unit": "%",
          "value": 0.001
        }
      ]
    }
  ],
  "measurementsByDate": {
    "2025-06-24": [
      {
        "sampleTime": "10:30:00",
        "depth": 1.2,
        "volume": {
          "value": 10,
          "unit": "L"
        },
        "temperature": 20.4,
        "ph": 7.1,
        "parameters": {
          "NaCl": {
            "parameterCode": "NaCl",
            "parameterName": "Sodium Chloride",
            "unit": "%",
            "value": 1.0
          },
          "Ag": {
            "parameterCode": "Ag",
            "parameterName": "Silver",
            "unit": "%",
            "value": 0.001
          }
        },
        "summary": "water 10L - NaCl 1%, Ag 0.001%"
      }
    ]
  }
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
- Frontend should first fetch `/measurements/locations/{locationId}/`, let the user choose one row and substances, then post the selected water payload here
- Body:

```json
{
  "studyId": "uuid",
  "measurementId": "uuid",
  "measurement": {
    "dateKey": "2025-06-24",
    "sampleTime": "10:30:00",
    "depth": 1.2,
    "volume": {
      "value": 10,
      "unit": "L"
    },
    "temperature": 20.4,
    "ph": 7.1,
    "summary": "water 10L - NaCl 1%, Ag 0.001%",
    "parameters": [
      {
        "parameterCode": "NaCl",
        "parameterName": "Sodium Chloride",
        "unit": "%",
        "value": 1.0
      },
      {
        "parameterCode": "Ag",
        "parameterName": "Silver",
        "unit": "%",
        "value": 0.001
      }
    ]
  },
  "targetParameterCodes": ["Ag"],
  "coreInputs": {}
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
- Frontend should use `/measurements/map/` for the map and `/measurements/locations/{locationId}/` after a map click.
- The frontend should render its date picker from the `rows` array in the location detail response.
- `POST /filters/generate/` stores the submitted selected measurement payload inside the experiment payload.
- The `filterId` returned from `POST /filters/generate/` is the id the frontend should poll on `/filters/{filterId}/status/`.
- Status updates are polling-based, not websocket-based.
- Filter generation currently runs end to end but returns placeholder orchestrator output until the real external container is connected.
