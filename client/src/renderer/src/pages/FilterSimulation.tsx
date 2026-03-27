import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Pause, Play, RotateCcw } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { Button } from '@renderer/components/ui/button'
import { getFilterDetails } from '@renderer/utils/api/endpoints'
import type { FilterInfo } from '@renderer/utils/api/types'
import { buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel'
import {
  buildFilterDetailsFromImportedJson,
  isImportedFilterRouteId,
  readImportedFilterSession,
} from '@renderer/utils/importedFilterPayload'
import {
  SimulationEngine,
  buildSimulationConfig,
  DEFAULT_CONFIG,
  type SimulationConfig,
  type SimulationStats
} from '@renderer/utils/simulation'

export function FilterSimulation(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isImported = isImportedFilterRouteId(id)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<SimulationEngine | null>(null)
  const rafRef = useRef<number>(0)

  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [loading, setLoading] = useState(true)
  const [simConfig, setSimConfig] = useState<SimulationConfig>(DEFAULT_CONFIG)
  const [filterInfo, setFilterInfo] = useState<FilterInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<SimulationStats>({
    totalSpawned: 0,
    totalPassed: 0,
    totalContaminantsSpawned: 0,
    capturedByType: {}
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (!id) {
      setLoading(false)
      setError('Missing filter ID.')
      return
    }

    if (isImported) {
      const session = readImportedFilterSession(location)
      if (!session?.importedFilterJson) {
        setFilterInfo(null)
        setError('No imported filter data. Open your JSON from All Filters first.')
        setLoading(false)
        return
      }
      try {
        const details = buildFilterDetailsFromImportedJson(session.importedFilterJson, session.importedFileName)
        if (cancelled) return
        setFilterInfo(details.filterInfo)
        const config = buildSimulationConfig(details.filterInfo)
        setSimConfig(config)
        if (engineRef.current) {
          engineRef.current.config = config
          engineRef.current.reset()
        }
        setError(null)
      } catch (parseError) {
        if (!cancelled) {
          setFilterInfo(null)
          setError(parseError instanceof Error ? parseError.message : 'Failed to load imported filter.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
      return () => {
        cancelled = true
      }
    }

    getFilterDetails(id)
      .then((resp) => {
        if (cancelled) return
        setFilterInfo(resp.filterInfo)
        const config = buildSimulationConfig(resp.filterInfo)
        setSimConfig(config)

        if (engineRef.current) {
          engineRef.current.config = config
          engineRef.current.reset()
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load simulation data.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isImported, location.state])
  const vm = useMemo(() => buildFilterInfoViewModel(filterInfo), [filterInfo])

  const getEngine = useCallback(
    (): SimulationEngine => {
      if (!engineRef.current) {
        engineRef.current = new SimulationEngine(simConfig)
      }
      return engineRef.current
    },
    [simConfig]
  )

  useEffect(() => {
    if (loading) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = getEngine()
    engine.config = simConfig

    const syncSize = (): void => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      engine.resize(rect.width, rect.height)
    }

    syncSize()
    const observer = new ResizeObserver(syncSize)
    observer.observe(canvas)

    let lastTime = 0
    let frameCount = 0

    const loop = (time: number): void => {
      const dt = lastTime === 0 ? 16 : Math.min(time - lastTime, 50)
      lastTime = time
      engine.tick(dt / 16)
      engine.draw(ctx)
      frameCount++
      if (frameCount % 10 === 0) {
        setStats({
          ...engine.stats,
          capturedByType: { ...engine.stats.capturedByType }
        })
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [loading, getEngine, simConfig])

  useEffect(() => {
    const engine = engineRef.current
    if (engine) engine.paused = !playing
  }, [playing])

  useEffect(() => {
    const engine = engineRef.current
    if (engine) engine.setSpeed(speed)
  }, [speed])

  const handleReset = (): void => {
    const engine = engineRef.current
    if (engine) {
      engine.reset()
      setStats({ totalSpawned: 0, totalPassed: 0, totalContaminantsSpawned: 0, capturedByType: {} })
    }
  }

  const totalCaptured = Object.values(stats.capturedByType).reduce((a, b) => a + b, 0)
  const efficiency =
    stats.totalContaminantsSpawned > 0
      ? Math.min(100, Math.round((totalCaptured / stats.totalContaminantsSpawned) * 100))
      : 0

  const moleculeTypes = simConfig.moleculeTypes

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() =>
              navigate(`/filters/${id}`, {
                state: isImported ? readImportedFilterSession(location) ?? undefined : undefined,
              })
            }
            className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Filtration Simulation</h1>
            <p className="font-mono text-xs text-muted-foreground">Filter {id ?? '-'}</p>
          </div>
        </div>
      </div>
      {error ? (
        <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] border border-border bg-black">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-[8px] border border-border bg-card px-4 py-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlaying((prev) => !prev)}
              className="w-24"
            >
              {playing ? (
                <>
                  <Pause size={14} strokeWidth={1.5} /> Pause
                </>
              ) : (
                <>
                  <Play size={14} strokeWidth={1.5} /> Play
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Speed</span>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.25}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="h-1 w-28 cursor-pointer accent-primary"
              />
              <span className="w-10 text-right font-mono text-xs text-foreground">
                {speed.toFixed(2)}x
              </span>
            </div>

            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw size={14} strokeWidth={1.5} /> Reset
            </Button>
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Filter Properties</h2>
          <div className="mb-4 space-y-1.5 text-sm">
            {vm.metrics.materialType !== 'n/a' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Material</span>
                <span className="font-mono text-xs">{vm.metrics.materialType}</span>
              </div>
            )}
            {vm.metrics.poreSize != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pore Size</span>
                <span className="font-mono text-xs">{vm.metrics.poreSize.toFixed(3)} nm</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target capture efficiency</span>
              <span className="font-mono text-xs">{simConfig.removalEfficiency}%</span>
            </div>
            {vm.metrics.pollutant !== 'n/a' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Pollutant</span>
                <span className="font-mono text-xs">{vm.metrics.pollutant}</span>
              </div>
            )}
            {vm.metrics.bindingEnergy != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Binding Energy</span>
                <span className="font-mono text-xs">{vm.metrics.bindingEnergy.toFixed(4)} eV</span>
              </div>
            )}
            {vm.metrics.temperature != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Temperature</span>
                <span className="font-mono text-xs">{vm.metrics.temperature.toFixed(2)} °C</span>
              </div>
            )}
            {vm.metrics.ph != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">pH</span>
                <span className="font-mono text-xs">{vm.metrics.ph.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="my-3 border-t border-border" />

          <h2 className="mb-3 text-sm font-semibold">Simulation Stats</h2>
          <div className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Spawned</span>
              <span className="font-mono">{stats.totalSpawned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Passed Through</span>
              <span className="font-mono text-blue-400">{stats.totalPassed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Captured</span>
              <span className="font-mono text-red-400">{totalCaptured}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Observed Efficiency</span>
              <span className="font-mono font-semibold text-green-400">{efficiency}%</span>
            </div>
          </div>

          <div className="my-3 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Captured by Type</h3>
          <div className="space-y-1.5">
            {moleculeTypes.filter((m) => m.filterable).map((m) => (
              <div key={m.code} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {m.name}
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground/80">
                    ({Math.round(simConfig.removalEfficiency)}% tgt)
                  </span>
                </span>
                <span className="font-mono text-xs">
                  {stats.capturedByType[m.code] ?? 0}
                </span>
              </div>
            ))}
          </div>

          <div className="my-3 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Legend</h3>
          <div className="space-y-1.5">
            {moleculeTypes.map((m) => (
              <div key={m.code} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span className="text-muted-foreground">
                  {m.code} — {m.name}
                </span>
                {!m.filterable && (
                  <span className="ml-auto text-[10px] text-blue-400">passes</span>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
