# GemStat Map Contract (Locations Metadata)

This contract defines the expected API response used to render the GemStat locations map.
When the user opens the map, the frontend requests **all locations** and uses metadata (name, country, water type, coordinates, etc.) to render markers and labels.

## 1. Endpoint: fetch all locations

### `GET /gemstat/locations`

Request:
- No body required
- (Optional later) supports pagination/filtering; for this PRD version the map loads everything in one call.

Response:
```json
{
  "locations": [
    {
      "locationId": "string",
      "localStationNumber": "string|null",
      "countryName": "string|null",
      "waterType": "string|null",
      "stationIdentifier": "string|null",
      "stationNarrative": "string|null",
      "waterBodyName": "string|null",
      "mainBasin": "string|null",
      "upstreamBasinArea": "string|null",
      "elevation": "number|null",
      "monitoringType": "string|null",
      "dateStationOpened": "YYYY-MM-DD|null",
      "responsibleCollectionAgency": "string|null",
      "latitude": "number",
      "longitude": "number",
      "riverWidth": "number|null",
      "discharge": "number|null",
      "maxDepth": "number|null",
      "lakeArea": "number|null",
      "lakeVolume": "number|null",
      "averageRetention": "number|null",
      "areaOfAquifer": "number|null",
      "depthOfImpermableLining": "number|null",
      "productionZone": "string|null",
      "meanAbstractionRate": "number|null",
      "meanAbstractionLevel": "number|null"
    }
  ]
}
```

## 2. Source column mapping (from GemStat semicolon-delimited dataset)
The source dataset is semicolon-separated and contains columns like:
`GEMS Station Number;Local Station Number;Country Name;Water Type;Station Identifier;Station Narrative;Water Body Name;Main Basin;Upstream Basin Area;Elevation;Monitoring Type;Date Station Opened;Responsible Collection Agency;Latitude;Longitude;...`

Product mapping rule:
- `locationId` MUST be derived from **`GEMS Station Number`**.
- `latitude` / `longitude` MUST be parsed into numeric values.

## 3. Data normalization rules (important)
- Empty fields in the dataset must become `null` in the JSON response.
- Numeric parsing:
  - The dataset may contain decimals with commas (e.g. `-26,925888`).
  - The API response must return normalized JSON `number` values (with dot decimal internally).
- If `latitude` or `longitude` is missing/invalid, the API should either:
  - omit the location from the response, or
  - return `null` coordinates and let the frontend skip rendering.
  For this PRD version, preferred is omission for safety.

## 4. What the map UI must use from this contract
For each marker, the UI should be able to display (at minimum):
- a human-readable label (e.g., `stationNarrative` and/or `waterBodyName`)
- the country name
- the water type
- a map pin at (`latitude`, `longitude`)

