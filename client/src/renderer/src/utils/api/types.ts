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
  sampleDate: string
  sampleTime: string
  depth?: number
  volume?: { value: number; unit: string }
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
  locationId?: string
  name?: string
  source: MeasurementSource
  createdAt: string // ISO-8601
  sampleDate?: string
  sampleTime?: string
  depth?: number
  volume?: { value: number; unit: string }
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
  status?: string
}

export type StudyUpdateRequest = {
  name?: string
  description?: string
  status?: string
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
  measurementId?: string
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
  measurementId: string
  stationName: string | null
  source: MeasurementSource | string
  locationId: string
  rows: GemstatLocationRow[]
  measurements: GemstatStationMeasurementRow[]
}

export type GemstatSnapshotFetchResponse = {
  measurement: Measurement
}

export type GemstatLocationRow = {
  dateKey: string
  snapshotIndex: number
  label: string
  sampleTime: string
  depth: number | null
  volume: { value: number; unit: string } | null
  temperature: number | null
  ph: number | null
  parameterCount: number
  summary: string | null
  parameters: MeasurementParameter[]
}

// --------------- Measurements ----------------

export type MeasurementMapItem = {
  measurementId: string
  locationId?: string
  name: string
  source: MeasurementSource | string
  latitude?: number | null
  longitude?: number | null
  dateCount?: number
  snapshotCount?: number
  latestSnapshot?: {
    dateKey: string
    snapshotIndex: number
    sampleTime?: string
    temperature?: number
    ph?: number
    parameterCount?: number
    summary?: string
  } | null
  sampleLocation?: {
    station_id?: string
    local_station_number?: string
    country?: string
    main_basin?: string
    water_type?: string
    water_body_name?: string
    station_narrative?: string
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
  studyName?: string
  measurementId: string
  measurementName?: string
  useQuantumComputer?: boolean | null
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
  useQuantumComputer: boolean
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

export type FilterStructureLayerSlice = {
  connections?: Array<{ from: string | number; to: string | number; order?: number }>
  atomPositions?: Array<{ id?: string | number; x: number; y: number; z: number; element: string }>
  poreSize?: number
  layerThickness?: number
  latticeSpacing?: number
  materialType?: string
}

export type FilterLayerRow = {
  method?: string
  poreSize?: number
  pollutant?: string
  materialType?: string
  bindingEnergy?: number
  layerThickness?: number
  pollutantSymbol?: string
  removalEfficiency?: number
}

export type FilterInfo = {
  layers?: FilterLayerRow[]
  filterStructure?: {
    poreSize?: number
    layerThickness?: number
    latticeSpacing?: number
    materialType?: string
    /** Some API bundles nest the same summary block here instead of under `filterInfo`. */
    summaryMetrics?: {
      parameter_count?: number
      layer_count?: number
      removalEfficiency?: number
      bindingEnergy?: number
      materialType?: string
      usedQuantumComputer?: boolean
    }
    layers?: FilterStructureLayerSlice[]
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
    layer_count?: number
    removalEfficiency?: number
    bindingEnergy?: number
    materialType?: string
    usedQuantumComputer?: boolean
  }
}

export type FilterDetailsSuccessResponse = {
  filterId: string
  studyId: string
  studyName?: string
  measurementId: string
  measurementName?: string
  status: 'Success'
  usedQuantumComputer?: boolean
  filterInfo: FilterInfo
  createdAt: string // ISO-8601
}

// ---------------- Export ----------------

export type ExportGeneratedFilterCsvResponse =
  | { kind: 'csvText'; csvText: string }
  | { kind: 'downloadUrl'; downloadUrl: string }
