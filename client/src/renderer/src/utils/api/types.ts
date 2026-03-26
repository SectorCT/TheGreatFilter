export type MeasurementSource = 'manual' | 'lab_equipment' | 'gemstat' | 'csv_import'

export type MeasurementParameter = {
  parameterCode: string
  value: number
  // Optional metadata (may be omitted/empty depending on the source)
  file?: string | null
  parameterName?: string | null
  unit?: string | null
}

export type MeasurementCreateRequest = {
  source: MeasurementSource
  temperature: number
  ph: number
  parameters: MeasurementParameter[]
}

export type MeasurementCreateResponse = {
  measurementId: string
}

export type Measurement = {
  measurementId: string
  source: MeasurementSource
  createdAt: string // ISO-8601
  temperature: number
  ph: number
  parameters: MeasurementParameter[]
}

// ---------------- Auth ----------------

export type LoginRequest = { email: string; password: string }

export type AuthUser = { userId: string; email: string }

export type AuthResponse = { token: string; user: AuthUser }

export type SignupRequest = LoginRequest

export type SignupResponse = AuthResponse

// --------------- GemStat ----------------

export type GemstatLocation = {
  locationId: string
  localStationNumber: string | null
  countryName: string | null
  waterType: string | null
  stationIdentifier: string | null
  stationNarrative: string | null
  waterBodyName: string | null
  mainBasin: string | null
  upstreamBasinArea: string | null
  elevation: number | null
  monitoringType: string | null
  dateStationOpened: string | null // YYYY-MM-DD
  responsibleCollectionAgency: string | null
  latitude: number
  longitude: number
  riverWidth: number | null
  discharge: number | null
  maxDepth: number | null
  lakeArea: number | null
  lakeVolume: number | null
  averageRetention: number | null
  areaOfAquifer: number | null
  depthOfImpermableLining: number | null
  productionZone: string | null
  meanAbstractionRate: number | null
  meanAbstractionLevel: number | null
}

export type GemstatLocationFetchResponse = {
  locations: GemstatLocation[]
}

export type GemstatStationMeasurementRow = {
  sampleDate: string // YYYY-MM-DD
  sampleTime: string // HH:mm
  depth: number | null
  parameterCode: string
  analysisMethodCode: string | null
  valueFlags: string | null
  value: number
  unit: string
  dataQuality: string | null
}

export type GemstatStationMeasurementsResponse = {
  locationId: string
  measurements: GemstatStationMeasurementRow[]
}

export type GemstatSnapshotFetchResponse = {
  measurement: Measurement
}

// --------------- Filters ----------------

export type FilterStatus = 'Pending' | 'Generating' | 'Success' | 'Failed'

export type GenerateFilterRequest = { measurementId: string }

export type GenerateFilterResponse = {
  filterId: string
  status: 'Pending'
}

export type FilterStatusRefreshResponse = {
  filterId: string
  status: FilterStatus
  updatedAt: string // ISO-8601
}

export type FilterDetailsSuccessResponse = {
  filterId: string
  status: 'Success'
  filterInfo: unknown // opaque for now
  createdAt: string // ISO-8601
}

// ---------------- Export ----------------

export type ExportGeneratedFilterCsvResponse =
  | { kind: 'csvText'; csvText: string }
  | { kind: 'downloadUrl'; downloadUrl: string }

