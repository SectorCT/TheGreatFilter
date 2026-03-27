import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type GemstatLocation,
  type GemstatLocationFetchResponse,
  type MeasurementMapResponse,
  type GemstatStationMeasurementsResponse,
  type GemstatSnapshotFetchResponse,
  type GemstatLocationRow,
  type GemstatStationMeasurementRow,
  type Measurement,
  type MeasurementParameter
} from '../types'
import GemstatLocationsWorker from '@renderer/workers/gemstatLocations.worker?worker'
import GemstatStationMeasurementsWorker from '@renderer/workers/gemstatStationMeasurements.worker?worker'

let locationsInFlight: Promise<GemstatLocationFetchResponse> | null = null
let locationsCache: { value: GemstatLocationFetchResponse; expiresAt: number } | null = null
const LOCATIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const LOCATIONS_CACHE_KEY = 'tgif.gemstat.locations.cache.v1'

let locationsWorker: Worker | null = null
let workerRequestId = 0
const workerPending = new Map<number, (locations: GemstatLocation[]) => void>()
const workerPendingReject = new Map<number, (reason?: unknown) => void>()

const getLocationsWorker = (): Worker | null => {
  if (typeof Worker === 'undefined') return null
  if (!locationsWorker) {
    locationsWorker = new GemstatLocationsWorker()
    locationsWorker.onmessage = (event: MessageEvent<{ id?: number; locations?: GemstatLocation[] }>) => {
      const id = event.data?.id
      if (typeof id !== 'number') return
      const resolve = workerPending.get(id)
      if (!resolve) return
      workerPending.delete(id)
      workerPendingReject.delete(id)
      resolve(Array.isArray(event.data.locations) ? event.data.locations : [])
    }
    locationsWorker.onerror = () => {
      for (const reject of workerPendingReject.values()) {
        reject(new Error('Map worker failed'))
      }
      workerPending.clear()
      workerPendingReject.clear()
      locationsWorker?.terminate()
      locationsWorker = null
    }
  }
  return locationsWorker
}

const readLocationsCacheFromStorage = (): { value: GemstatLocationFetchResponse; expiresAt: number } | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCATIONS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      locations?: GemstatLocation[]
      expiresAt?: number
    }
    if (!Array.isArray(parsed.locations) || typeof parsed.expiresAt !== 'number') return null
    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(LOCATIONS_CACHE_KEY)
      return null
    }
    return {
      value: { locations: parsed.locations },
      expiresAt: parsed.expiresAt
    }
  } catch {
    return null
  }
}

const writeLocationsCacheToStorage = (cache: {
  value: GemstatLocationFetchResponse
  expiresAt: number
}): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      LOCATIONS_CACHE_KEY,
      JSON.stringify({
        locations: cache.value.locations,
        expiresAt: cache.expiresAt
      })
    )
  } catch {
    // Best-effort cache write only.
  }
}

export const hasGemstatLocationsCache = (): boolean => {
  if (locationsCache && locationsCache.expiresAt > Date.now()) return true
  const fromStorage = readLocationsCacheFromStorage()
  if (!fromStorage) return false
  locationsCache = fromStorage
  return true
}

const normalizeLocationsSync = (results: MeasurementMapResponse['results'] = []): GemstatLocation[] => {
  const locations: GemstatLocation[] = []
  const seenLocationIds = new Set<string>()
  for (const item of results ?? []) {
    const latitude = item.latitude ?? item.sampleLocation?.latitude
    const longitude = item.longitude ?? item.sampleLocation?.longitude
    if (
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude)
    ) {
      continue
    }

    const normalizedLocationId = item.locationId ?? item.sampleLocation?.station_id ?? item.measurementId
    if (seenLocationIds.has(normalizedLocationId)) continue
    seenLocationIds.add(normalizedLocationId)

    locations.push({
      locationId: normalizedLocationId,
      measurementId: item.measurementId,
      localStationNumber:
        item.sampleLocation?.local_station_number ?? item.sampleLocation?.station_id ?? null,
      countryName: item.sampleLocation?.country ?? null,
      waterType: item.sampleLocation?.water_type ?? null,
      stationIdentifier: item.sampleLocation?.station_identifier ?? null,
      stationNarrative: item.sampleLocation?.station_narrative ?? item.name ?? null,
      waterBodyName: item.sampleLocation?.water_body_name ?? item.name ?? null,
      mainBasin: item.sampleLocation?.main_basin ?? null,
      upstreamBasinArea: null,
      elevation: null,
      monitoringType: null,
      dateStationOpened: item.latestSnapshot?.dateKey ?? null,
      responsibleCollectionAgency: null,
      latitude,
      longitude,
      riverWidth: null,
      discharge: null,
      maxDepth: null,
      lakeArea: null,
      lakeVolume: null,
      averageRetention: null,
      areaOfAquifer: null,
      depthOfImpermableLining: null,
      productionZone: null,
      meanAbstractionRate: null,
      meanAbstractionLevel: null,
    })
  }
  return locations
}

const normalizeLocations = async (results: MeasurementMapResponse['results'] = []): Promise<GemstatLocation[]> => {
  const worker = getLocationsWorker()
  if (!worker) {
    return normalizeLocationsSync(results)
  }

  const id = ++workerRequestId
  const request = new Promise<GemstatLocation[]>((resolve, reject) => {
    workerPending.set(id, resolve)
    workerPendingReject.set(id, reject)
    worker.postMessage({ id, results })
  })

  try {
    const locations = await Promise.race([
      request,
      new Promise<GemstatLocation[]>((_, reject) =>
        window.setTimeout(() => reject(new Error('Map worker timeout')), 10_000),
      ),
    ])
    return locations
  } catch {
    workerPending.delete(id)
    workerPendingReject.delete(id)
    return normalizeLocationsSync(results)
  }
}

let stationMeasurementsWorker: Worker | null = null
let stationMeasurementsRequestId = 0
const stationMeasurementsPending = new Map<
  number,
  {
    resolve: (resp: { rows: GemstatLocationRow[]; measurements: GemstatStationMeasurementRow[]; measurementId: string; source: string; stationName: string | null }) => void
    reject: (reason?: unknown) => void
  }
>()

const getStationMeasurementsWorker = (): Worker | null => {
  if (typeof Worker === 'undefined') return null
  if (!stationMeasurementsWorker) {
    stationMeasurementsWorker = new GemstatStationMeasurementsWorker()
    stationMeasurementsWorker.onmessage = (event: MessageEvent<any>) => {
      const id = event.data?.id
      if (typeof id !== 'number') return
      const pending = stationMeasurementsPending.get(id)
      if (!pending) return
      stationMeasurementsPending.delete(id)
      const data = event.data?.data
      if (!data || data.ok !== true) {
        pending.reject(new Error(data?.error ?? 'station measurements worker failed'))
        return
      }
      pending.resolve({
        rows: data.rows as GemstatLocationRow[],
        measurements: data.measurements as GemstatStationMeasurementRow[],
        measurementId: data.measurementId as string,
        source: data.source as string,
        stationName: data.stationName as string | null
      })
    }

    stationMeasurementsWorker.onerror = () => {
      for (const pending of stationMeasurementsPending.values()) {
        pending.reject(new Error('Station measurements worker failed'))
      }
      stationMeasurementsPending.clear()
      stationMeasurementsWorker?.terminate()
      stationMeasurementsWorker = null
    }
  }
  return stationMeasurementsWorker
}

const normalizeStationMeasurements = async (
  locationId: string,
  payload: Record<string, unknown>
): Promise<{
  measurementId: string
  locationId: string
  stationName: string | null
  source: string
  rows: GemstatLocationRow[]
  measurements: GemstatStationMeasurementRow[]
}> => {
  const worker = getStationMeasurementsWorker()

  const normalizeFallback = (): {
    measurementId: string
    locationId: string
    stationName: string | null
    source: string
    rows: GemstatLocationRow[]
    measurements: GemstatStationMeasurementRow[]
  } => {
    const rows = normalizeStationRows(payload)
    return {
      measurementId:
        typeof payload.measurementId === 'string' ? payload.measurementId : `station-${locationId}`,
      locationId: typeof payload.locationId === 'string' ? payload.locationId : locationId,
      stationName:
        (typeof payload.name === 'string' && payload.name) ||
        (typeof payload.stationId === 'string' && payload.stationId) ||
        null,
      source: typeof payload.source === 'string' ? payload.source : 'gemstat',
      rows,
      measurements: rows.flatMap((row) => toStationRows(row))
    }
  }

  if (!worker) return normalizeFallback()

  const id = ++stationMeasurementsRequestId
  const request = new Promise<{
    measurementId: string
    locationId: string
    stationName: string | null
    source: string
    rows: GemstatLocationRow[]
    measurements: GemstatStationMeasurementRow[]
  }>((resolve, reject) => {
    stationMeasurementsPending.set(id, {
      resolve: (resp) =>
        resolve({
          measurementId: resp.measurementId,
          locationId,
          stationName: resp.stationName,
          source: resp.source,
          rows: resp.rows,
          measurements: resp.measurements
        }),
      reject
    })
    worker.postMessage({ id, payload, locationId })
  })

  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('station measurements worker timeout')), 15_000)
      })
    ]).catch(() => normalizeFallback())
  } catch {
    return normalizeFallback()
  }
}

export const getGemstatLocations = async (): Promise<GemstatLocationFetchResponse> => {
  if (!locationsCache) {
    locationsCache = readLocationsCacheFromStorage()
  }
  if (locationsCache && locationsCache.expiresAt > Date.now()) {
    return locationsCache.value
  }

  if (locationsInFlight) {
    return locationsInFlight
  }

  const startMs = performance.now()
  let requestDurationMs: number | null = null
  let normalizeDurationMs: number | null = null
  const startedAtIso = new Date().toISOString()
  console.info(`[Map API] locations start: ${startedAtIso}`)

  locationsInFlight = makeAuthenticatedReq<undefined, GemstatLocationFetchResponse>({
    method: 'GET',
    path: '/api/measurements/map/',
    authRequired: true,
    parseResponse: async (response) => {
      requestDurationMs = Math.round(performance.now() - startMs)
      const payload = (await response.json()) as MeasurementMapResponse
      const normalizeStartMs = performance.now()
      const locations = await normalizeLocations(payload.results ?? [])
      normalizeDurationMs = Math.round(performance.now() - normalizeStartMs)
      return {
        locations,
      }
    },
    fake404: () => {
      return { locations: [] }
    },
  })

  try {
    const result = await locationsInFlight
    const cacheEntry = {
      value: result,
      expiresAt: Date.now() + LOCATIONS_CACHE_TTL_MS
    }
    locationsCache = cacheEntry
    writeLocationsCacheToStorage(cacheEntry)
    return result
  } finally {
    const endMs = performance.now()
    const endedAtIso = new Date().toISOString()
    const totalMs = Math.round(endMs - startMs)
    const requestMsLabel = requestDurationMs == null ? 'n/a' : `${requestDurationMs}ms`
    const normalizeMsLabel = normalizeDurationMs == null ? 'n/a' : `${normalizeDurationMs}ms`
    console.info(
      `[Map API] locations end: ${endedAtIso} (request ${requestMsLabel}, normalize ${normalizeMsLabel}, total ${totalMs}ms)`,
    )
    locationsInFlight = null
  }
}

export const getGemstatStationMeasurements = async (
  locationId: string
): Promise<GemstatStationMeasurementsResponse> => {
  return makeAuthenticatedReq<undefined, GemstatStationMeasurementsResponse>({
    method: 'GET',
    path: `/api/measurements/locations/${locationId}/`,
    authRequired: true,
    parseResponse: async (response) => {
      const payload = (await response.json()) as Record<string, unknown>
      const normalized = await normalizeStationMeasurements(locationId, payload)
      return {
        measurementId: normalized.measurementId,
        locationId: normalized.locationId,
        stationName: normalized.stationName,
        source: normalized.source,
        rows: normalized.rows,
        measurements: normalized.measurements
      }
    },
    fake404: () => ({
      measurementId: `fake-measurement-${locationId}`,
      locationId,
      stationName: 'Development station',
      source: 'gemstat',
      rows: [],
      measurements: [
        makeFakeStationRow({
          sampleDate: '2025-01-15',
          sampleTime: '09:15',
          parameterCode: 'TEMP',
          value: 12.3,
          unit: 'C',
          depth: null
        }),
        makeFakeStationRow({
          sampleDate: '2025-01-15',
          sampleTime: '09:15',
          parameterCode: 'PH',
          value: 7.4,
          unit: '',
          depth: null
        }),
        makeFakeStationRow({
          sampleDate: '2025-02-01',
          sampleTime: '10:00',
          parameterCode: 'DO',
          value: 8.1,
          unit: 'mg/L',
          depth: 1.5
        })
      ]
    })
  })
}

export const getGemstatSnapshot = async (
  locationId: string,
  date: string // ISO-8601 string per contract
): Promise<GemstatSnapshotFetchResponse> => {
  return makeAuthenticatedReq<undefined, GemstatSnapshotFetchResponse>({
    method: 'GET',
    path: `/api/measurements/locations/${locationId}/`,
    authRequired: true,
    parseResponse: async (response) => {
      const payload = (await response.json()) as {
        measurementId: string
        source: string
        createdAt?: string
        rows?: GemstatLocationRow[]
      }
      const targetRow =
        (payload.rows ?? []).find((row) => row.dateKey === date) ??
        (payload.rows ?? [])[Math.max((payload.rows ?? []).length - 1, 0)]
      const measurementParameters = (targetRow?.parameters ?? []).map((parameter) => ({
        parameterCode: parameter.parameterCode,
        parameterName: parameter.parameterName ?? undefined,
        unit: parameter.unit ?? undefined,
        value: parameter.value,
      }))
      const measurement: Measurement = {
        measurementId: payload.measurementId,
        source: payload.source as Measurement['source'],
        createdAt: payload.createdAt ?? new Date().toISOString(),
        sampleDate: targetRow?.dateKey,
        sampleTime: targetRow?.sampleTime,
        depth: targetRow?.depth ?? undefined,
        volume: targetRow?.volume ?? undefined,
        temperature: targetRow?.temperature ?? 0,
        ph: targetRow?.ph ?? 0,
        parameters: measurementParameters,
      }
      return { measurement }
    },
    fake404: (): GemstatSnapshotFetchResponse => {
      const measurement: Measurement = {
        measurementId: `fake-measurement-${locationId}-${date}`,
        source: 'gemstat',
        createdAt: new Date().toISOString(),
        temperature: 12.3,
        ph: 7.4,
        parameters: [
          { parameterCode: 'TEMP', value: 12.3, unit: 'C' },
          { parameterCode: 'PH', value: 7.4 }
        ]
      }

      return { measurement }
    }
  })
}

const makeFakeStationRow = (row: {
  sampleDate: string
  sampleTime: string
  parameterCode: string
  value: number
  unit: string
  depth: number | null
}): GemstatStationMeasurementRow => ({
  sampleDate: row.sampleDate,
  sampleTime: row.sampleTime,
  depth: row.depth,
  parameterCode: row.parameterCode,
  analysisMethodCode: null,
  valueFlags: null,
  value: row.value,
  unit: row.unit,
  dataQuality: null
})

const toStationRows = (row: GemstatLocationRow): GemstatStationMeasurementRow[] => {
  const sourceParams = row.parameters ?? []
  return sourceParams.map((parameter) =>
    makeStationRowFromParameter({
      sampleDate: row.dateKey,
      sampleTime: row.sampleTime,
      parameter,
      depth: row.depth,
    }),
  )
}

const makeStationRowFromParameter = (row: {
  sampleDate: string
  sampleTime: string
  parameter: MeasurementParameter
  depth: number | null
}): GemstatStationMeasurementRow => ({
  sampleDate: row.sampleDate,
  sampleTime: row.sampleTime,
  depth: row.depth,
  parameterCode: row.parameter.parameterCode,
  analysisMethodCode: null,
  valueFlags: null,
  value: row.parameter.value,
  unit: row.parameter.unit ?? '',
  dataQuality: null,
})

const normalizeStationRows = (payload: Record<string, unknown>): GemstatLocationRow[] => {
  // Legacy shape: { rows: GemstatLocationRow[] }
  if (Array.isArray(payload.rows)) {
    return payload.rows as GemstatLocationRow[]
  }

  // Current shape: { measurements: [{ sampleDate, sampleTime, depth, temperature, ph, pollutants: [] }] }
  const measurements = Array.isArray(payload.measurements) ? payload.measurements : []
  return measurements
    .map((entry, index) => {
      const record = (entry ?? {}) as Record<string, unknown>
      const sampleDate =
        typeof record.sampleDate === 'string' && record.sampleDate.trim().length > 0
          ? record.sampleDate
          : null
      if (!sampleDate) return null

      const sampleTimeRaw =
        typeof record.sampleTime === 'string' && record.sampleTime.trim().length > 0
          ? record.sampleTime
          : '00:00:00'
      const sampleTime = sampleTimeRaw.length >= 5 ? sampleTimeRaw.slice(0, 5) : sampleTimeRaw
      const pollutants = Array.isArray(record.pollutants) ? record.pollutants : []
      const parameters: MeasurementParameter[] = pollutants
        .map((pollutant): MeasurementParameter | null => {
          const p = (pollutant ?? {}) as Record<string, unknown>
          if (typeof p.parameterCode !== 'string') return null
          if (typeof p.value !== 'number' || !Number.isFinite(p.value)) return null
          return {
            parameterCode: p.parameterCode,
            parameterName: typeof p.parameterName === 'string' ? p.parameterName : null,
            unit: typeof p.unit === 'string' ? p.unit : null,
            value: p.value
          }
        })
        .filter((item): item is MeasurementParameter => item !== null)

      return {
        dateKey: sampleDate,
        snapshotIndex: index,
        label: `${sampleDate} ${sampleTime}`,
        sampleTime,
        depth: typeof record.depth === 'number' && Number.isFinite(record.depth) ? record.depth : null,
        volume: null,
        temperature:
          typeof record.temperature === 'number' && Number.isFinite(record.temperature)
            ? record.temperature
            : null,
        ph: typeof record.ph === 'number' && Number.isFinite(record.ph) ? record.ph : null,
        parameterCount:
          typeof record.parameterCount === 'number' && Number.isFinite(record.parameterCount)
            ? record.parameterCount
            : parameters.length,
        summary: typeof record.name === 'string' ? record.name : null,
        parameters
      } as GemstatLocationRow
    })
    .filter((row): row is GemstatLocationRow => row !== null)
}
