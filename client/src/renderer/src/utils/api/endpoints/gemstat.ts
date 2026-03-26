import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type GemstatLocationFetchResponse,
  type GemstatStationMeasurementsResponse,
  type GemstatSnapshotFetchResponse,
  type GemstatStationMeasurementRow,
  type Measurement,
} from '../types'

export const getGemstatLocations = async (): Promise<GemstatLocationFetchResponse> => {
  return makeAuthenticatedReq<undefined, GemstatLocationFetchResponse>({
    method: 'GET',
    path: '/gemstat/locations',
    authRequired: true,
    fake404: () => ({
      locations: [
        {
          locationId: 'fake-location-1',
          localStationNumber: null,
          countryName: 'Bulgaria',
          waterType: 'River',
          stationIdentifier: null,
          stationNarrative: 'Fake station narrative 1',
          waterBodyName: 'Fake Water Body 1',
          mainBasin: null,
          upstreamBasinArea: null,
          elevation: null,
          monitoringType: null,
          dateStationOpened: null,
          responsibleCollectionAgency: null,
          latitude: 42.6977,
          longitude: 23.3219,
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
        },
      ],
    }),
  })
}

export const getGemstatStationMeasurements = async (
  locationId: string,
): Promise<GemstatStationMeasurementsResponse> => {
  return makeAuthenticatedReq<undefined, GemstatStationMeasurementsResponse>({
    method: 'GET',
    path: '/gemstat/station-measurements',
    query: { locationId },
    authRequired: true,
    fake404: () => ({
      locationId,
      measurements: [
        makeFakeStationRow({
          sampleDate: '2025-01-15',
          sampleTime: '09:15',
          parameterCode: 'TEMP',
          value: 12.3,
          unit: 'C',
          depth: null,
        }),
        makeFakeStationRow({
          sampleDate: '2025-01-15',
          sampleTime: '09:15',
          parameterCode: 'PH',
          value: 7.4,
          unit: '',
          depth: null,
        }),
        makeFakeStationRow({
          sampleDate: '2025-02-01',
          sampleTime: '10:00',
          parameterCode: 'DO',
          value: 8.1,
          unit: 'mg/L',
          depth: 1.5,
        }),
      ],
    }),
  })
}

export const getGemstatSnapshot = async (
  locationId: string,
  date: string, // ISO-8601 string per contract
): Promise<GemstatSnapshotFetchResponse> => {
  return makeAuthenticatedReq<undefined, GemstatSnapshotFetchResponse>({
    method: 'GET',
    path: '/gemstat/snapshots',
    query: { locationId, date },
    authRequired: true,
    fake404: (): GemstatSnapshotFetchResponse => {
      const measurement: Measurement = {
        measurementId: `fake-measurement-${locationId}-${date}`,
        source: 'gemstat',
        createdAt: new Date().toISOString(),
        temperature: 12.3,
        ph: 7.4,
        parameters: [
          { parameterCode: 'TEMP', value: 12.3, unit: 'C' },
          { parameterCode: 'PH', value: 7.4 },
        ],
      }

      return { measurement }
    },
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
  dataQuality: null,
})

