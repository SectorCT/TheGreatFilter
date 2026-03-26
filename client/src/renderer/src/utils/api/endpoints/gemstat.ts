import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type GemstatLocation,
  type GemstatLocationFetchResponse,
  type GemstatStationMeasurementsResponse,
  type GemstatSnapshotFetchResponse,
  type GemstatStationMeasurementRow,
  type Measurement,
} from '../types'

let fakeLocationsPromise: Promise<GemstatLocationFetchResponse> | null = null

const pad2 = (n: number): string => String(n).padStart(2, '0')

const randomDateYYYYMMDD = (startYear: number, endYear: number): string => {
  const startMs = new Date(startYear, 0, 1).getTime()
  const endMs = new Date(endYear, 11, 31).getTime()
  const d = new Date(startMs + Math.random() * (endMs - startMs))
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const randomFloat = (min: number, max: number): number => min + Math.random() * (max - min)

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!

const generateLocationsChunk = (start: number, count: number): GemstatLocation[] => {
  const countries = [
    'Bulgaria',
    'France',
    'Germany',
    'Spain',
    'Italy',
    'Greece',
    'Netherlands',
    'Poland',
    'Sweden',
    'United Kingdom',
  ] as const
  const waterTypes = ['River', 'Lake', 'Reservoir', 'Groundwater'] as const
  const narratives = ['Station', 'Gauge', 'Monitoring point', 'Hydro site'] as const

  const result: GemstatLocation[] = []
  for (let i = start; i < start + count; i++) {
    const hasElevation = Math.random() < 0.3
    const hasNumbers = Math.random() < 0.3
    result.push({
      locationId: `fake-location-${i}`,
      localStationNumber: null,
      countryName: pick(countries),
      waterType: pick(waterTypes),
      stationIdentifier: null,
      stationNarrative: `${pick(narratives)} ${i}`,
      waterBodyName: `Fake Water Body ${i}`,
      mainBasin: null,
      upstreamBasinArea: hasNumbers ? `${randomFloat(10, 50000).toFixed(2)}` : null,
      elevation: hasElevation ? randomFloat(0, 2500) : null,
      monitoringType: null,
      dateStationOpened: Math.random() < 0.8 ? randomDateYYYYMMDD(1990, 2026) : null,
      responsibleCollectionAgency: null,
      latitude: randomFloat(-90, 90),
      longitude: randomFloat(-180, 180),
      riverWidth: null,
      discharge: hasNumbers ? randomFloat(0, 10000) : null,
      maxDepth: hasNumbers ? randomFloat(0, 200) : null,
      lakeArea: hasNumbers ? randomFloat(0, 50000) : null,
      lakeVolume: hasNumbers ? randomFloat(0, 1_000_000) : null,
      averageRetention: hasNumbers ? randomFloat(0, 365) : null,
      areaOfAquifer: null,
      depthOfImpermableLining: null,
      productionZone: null,
      meanAbstractionRate: hasNumbers ? randomFloat(0, 100000) : null,
      meanAbstractionLevel: hasNumbers ? randomFloat(0, 100000) : null,
    })
  }
  return result
}

const getFakeLocations = (): Promise<GemstatLocationFetchResponse> => {
  if (fakeLocationsPromise) return fakeLocationsPromise

  fakeLocationsPromise = (async () => {
    const total = 1000
    const chunkSize = 500
    const locations: GemstatLocation[] = []

    for (let start = 0; start < total; start += chunkSize) {
      const size = Math.min(chunkSize, total - start)
      locations.push(...generateLocationsChunk(start, size))
      // Yield to keep UI responsive while fake data is prepared.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    return { locations }
  })()

  return fakeLocationsPromise
}

export const getGemstatLocations = async (): Promise<GemstatLocationFetchResponse> => {
  return makeAuthenticatedReq<undefined, GemstatLocationFetchResponse>({
    method: 'GET',
    path: '/gemstat/locations',
    authRequired: true,
    fake404: async () => getFakeLocations(),
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

