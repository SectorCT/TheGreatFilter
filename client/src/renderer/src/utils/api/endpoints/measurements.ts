import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type Measurement,
  type MeasurementCreateRequest,
  type MeasurementCreateResponse,
  type MeasurementListItem,
  type MeasurementListResponse,
  type MeasurementMapResponse,
  type MeasurementParameter,
  type MeasurementSource
} from '../types'

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isMeasurementSource = (value: unknown): value is MeasurementSource =>
  value === 'manual' || value === 'lab_equipment' || value === 'gemstat' || value === 'csv_import'

const normalizeParameterArray = (value: unknown): MeasurementParameter[] => {
  if (!Array.isArray(value)) return []
  const normalized = value.map((item): MeasurementParameter | null => {
    const record = item as Record<string, unknown>
    const code = typeof record.parameterCode === 'string' ? record.parameterCode : ''
    const val = record.value
    if (!code || !isFiniteNumber(val)) return null
    return {
      parameterCode: code,
      value: val,
      file: typeof record.file === 'string' || record.file === null ? (record.file as string | null) : null,
      parameterName:
        typeof record.parameterName === 'string' || record.parameterName === null
          ? (record.parameterName as string | null)
          : null,
      unit: typeof record.unit === 'string' || record.unit === null ? (record.unit as string | null) : null
    }
  })
  return normalized.filter((item): item is MeasurementParameter => item !== null)
}

const normalizeParameterMap = (value: unknown): MeasurementParameter[] => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return []
  const entries = Object.values(value as Record<string, unknown>)
  return normalizeParameterArray(entries)
}

const extractDetailParameters = (raw: Record<string, unknown>): MeasurementParameter[] => {
  // v1 shape: top-level parameters array
  const topLevelArray = normalizeParameterArray(raw.parameters)
  if (topLevelArray.length > 0) return topLevelArray

  // v2 shape: latestSnapshot.parameters map keyed by parameter code
  const latestSnapshot =
    typeof raw.latestSnapshot === 'object' && raw.latestSnapshot !== null
      ? (raw.latestSnapshot as Record<string, unknown>)
      : null
  const latestSnapshotParameters = normalizeParameterMap(latestSnapshot?.parameters)
  if (latestSnapshotParameters.length > 0) return latestSnapshotParameters

  // v2 fallback: rows[0].parameters may be either array or map
  const firstRow =
    Array.isArray(raw.rows) && raw.rows.length > 0 && typeof raw.rows[0] === 'object' && raw.rows[0] !== null
      ? (raw.rows[0] as Record<string, unknown>)
      : null
  const rowParametersArray = normalizeParameterArray(firstRow?.parameters)
  if (rowParametersArray.length > 0) return rowParametersArray
  return normalizeParameterMap(firstRow?.parameters)
}

const normalizeMeasurementListItem = (
  raw: unknown,
  endpoint: string,
  index: number
): MeasurementListItem => {
  const record = (raw ?? {}) as Record<string, unknown>
  const normalized: MeasurementListItem = {
    measurementId: typeof record.measurementId === 'string' ? record.measurementId : `unknown-${index}`,
    name: typeof record.name === 'string' ? record.name : undefined,
    source: isMeasurementSource(record.source) ? record.source : 'manual',
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    temperature: isFiniteNumber(record.temperature) ? record.temperature : Number.NaN,
    ph: isFiniteNumber(record.ph) ? record.ph : Number.NaN,
    // Backend list items typically provide parameters under `latestSnapshot.parameters` (map), not `parameters` (array).
    parameters: extractDetailParameters(record),
    sampleLocation:
      typeof record.sampleLocation === 'object' && record.sampleLocation !== null
        ? (record.sampleLocation as Record<string, unknown>)
        : undefined
  }

  if (!isFiniteNumber(record.temperature) || !isFiniteNumber(record.ph)) {
    console.error('[Backend Diagnostic] Invalid measurement payload shape', {
      endpoint,
      index,
      expected: {
        measurementId: 'string',
        source: 'manual|lab_equipment|gemstat|csv_import',
        createdAt: 'ISO-8601 string',
        temperature: 'number',
        ph: 'number'
      },
      received: {
        measurementId: record.measurementId,
        source: record.source,
        createdAt: record.createdAt,
        temperature: record.temperature,
        ph: record.ph
      }
    })
  }

  return normalized
}

export const createMeasurement = async (
  request: MeasurementCreateRequest
): Promise<MeasurementCreateResponse> => {
  return makeAuthenticatedReq<MeasurementCreateRequest, MeasurementCreateResponse>({
    method: 'POST',
    path: '/api/measurements/',
    body: request,
    authRequired: true,
  })
}

export const getMeasurements = async (): Promise<MeasurementListResponse> => {
  return makeAuthenticatedReq<undefined, MeasurementListResponse>({
    method: 'GET',
    path: '/api/measurements/',
    authRequired: true,
    parseResponse: async (response) => {
      const payload = (await response.json()) as MeasurementListResponse
      const endpoint = '/api/measurements/'
      if (Array.isArray(payload)) {
        return payload.map((item, index) => normalizeMeasurementListItem(item, endpoint, index))
      }
      const results = Array.isArray(payload.results) ? payload.results : []
      return {
        ...payload,
        results: results.map((item, index) => normalizeMeasurementListItem(item, endpoint, index))
      }
    },
  })
}

export const getMeasurementById = async (measurementId: string): Promise<Measurement> => {
  return makeAuthenticatedReq<undefined, Measurement>({
    method: 'GET',
    path: `/api/measurements/${measurementId}/`,
    authRequired: true,
    parseResponse: async (response) => {
      const endpoint = `/api/measurements/${measurementId}/`
      const raw = (await response.json()) as Record<string, unknown>
      const normalized = normalizeMeasurementListItem(raw, endpoint, 0)
      const parameters = extractDetailParameters(raw)
      if (!parameters.length) {
        console.error('[Backend Diagnostic] Missing detail parameters in measurement payload', {
          endpoint,
          expected: {
            parameters: 'MeasurementParameter[] OR latestSnapshot.parameters map OR rows[].parameters'
          },
          received: {
            parametersType: Array.isArray(raw.parameters) ? 'array' : typeof raw.parameters,
            latestSnapshotKeys:
              typeof raw.latestSnapshot === 'object' && raw.latestSnapshot !== null
                ? Object.keys(raw.latestSnapshot as Record<string, unknown>)
                : null,
            rowsType: Array.isArray(raw.rows) ? 'array' : typeof raw.rows
          }
        })
      }
      return {
        ...normalized,
        parameters
      }
    },
  })
}

export const getMeasurementsMap = async (): Promise<MeasurementMapResponse> => {
  return makeAuthenticatedReq<undefined, MeasurementMapResponse>({
    method: 'GET',
    path: '/api/measurements/map/',
    authRequired: true,
  })
}

export type ImportMeasurementCsvRequest = {
  file: File
  name?: string
}

export const importMeasurementCsv = async (
  request: ImportMeasurementCsvRequest
): Promise<MeasurementCreateResponse> => {
  const formData = new FormData()
  formData.append('file', request.file)
  if (request.name?.trim()) {
    formData.append('name', request.name.trim())
  }

  return makeAuthenticatedReq<FormData, MeasurementCreateResponse>({
    method: 'POST',
    path: '/api/measurements/import/csv/',
    body: formData,
    authRequired: true,
  })
}
