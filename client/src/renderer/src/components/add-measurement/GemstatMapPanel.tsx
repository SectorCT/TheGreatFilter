import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OpenStreetMapPointsCard from '@renderer/components/OpenStreetMapPointsCard'
import { Button } from '@renderer/components/ui/button'
import { getGemstatLocations, type GemstatLocation } from '@renderer/utils/api'

export function GemstatMapPanel(): React.JSX.Element {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<GemstatLocation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      setIsLoading(true)
      try {
        const result = await getGemstatLocations()
        if (cancelled) return
        console.info('[Map] Loaded locations:', result.locations.length)
        setLocations(result.locations)
      } catch (e) {
        console.error(e)
        if (cancelled) return
        setError('Failed to load map locations')
        setLocations([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4 rounded-[6px] border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">GemStat Map</h2>
        <p className="text-sm text-muted-foreground">
          Select a station from the map and continue with dataset import.
        </p>
        {!isLoading && locations ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Loaded points: <span className="font-mono">{locations.length}</span>
          </p>
        ) : null}
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Loading map data...</p>
          <div className="h-2 w-full overflow-hidden rounded bg-secondary">
            <div
              className="h-full w-1/3 bg-primary"
              style={{
                animation: 'tgif-progress-indeterminate 1.1s ease-in-out infinite',
              }}
            />
          </div>
          <style>{`
            @keyframes tgif-progress-indeterminate {
              0% { transform: translateX(-110%); }
              100% { transform: translateX(330%); }
            }
          `}</style>
        </div>
      ) : null}
      <div className="relative h-[520px] overflow-hidden rounded-[6px] border border-border bg-muted">
        {!isLoading && locations && locations.length > 0 ? (
          <OpenStreetMapPointsCard points={locations} />
        ) : !isLoading && locations && locations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No map points returned by backend for this account.
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Preparing map data...
          </div>
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button onClick={() => navigate('/dashboard')}>Continue</Button>
    </div>
  )
}
