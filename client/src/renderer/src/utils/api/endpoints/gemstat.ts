import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type GemstatLocationFetchResponse,
  type MeasurementMapResponse,
  type GemstatStationMeasurementsResponse,
  type GemstatSnapshotFetchResponse,
  type GemstatStationMeasurementRow,
  type Measurement
} from '../types'

export const getGemstatLocations = async (): Promise<GemstatLocationFetchResponse> => {
  return makeAuthenticatedReq<undefined, GemstatLocationFetchResponse>({
    method: 'GET',
    path: '/api/measurements/map/',
    authRequired: true,
    parseResponse: async (response) => {
      const payload = (await response.json()) as MeasurementMapResponse
      console.info('[Map API] /api/measurements/map/ response:', payload)
      const locations = (payload.results ?? []).map((item) => ({
        locationId: item.measurementId,
        localStationNumber: item.sampleLocation?.station_id ?? null,
        countryName: item.sampleLocation?.country ?? null,
        waterType: item.sampleLocation?.water_type ?? null,
        stationIdentifier: item.sampleLocation?.station_identifier ?? null,
        stationNarrative: item.name ?? null,
        waterBodyName: item.name ?? null,
        mainBasin: null,
        upstreamBasinArea: null,
        elevation: null,
        monitoringType: null,
        dateStationOpened: item.sampleDate ?? null,
        responsibleCollectionAgency: null,
        latitude: item.latitude,
        longitude: item.longitude,
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
      }))

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
    path: `/api/measurements/${locationId}/`,
    authRequired: true,
    parseResponse: async (response) => {
      const measurement = (await response.json()) as Measurement
      const sampleDate = measurement.createdAt.slice(0, 10)
      return {
        locationId,
        measurements: (measurement.parameters ?? []).map((p) =>
          makeFakeStationRow({
            sampleDate,
            sampleTime: '00:00',
            parameterCode: p.parameterCode,
            value: p.value,
            unit: p.unit ?? '',
            depth: null,
          }),
        ),
      }
    },
    fake404: () => ({
      locationId,
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
    path: `/api/measurements/${locationId}/`,
    authRequired: true,
    parseResponse: async (response) => {
      const measurement = (await response.json()) as Measurement
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
