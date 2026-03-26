import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { Button } from '@renderer/components/ui/button'
import { filters } from '@renderer/data/mockData'
import { SimulationEngine, MOLECULE_TYPES, type SimulationStats } from '@renderer/utils/simulation'

export function FilterSimulation(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams()
  const filter = useMemo(() => filters.find((item) => item.id === id) ?? filters[0], [id])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<SimulationEngine | null>(null)
  const rafRef = useRef<number>(0)

  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [stats, setStats] = useState<SimulationStats>({
    totalSpawned: 0,
    totalPassed: 0,
    capturedByType: {}
  })

  const getEngine = useCallback((): SimulationEngine => {
    if (!engineRef.current) {
      engineRef.current = new SimulationEngine()
    }
    return engineRef.current
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = getEngine()

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
        setStats({ ...engine.stats, capturedByType: { ...engine.stats.capturedByType } })
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [getEngine])

  useEffect(() => {
    const engine = engineRef.current
    if (engine) {
      engine.paused = !playing
    }
  }, [playing])

  useEffect(() => {
    const engine = engineRef.current
    if (engine) {
      engine.setSpeed(speed)
    }
  }, [speed])

  const handleReset = (): void => {
    const engine = engineRef.current
    if (engine) {
      engine.reset()
      setStats({ totalSpawned: 0, totalPassed: 0, capturedByType: {} })
    }
  }

  const totalCaptured = Object.values(stats.capturedByType).reduce((a, b) => a + b, 0)
  const contaminantsSpawned = stats.totalSpawned > 0
    ? Math.round(stats.totalSpawned * 0.45)
    : 0
  const efficiency =
    contaminantsSpawned > 0
      ? Math.min(100, Math.round((totalCaptured / contaminantsSpawned) * 100))
      : 0

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(`/filters/${filter.id}`)}
            className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">{filter.name} — Filtration Simulation</h1>
            <p className="font-mono text-xs text-muted-foreground">Filter {filter.id}</p>
          </div>
        </div>
      </div>

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
              <span className="text-muted-foreground">Filtration Efficiency</span>
              <span className="font-mono font-semibold text-green-400">{efficiency}%</span>
            </div>
          </div>

          <div className="my-3 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Captured by Type</h3>
          <div className="space-y-1.5">
            {MOLECULE_TYPES.filter((m) => m.filterable).map((m) => (
              <div key={m.code} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span className="flex-1 text-muted-foreground">{m.name}</span>
                <span className="font-mono text-xs">
                  {stats.capturedByType[m.code] ?? 0}
                </span>
              </div>
            ))}
          </div>

          <div className="my-3 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Legend</h3>
          <div className="space-y-1.5">
            {MOLECULE_TYPES.map((m) => (
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
