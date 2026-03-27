import { useEffect, useMemo, useState } from 'react'
import { divIcon, point } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { LatLngBoundsExpression } from 'leaflet'
import { useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import type { GemstatLocation } from '../utils/api'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import FullscreenLoadingScreen from './FullscreenLoadingScreen'

type OpenStreetMapPointsCardProps = {
  points: GemstatLocation[]
  selectedLocationId?: string | null
  onSelectPoint?: (point: GemstatLocation) => void
}

type RenderPoint = {
  key: string
  lat: number
  lon: number
  source: GemstatLocation
}

const POINT_ICON = divIcon({
  html: '<div style="width:8px;height:8px;background:#ff5a3c;border:1px solid rgba(0,0,0,0.55);border-radius:999px;"></div>',
  className: 'tgif-point-icon',
  iconSize: point(8, 8, true),
})

const SELECTED_POINT_ICON = divIcon({
  html: '<div style="width:12px;height:12px;background:#2563eb;border:2px solid white;box-shadow:0 0 0 2px #1d4ed8;border-radius:999px;"></div>',
  className: 'tgif-point-icon-selected',
  iconSize: point(12, 12, true),
})

const getDefaultCenter = (points: GemstatLocation[]): [number, number] => {
  const first = points.find(
    (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
  )
  return first ? [first.latitude, first.longitude] : [42.6977, 23.3219]
}

const getPopupText = (p: GemstatLocation): string => {
  const parts = [p.stationNarrative ?? p.waterBodyName ?? '']
  return parts.filter(Boolean).join(' • ')
}

const getBoundsExpression = (points: GemstatLocation[]): LatLngBoundsExpression | null => {
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  let minLon = Number.POSITIVE_INFINITY
  let maxLon = Number.NEGATIVE_INFINITY

  for (const p of points) {
    if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') continue
    minLat = Math.min(minLat, p.latitude)
    maxLat = Math.max(maxLat, p.latitude)
    minLon = Math.min(minLon, p.longitude)
    maxLon = Math.max(maxLon, p.longitude)
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) return null

  return [
    [minLat, minLon],
    [maxLat, maxLon]
  ]
}

function FitPointsBounds({ points }: { points: GemstatLocation[] }): null {
  const map = useMap()

  useEffect(() => {
    const bounds = getBoundsExpression(points)
    if (!bounds) return
    // Keep it clamped so world-sized test data still shows everything.
    map.fitBounds(bounds, { padding: [16, 16], maxZoom: 2 })
  }, [map, points])

  return null
}

function InvalidateOnResize(): null {
  const map = useMap()

  useEffect(() => {
    const onResize = (): void => {
      map.invalidateSize()
    }

    window.addEventListener('resize', onResize)
    // Ensure correct first layout when parent size changes quickly.
    const timeout = setTimeout(onResize, 0)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('resize', onResize)
    }
  }, [map])

  return null
}

const getWrappedRenderPoints = (points: GemstatLocation[]): RenderPoint[] => {
  const copies: RenderPoint[] = []
  for (const p of points) {
    const lat = p.latitude
    const lon = p.longitude
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

    copies.push(
      { key: `${p.locationId}-w-1`, lat, lon: lon - 360, source: p },
      { key: `${p.locationId}-w0`, lat, lon, source: p },
      { key: `${p.locationId}-w1`, lat, lon: lon + 360, source: p }
    )
  }
  return copies
}

export default function OpenStreetMapPointsCard({
  points,
  selectedLocationId = null,
  onSelectPoint
}: OpenStreetMapPointsCardProps): React.JSX.Element {
  const center = useMemo(() => getDefaultCenter(points), [points])
  const renderPoints = useMemo(() => getWrappedRenderPoints(points), [points])
  const [tilesFailed, setTilesFailed] = useState(false)
  const [tilesLoading, setTilesLoading] = useState(true)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={center}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        maxBounds={[
          [-85, -180],
          [85, 180]
        ]}
        maxBoundsViscosity={1.0}
        worldCopyJump={true}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <InvalidateOnResize />
        {points.length ? <FitPointsBounds points={points} /> : null}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          eventHandlers={{
            tileerror: () => {
              console.warn('[OSM] Tile failed to load')
              setTilesFailed(true)
              setTilesLoading(false)
            },
            load: () => {
              // Tile layer triggers `load` repeatedly; we only care that at least one succeeded.
              setTilesLoading(false)
            }
          }}
        />

        <MarkerClusterGroup
          chunkedLoading
          chunkInterval={200}
          chunkDelay={50}
          animate
          animateAddingMarkers={false}
          spiderfyOnMaxZoom={false}
          showCoverageOnHover={false}
          maxClusterRadius={60}
        >
          {renderPoints.map((p) => (
            <Marker
              key={p.key}
              position={[p.lat, p.lon]}
              icon={selectedLocationId === p.source.locationId ? SELECTED_POINT_ICON : POINT_ICON}
              eventHandlers={{
                click: () => {
                  onSelectPoint?.(p.source)
                },
              }}
            >
              <Popup>{getPopupText(p.source) || p.source.locationId}</Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      {tilesLoading && !tilesFailed ? (
        <FullscreenLoadingScreen title="Loading map tiles…" fixed={false} />
      ) : null}
      {tilesFailed ? (
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            padding: '8px 10px',
            borderRadius: 10,
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            fontSize: 12
          }}
        >
          OSM tiles failed to load. Showing markers only.
        </div>
      ) : null}
    </div>
  )
}
