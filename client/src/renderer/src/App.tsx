import { useEffect, useState } from 'react'
import OpenStreetMapPointsCard from './components/OpenStreetMapPointsCard'
import { getGemstatLocations, type GemstatLocation } from './utils/api'

const pad2 = (n: number): string => String(n).padStart(2, '0')

const randomDateYYYYMMDD = (startYear: number, endYear: number): string => {
  const startMs = new Date(startYear, 0, 1).getTime()
  const endMs = new Date(endYear, 11, 31).getTime()
  const d = new Date(startMs + Math.random() * (endMs - startMs))
  // Ensure format is exactly YYYY-MM-DD (contract type).
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const randomFloat = (min: number, max: number): number => min + Math.random() * (max - min)

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!

const generateFakeGemstatLocations = (count: number): GemstatLocation[] => {
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

  const res: GemstatLocation[] = []
  for (let i = 0; i < count; i++) {
    const latitude = randomFloat(-90, 90)
    const longitude = randomFloat(-180, 180)

    // Keep a stable but unique id for keying.
    const locationId = `fake-location-${i}`

    // Some values as null (matching contract rules) to exercise null-handling in UI.
    const hasElevation = Math.random() < 0.3
    const hasNumbers = Math.random() < 0.3

    res.push({
      locationId,
      localStationNumber: null,
      countryName: pick(countries),
      waterType: pick(waterTypes),
      stationIdentifier: null,
      stationNarrative: `${pick(narratives)} ${i}`,
      waterBodyName: `Fake Water Body ${i}`,
      mainBasin: null,
      // Contract says upstreamBasinArea is a string (likely from dataset normalization).
      upstreamBasinArea: hasNumbers ? `${randomFloat(10, 50000).toFixed(2)}` : null,
      elevation: hasElevation ? randomFloat(0, 2500) : null,
      monitoringType: null,
      dateStationOpened: Math.random() < 0.8 ? randomDateYYYYMMDD(1990, 2026) : null,
      responsibleCollectionAgency: null,
      latitude,
      longitude,
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

  return res
}

const devFallbackPoints: GemstatLocation[] = import.meta.env.DEV
  ? generateFakeGemstatLocations(10000)
  : []

const useDevPointCloud = import.meta.env.DEV

function App(): React.JSX.Element {
  const [points, setPoints] = useState<GemstatLocation[] | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      if (useDevPointCloud) {
        setPoints(devFallbackPoints)
        return
      }

      try {
        const response = await getGemstatLocations()
        if (cancelled) return
        if (response.locations.length > 0) {
          setPoints(response.locations)
          return
        }
        setPoints(import.meta.env.DEV ? devFallbackPoints : [])
      } catch (e) {
        console.error(e)
        if (cancelled) return
        setPoints(import.meta.env.DEV ? devFallbackPoints : [])
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={{ height: '100vh', width: '100vw', margin: 0 }}>
      <OpenStreetMapPointsCard points={points ?? (useDevPointCloud ? devFallbackPoints : [])} />
    </div>
  )
}

export default App
