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

export const getGemstatLocations = async (): Promise<GemstatLocationFetchResponse> => {
  return makeAuthenticatedReq<undefined, GemstatLocationFetchResponse>({
    method: 'GET',
    path: '/api/measurements/map/',
    authRequired: true,
    parseResponse: async (response) => {
      const payload = (await response.json()) as MeasurementMapResponse
      console.info('[Map API] /api/measurements/map/ response:', payload)
      const locations: GemstatLocation[] = []
      let droppedCount = 0
      for (const item of payload.results ?? []) {
        const latitude = item.latitude ?? item.sampleLocation?.latitude
        const longitude = item.longitude ?? item.sampleLocation?.longitude
        if (
          typeof latitude !== 'number' ||
          !Number.isFinite(latitude) ||
          typeof longitude !== 'number' ||
          !Number.isFinite(longitude)
        ) {
          droppedCount += 1
          continue
        }

        locations.push({
          locationId: item.locationId ?? item.sampleLocation?.station_id ?? item.measurementId,
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
      if (droppedCount > 0) {
        console.warn(
          `[Map API] Dropped ${droppedCount} locations due to missing/invalid coordinates.`,
        )
      }

      return {
        locations,
      }
    },
    fake404: () => {
      console.warn('[Map API] 404 from /api/measurements/map/; returning empty locations.')
      return { locations: [] }
    },
  })
}

export const getGemstatStationMeasurements = async (
  locationId: string
): Promise<GemstatStationMeasurementsResponse> => {
  return makeAuthenticatedReq<undefined, GemstatStationMeasurementsResponse>({
    method: 'GET',
    path: `/api/measurements/locations/${locationId}/`,
    authRequired: true,
    parseResponse: async (response) => {
      const payload = (await response.json()) as {
        measurementId: string
        locationId: string
        name?: string
        source: string
        rows?: GemstatLocationRow[]
      }
      const rows = payload.rows ?? []
      return {
        measurementId: payload.measurementId,
        locationId: payload.locationId ?? locationId,
        stationName: payload.name ?? null,
        source: payload.source,
        rows,
        measurements: rows.flatMap((row) => toStationRows(row)),
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
