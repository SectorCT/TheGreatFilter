import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Microscope } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
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
  buildMoleculeDefinitions,
  MolecularScene,
  type MolecularHoverInfo
} from '@renderer/utils/molecularViz'

type HoverState = {
  x: number
  y: number
  info: MolecularHoverInfo
} | null

function formatValue(value?: number): string {
  if (value == null || Number.isNaN(value)) return 'n/a'
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

export function FilterAnalysis(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isImported = isImportedFilterRouteId(id)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<MolecularScene | null>(null)
  const rafRef = useRef<number>(0)

  const [loading, setLoading] = useState(Boolean(id))
  const [filterInfo, setFilterInfo] = useState<FilterInfo | null>(null)
  const [hover, setHover] = useState<HoverState>(null)
  const [error, setError] = useState<string | null>(id ? null : 'Missing filter ID.')

  useEffect(() => {
    let cancelled = false

    if (!id) {
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
        if (!cancelled) setFilterInfo(details.filterInfo)
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
        if (!cancelled) setFilterInfo(resp.filterInfo)
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setFilterInfo(null)
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter analysis data.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isImported, location.state])

  const moleculeDefs = useMemo(() => buildMoleculeDefinitions(filterInfo ?? {}), [filterInfo])
  const vm = useMemo(() => buildFilterInfoViewModel(filterInfo), [filterInfo])
  const filterStructure = filterInfo?.filterStructure
  const experimentPayload = filterInfo?.experimentPayload
  const resultPayload = filterInfo?.resultPayload
  const removalEfficiency = vm.metrics.removalEfficiency ?? resultPayload?.removalEfficiency ?? 90

  const radarData = useMemo(() => {
    return vm.parameterRadarData
  }, [vm.parameterRadarData])

  const removalData = useMemo(() => {
    const eff = Math.max(0, Math.min(100, removalEfficiency)) / 100
    return vm.params
      .map((item) => {
        const removed = item.value * eff
        const remaining = Math.max(0, item.value - removed)
        return {
          name: item.code,
          concentration: Number(item.value.toFixed(3)),
          removed: Number(removed.toFixed(3)),
          remaining: Number(remaining.toFixed(3)),
          unit: item.unit
        }
      })
      .sort((a, b) => b.concentration - a.concentration)
      .slice(0, 8)
  }, [vm.params, removalEfficiency])

  useEffect(() => {
    if (!filterInfo) return
    const genericDefs = moleculeDefs.filter((m) => m.formula === 'n/a').map((m) => m.code)
    console.debug('[FilterAnalysis] molecule mapping', {
      filterId: id,
      totalParams: vm.params.length,
      molecularDefs: moleculeDefs.length,
      genericDefs
    })
  }, [filterInfo, id, moleculeDefs, vm.params.length])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || loading) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!sceneRef.current) {
      sceneRef.current = new MolecularScene({
        definitions: moleculeDefs,
        poreSize: vm.metrics.poreSize ?? filterStructure?.poreSize,
        materialType: vm.metrics.materialType,
        layerThickness: vm.metrics.layerThickness ?? filterStructure?.layerThickness,
        removalEfficiency
      })
    } else {
      sceneRef.current.update({
        definitions: moleculeDefs,
        poreSize: vm.metrics.poreSize ?? filterStructure?.poreSize,
        materialType: vm.metrics.materialType,
        layerThickness: vm.metrics.layerThickness ?? filterStructure?.layerThickness,
        removalEfficiency
      })
    }

    const syncSize = (): void => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sceneRef.current?.setViewport(rect.width, rect.height)
    }

    syncSize()
    const observer = new ResizeObserver(syncSize)
    observer.observe(canvas)

    let lastTime = 0
    const loop = (time: number): void => {
      const dt = lastTime === 0 ? 16 : Math.min(34, time - lastTime)
      lastTime = time
      sceneRef.current?.frame(dt)
      sceneRef.current?.draw(ctx)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [loading, moleculeDefs, filterStructure, removalEfficiency, vm.metrics])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const info = sceneRef.current?.pick(x, y) ?? null
    if (!info) {
      setHover(null)
      return
    }
    setHover({ x, y, info })
  }

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
            <h1 className="text-xl font-semibold">Molecular Analysis</h1>
            <p className="font-mono text-xs text-muted-foreground">Filter {id ?? '-'}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            navigate(`/filters/${id}/simulate`, {
              state: isImported ? readImportedFilterSession(location) ?? undefined : undefined,
            })
          }
        >
          <Microscope size={14} strokeWidth={1.5} />
          Compare With Simulation
        </Button>
      </div>
      {error ? (
        <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] border border-border bg-black">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHover(null)}
            />
            {hover && (
              <div
                className="pointer-events-none absolute z-10 rounded-[6px] border border-border bg-card/95 px-2 py-1 text-xs shadow-md backdrop-blur-sm"
                style={{
                  left: `${hover.x + 12}px`,
                  top: `${hover.y + 12}px`
                }}
              >
                <p className="font-semibold text-foreground">
                  {hover.info.name} ({hover.info.formula})
                </p>
                <p className="font-mono text-muted-foreground">
                  {hover.info.concentration} {hover.info.unit} ({hover.info.zone})
                </p>
              </div>
            )}
          </div>
          <div className="rounded-[8px] border border-border bg-card p-3 text-sm text-muted-foreground">
            Molecule density comes from `experimentPayload.params`. Membrane labels use aggregate filter geometry.
            Removal uses the summary removal efficiency for all species.
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold">Water Quality Fingerprint</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="parameter" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <PolarRadiusAxis domain={[0, 100]} tickCount={6} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.28} />
                <Tooltip
                  formatter={(value) => [`${String(value ?? '-')}%`, 'Normalized']}
                  contentStyle={{ borderRadius: 8, borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="my-3 border-t border-border" />

          <h2 className="mb-2 text-sm font-semibold">Contaminant Removal</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={removalData} margin={{ top: 4, right: 8, left: 2, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="name" type="category" width={42} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  formatter={(value, key) => [`${String(value ?? '-')}`, key === 'removed' ? 'Removed' : 'Remaining']}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{ borderRadius: 8, borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
                />
                <Bar dataKey="removed" stackId="a" fill="#ef4444" />
                <Bar dataKey="remaining" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="my-3 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Filter Properties</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Material</span>
              <span className="font-mono text-xs">{vm.metrics.materialType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pore Size</span>
              <span className="font-mono text-xs">{formatValue(vm.metrics.poreSize ?? undefined)} nm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Layer Thickness</span>
              <span className="font-mono text-xs">{formatValue(vm.metrics.layerThickness ?? undefined)} nm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lattice Spacing</span>
              <span className="font-mono text-xs">{formatValue(vm.metrics.latticeSpacing ?? undefined)} A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Binding Energy</span>
              <span className="font-mono text-xs">{formatValue(vm.metrics.bindingEnergy ?? undefined)} eV</span>
            </div>
          </div>

          {vm.layerRows.length > 1 ? (
            <>
              <div className="my-3 border-t border-border" />
              <h3 className="mb-2 text-sm font-semibold">Per-layer (pollutant)</h3>
              <div className="max-h-48 space-y-2 overflow-y-auto text-xs">
                {vm.layerRows.map((row, i) => (
                  <div key={`${row.pollutant}-${row.pollutantSymbol}-${i}`} className="rounded-[6px] border border-border bg-background/50 p-2">
                    <div className="font-medium text-foreground">
                      {row.pollutant !== 'n/a' ? row.pollutant : row.pollutantSymbol}
                      {row.pollutantSymbol !== 'n/a' ? (
                        <span className="ml-1 font-mono text-muted-foreground">({row.pollutantSymbol})</span>
                      ) : null}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-2 font-mono text-[10px] text-muted-foreground">
                      <span>Removal {formatValue(row.removalEfficiency ?? undefined)}%</span>
                      <span>BE {formatValue(row.bindingEnergy ?? undefined)} eV</span>
                      <span>Pore {formatValue(row.poreSize ?? undefined)} nm</span>
                      <span>Thick {formatValue(row.layerThickness ?? undefined)} nm</span>
                      <span className="col-span-2">Mat. {row.materialType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="my-3 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Sample Conditions</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Temperature</span>
              <span className="font-mono text-xs">{formatValue(experimentPayload?.temperature)} C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">pH</span>
              <span className="font-mono text-xs">{formatValue(experimentPayload?.ph)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Pollutant</span>
              <span className="font-mono text-xs">{vm.metrics.pollutant}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Removal Efficiency</span>
              <span className="font-mono text-xs">{formatValue(vm.metrics.removalEfficiency ?? undefined)}%</span>
            </div>
          </div>

          <div className="my-3 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Molecular Legend</h3>
          <div className="space-y-1.5">
            {moleculeDefs.map((m) => (
              <div key={m.code} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                <span className="flex-1 text-muted-foreground">
                  {m.code} - {m.formula}
                </span>
                <span className="font-mono text-[10px]">{m.filterable ? 'capturable' : 'carrier'}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
