/// <reference lib="webworker" />

import type { GemstatLocation, MeasurementMapItem } from '@renderer/utils/api/types'

type NormalizeRequest = {
  id: number
  results?: MeasurementMapItem[]
}

type NormalizeResponse = {
  id: number
  locations: GemstatLocation[]
}

const normalizeLocations = (results: MeasurementMapItem[] = []): GemstatLocation[] => {
  const locations: GemstatLocation[] = []
  const seenLocationIds = new Set<string>()

  for (const item of results) {
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

self.onmessage = (event: MessageEvent<NormalizeRequest>): void => {
  const id = event.data?.id
  if (typeof id !== 'number') return
  const locations = normalizeLocations(Array.isArray(event.data.results) ? event.data.results : [])
  const response: NormalizeResponse = { id, locations }
  self.postMessage(response)
}

