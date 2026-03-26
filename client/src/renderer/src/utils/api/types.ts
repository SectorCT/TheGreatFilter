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
  name?: string
  source: MeasurementSource
  temperature: number
  ph: number
  parameters: MeasurementParameter[]
  sampleLocation?: Record<string, unknown>
}

export type MeasurementCreateResponse = {
  measurementId: string
}

export type Measurement = {
  measurementId: string
  name?: string
  source: MeasurementSource
  createdAt: string // ISO-8601
  temperature: number
  ph: number
  // Present in detail responses; list responses may omit it.
  parameters?: MeasurementParameter[]
  sampleLocation?: Record<string, unknown>
}

export type MeasurementListItem = Omit<Measurement, 'parameters'> & {
  parameters?: MeasurementParameter[]
}

// ---------------- Auth ----------------

export type LoginRequest = { email: string; password: string }

export type SignupRequest = {
  email: string
  full_name?: string
  organization_name?: string
  role_title?: string
  country?: string
  password: string
  password2: string
}

export type AuthUser = {
  userId: number
  username: string
  email: string
  full_name?: string
  organization_name?: string
  role_title?: string
  country?: string
  dateJoined?: string
}

export type AuthResponse = {
  token: string
  refreshToken: string
  user: AuthUser
}

export type SignupResponse = AuthResponse

// --------------- Studies ----------------

export type Study = {
  id: string
  name: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export type StudyCreateRequest = {
  name: string
  description?: string
}

export type StudyUpdateRequest = {
  name?: string
  description?: string
}

export type StudyListResponse =
  | {
      results?: Study[]
      count?: number
    }
  | Study[]

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

// --------------- Measurements ----------------

export type MeasurementMapItem = {
  measurementId: string
  name: string
  source: MeasurementSource | string
  temperature: number
  ph: number
  latitude: number
  longitude: number
  parameterCount: number
  sampleDate: string
  sampleTime: string
  sampleLocation?: {
    station_id?: string
    country?: string
    water_type?: string
    station_identifier?: string
    latitude?: number
    longitude?: number
  } | null
  createdAt: string
}

export type MeasurementMapResponse = {
  results: MeasurementMapItem[]
  count: number
}

export type MeasurementListResponse =
  | {
      results?: MeasurementListItem[]
      count?: number
    }
  | MeasurementListItem[]

// --------------- Filters ----------------

export type FilterStatus = 'Pending' | 'Generating' | 'Success' | 'Failed'

export type FilterListItem = {
  filterId: string
  studyId: string
  measurementId: string
  status: FilterStatus
  createdAt: string // ISO-8601
}

export type FilterListResponse =
  | {
      results?: FilterListItem[]
      count?: number
    }
  | FilterListItem[]

export type GenerateFilterRequest = {
  studyId: string
  measurementId: string
  measurement: {
    dateKey?: string
    sampleTime?: string | null
    depth?: number | null
    volume?: Record<string, unknown> | null
    temperature: number
    ph: number
    summary?: string | null
    parameters: MeasurementParameter[]
  }
  targetParameterCodes: string[]
  coreInputs?: Record<string, unknown>
}

export type GenerateFilterResponse = {
  filterId: string
  status: 'Pending'
}

export type FilterStatusRefreshResponse = {
  filterId: string
  status: FilterStatus
  updatedAt: string // ISO-8601
}

export type FilterInfo = {
  filterStructure?: {
    poreSize?: number
    layerThickness?: number
    latticeSpacing?: number
    materialType?: string
    atomPositions?: Array<{ id?: string | number; x: number; y: number; z: number; element: string }>
    connections?: Array<{ from: string | number; to: string | number; order?: number }>
  }
  experimentPayload?: {
    measurement_id?: string
    study_id?: string
    temperature?: number
    ph?: number
    params?: Array<{ name: string; value: number; unit?: string | null }>
  }
  resultPayload?: {
    bindingEnergy?: number
    removalEfficiency?: number
    pollutant?: string
    pollutantSymbol?: string
  }
  summaryMetrics?: {
    parameter_count?: number
    removalEfficiency?: number
    bindingEnergy?: number
    materialType?: string
  }
}

export type FilterDetailsSuccessResponse = {
  filterId: string
  studyId: string
  measurementId: string
  status: 'Success'
  filterInfo: FilterInfo
  createdAt: string // ISO-8601
}

// ---------------- Export ----------------

export type ExportGeneratedFilterCsvResponse =
  | { kind: 'csvText'; csvText: string }
  | { kind: 'downloadUrl'; downloadUrl: string }
