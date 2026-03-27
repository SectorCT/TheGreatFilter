import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Upload } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import * as $3Dmol from '3dmol'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { Button } from '@renderer/components/ui/button'
import { getFilterDetails } from '@renderer/utils/api/endpoints'
import type { FilterInfo } from '@renderer/utils/api/types'
import { atomPositionsToXyz, buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel'

type SelectedAtomInfo = {
  index: number | string
  element: string
  bonds: number
  bondTargets: string
  x: number
  y: number
  z: number
}
type ClickableAtom = {
  serial?: number
  index?: number | string
  bonds?: Array<number | string>
  elem?: string
  x: number
  y: number
  z: number
}
type ModelAtom = {
  elem: string
  x: number
  y: number
  z: number
  bonds: number[]
  bondOrder: number[]
}

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const toFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined

const normalizeAtomPositions = (
  value: unknown,
): Array<{ id?: string | number; x: number; y: number; z: number; element: string }> | undefined => {
  if (!Array.isArray(value)) return undefined
  const atoms: Array<{ id?: string | number; x: number; y: number; z: number; element: string }> = []
  for (const entry of value) {
    const item = toRecord(entry)
    if (!item) continue
    const x = toFiniteNumber(item.x)
    const y = toFiniteNumber(item.y)
    const z = toFiniteNumber(item.z)
    const element = toStringOrUndefined(item.element)
    if (x == null || y == null || z == null || !element) continue
    atoms.push({
      id: typeof item.id === 'string' || typeof item.id === 'number' ? item.id : undefined,
      x,
      y,
      z,
      element,
    })
  }
  return atoms
}

const normalizeConnections = (
  value: unknown,
): Array<{ from: string | number; to: string | number; order?: number }> | undefined => {
  if (!Array.isArray(value)) return undefined
  const connections: Array<{ from: string | number; to: string | number; order?: number }> = []
  for (const entry of value) {
    const item = toRecord(entry)
    if (!item) continue
    const from = item.from
    const to = item.to
    if ((typeof from !== 'string' && typeof from !== 'number') || (typeof to !== 'string' && typeof to !== 'number')) {
      continue
    }
    const order = toFiniteNumber(item.order)
    connections.push({ from, to, order })
  }
  return connections
}

const normalizeImportedFilterInfo = (payload: unknown): FilterInfo => {
  const parsed = toRecord(payload)
  if (!parsed) throw new Error('JSON root must be an object.')

  const rawFilterInfo = toRecord(parsed.filterInfo) ?? parsed
  const nestedFilterStructure = toRecord(rawFilterInfo.filterStructure)
  const nestedResultPayload = toRecord(rawFilterInfo.resultPayload)
  const nestedExperimentPayload = toRecord(rawFilterInfo.experimentPayload)
  const nestedSummaryMetrics = toRecord(rawFilterInfo.summaryMetrics)

  const filterStructure = {
    ...(nestedFilterStructure ?? {}),
    poreSize: toFiniteNumber(nestedFilterStructure?.poreSize) ?? toFiniteNumber(rawFilterInfo.poreSize),
    layerThickness:
      toFiniteNumber(nestedFilterStructure?.layerThickness) ?? toFiniteNumber(rawFilterInfo.layerThickness),
    latticeSpacing:
      toFiniteNumber(nestedFilterStructure?.latticeSpacing) ?? toFiniteNumber(rawFilterInfo.latticeSpacing),
    materialType:
      toStringOrUndefined(nestedFilterStructure?.materialType) ?? toStringOrUndefined(rawFilterInfo.materialType),
    atomPositions: normalizeAtomPositions(nestedFilterStructure?.atomPositions ?? rawFilterInfo.atomPositions),
    connections: normalizeConnections(nestedFilterStructure?.connections ?? rawFilterInfo.connections)
  }

  const resultPayload = {
    ...(nestedResultPayload ?? {}),
    bindingEnergy:
      toFiniteNumber(nestedResultPayload?.bindingEnergy) ?? toFiniteNumber(rawFilterInfo.bindingEnergy),
    removalEfficiency:
      toFiniteNumber(nestedResultPayload?.removalEfficiency) ?? toFiniteNumber(rawFilterInfo.removalEfficiency),
    pollutant: toStringOrUndefined(nestedResultPayload?.pollutant) ?? toStringOrUndefined(rawFilterInfo.pollutant),
    pollutantSymbol:
      toStringOrUndefined(nestedResultPayload?.pollutantSymbol) ??
      toStringOrUndefined(rawFilterInfo.pollutantSymbol),
  }

  const normalized: FilterInfo = {
    filterStructure,
    resultPayload,
    experimentPayload: nestedExperimentPayload ?? undefined,
    summaryMetrics: nestedSummaryMetrics ?? undefined,
  }

  const hasCoordinates =
    Array.isArray(filterStructure.atomPositions) && filterStructure.atomPositions.length > 0
  const hasAnyMetric =
    typeof filterStructure.materialType === 'string' ||
    typeof filterStructure.poreSize === 'number' ||
    typeof resultPayload.bindingEnergy === 'number' ||
    typeof resultPayload.removalEfficiency === 'number'

  if (!hasCoordinates && !hasAnyMetric) {
    throw new Error('JSON does not contain recognizable filter visualization fields.')
  }

  return normalized
}

const BASE_ELEMENTS = ['C', 'N', 'O', 'S', 'H'] as const
const BASE_STYLE = { stick: { radius: 0.06 }, sphere: { scale: 0.15 } }
const ELEMENT_LABELS: Record<string, string> = {
  C: 'Carbon (black)',
  O: 'Oxygen (red)',
  N: 'Nitrogen (blue)',
  S: 'Sulfur (yellow)',
  H: 'Hydrogen (white)'
}

function randomFrom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]
}

function buildRandomMoleculeXYZ(seed: number): string {
  const atomCount = 240 + Math.floor((seed % 40) + Math.random() * 80)
  const atoms: string[] = []

  for (let i = 0; i < atomCount; i++) {
    const chain = Math.floor(i / 22)
    const angle = i * 0.42 + Math.random() * 0.35
    const radius = 2.4 + chain * 0.34 + Math.random() * 0.2
    const x = Number((Math.cos(angle) * radius + (Math.random() - 0.5) * 0.55).toFixed(4))
    const y = Number((Math.sin(angle) * radius + (Math.random() - 0.5) * 0.55).toFixed(4))
    const z = Number(((i % 22) * 0.33 - 3.6 + (Math.random() - 0.5) * 0.6).toFixed(4))
    const element = i % 6 === 0 ? randomFrom(BASE_ELEMENTS) : 'C'
    atoms.push(`${element} ${x} ${y} ${z}`)
  }

  return `${atomCount}
Stress test random structure
${atoms.join('\n')}`
}

function downsampleXyz(xyz: string, maxAtoms: number): string {
  const lines = xyz.split('\n')
  const declaredCount = Number(lines[0] ?? 0)
  if (!Number.isFinite(declaredCount) || declaredCount <= 0) return xyz
  if (declaredCount <= maxAtoms) return xyz

  const headerLine = lines[1] ?? 'Generated structure'
  const atomLines = lines.slice(2)
  const step = Math.ceil(declaredCount / maxAtoms)
  const sampled: string[] = []
  for (let i = 0; i < atomLines.length; i += step) {
    sampled.push(atomLines[i])
  }
  return `${sampled.length}\n${headerLine} (downsampled)\n${sampled.join('\n')}`
}

export function FilterVisualization(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<ReturnType<typeof $3Dmol.createViewer> | null>(null)
  const lastAtomClickRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [seed] = useState(() => Date.now())
  const [selectedAtom, setSelectedAtom] = useState<SelectedAtomInfo | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [filterInfo, setFilterInfo] = useState<FilterInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedFromName, setLoadedFromName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setLoading(false)
      return
    }
    getFilterDetails(id)
      .then((resp) => {
        if (!cancelled) setFilterInfo(resp.filterInfo)
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setFilterInfo(null)
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter structure.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const onImportJson = async (file: File): Promise<void> => {
    setError(null)
    setSelectedAtom(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const importedInfo = normalizeImportedFilterInfo(parsed)
      setFilterInfo(importedInfo)
      setLoadedFromName(file.name)
      setLoading(false)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Failed to parse filter JSON.')
    }
  }

  const vm = useMemo(() => buildFilterInfoViewModel(filterInfo), [filterInfo])
  const filterStructure = filterInfo?.filterStructure
  const experimentPayload = filterInfo?.experimentPayload
  const resultPayload = filterInfo?.resultPayload
  const usingRealStructure = vm.atomPositions.length > 0
  const hasExplicitConnections = vm.atomConnections.length > 0
  const rawXyz = useMemo(
    () => (usingRealStructure ? atomPositionsToXyz(vm.atomPositions) : buildRandomMoleculeXYZ(seed)),
    [seed, usingRealStructure, vm.atomPositions]
  )
  const rawAtomCount = useMemo(() => Number(rawXyz.split('\n')[0] ?? 0), [rawXyz])
  const xyz = useMemo(
    () => (hasExplicitConnections ? rawXyz : downsampleXyz(rawXyz, 500)),
    [rawXyz, hasExplicitConnections]
  )
  const atomCount = useMemo(() => Number(xyz.split('\n')[0] ?? 0), [xyz])
  const isDownsampled = rawAtomCount > atomCount
  const modelAtoms = useMemo(() => {
    if (!hasExplicitConnections) return null
    const indexById = new Map(vm.atomPositions.map((atom, index) => [atom.id, index]))
    const atoms: ModelAtom[] = vm.atomPositions.map((atom) => ({
      elem: atom.element,
      x: atom.x,
      y: atom.y,
      z: atom.z,
      bonds: [],
      bondOrder: []
    }))
    for (const connection of vm.atomConnections) {
      const fromIndex = indexById.get(connection.from)
      const toIndex = indexById.get(connection.to)
      if (fromIndex == null || toIndex == null) continue
      atoms[fromIndex].bonds.push(toIndex)
      atoms[fromIndex].bondOrder.push(connection.order)
      atoms[toIndex].bonds.push(fromIndex)
      atoms[toIndex].bondOrder.push(connection.order)
    }
    return atoms
  }, [hasExplicitConnections, vm.atomConnections, vm.atomPositions])
  const elementCounts = useMemo(() => {
    const source = vm.atomPositions
    const counts = new Map<string, number>()
    for (const atom of source) {
      const key = atom.element || 'Unknown'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [vm.atomPositions])

  const resetSelection = (): void => {
    setSelectedAtom(null)
    if (viewerRef.current) {
      viewerRef.current.setStyle({}, BASE_STYLE)
      ;(viewerRef.current as unknown as { setColorByElement?: (sel: object, colors: Record<string, string>) => void })
        .setColorByElement?.({}, { C: '#424242' })
    }
    viewerRef.current?.removeAllLabels()
    viewerRef.current?.render()
  }

  useEffect(() => {
    if (loading) return
    if (!containerRef.current) return

    const viewer = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: "#F9F8F6"
    })
    viewerRef.current = viewer
    if (modelAtoms) {
      const model = viewer.addModel()
      model.addAtoms(modelAtoms)
    } else {
      viewer.addModel(xyz, 'xyz')
    }
    viewer.setStyle({}, BASE_STYLE)
    ;(viewer as unknown as { setColorByElement?: (sel: object, colors: Record<string, string>) => void })
      .setColorByElement?.({}, { C: '#424242' })
    viewer.setClickable({}, true, (atom: ClickableAtom) => {
      lastAtomClickRef.current = Date.now()
      const atomIndex = typeof atom?.serial === 'number' ? atom.serial : (atom?.index ?? '?')
      const targets = Array.isArray(atom?.bonds) ? atom.bonds.slice(0, 8).join(', ') : 'None'
      setSelectedAtom({
        index: atomIndex,
        element: atom?.elem ?? 'Unknown',
        bonds: Array.isArray(atom?.bonds) ? atom.bonds.length : 0,
        bondTargets: targets.length > 0 ? targets : 'None',
        x: atom.x,
        y: atom.y,
        z: atom.z
      })
      viewer.removeAllLabels()
      viewer.setStyle({}, BASE_STYLE)
      ;(viewer as unknown as { setColorByElement?: (sel: object, colors: Record<string, string>) => void })
        .setColorByElement?.({}, { C: '#424242' })
      if (typeof atom?.serial === 'number') {
        viewer.setStyle(
          { serial: atom.serial },
          {
            sphere: { scale: 0.34 },
            stick: { radius: 0.12 }
          }
        )
      } else if (typeof atom?.index === 'number') {
        viewer.setStyle(
          { index: atom.index },
          {
            sphere: { scale: 0.34 },
            stick: { radius: 0.12 }
          }
        )
      }
      if (Array.isArray(atom?.bonds) && atom.bonds.length > 0) {
        viewer.setStyle(
          { index: atom.bonds as number[] },
          {
            sphere: { scale: 0.21 },
            stick: { radius: 0.09 }
          }
        )
      }
      viewer.addLabel(`${atom?.elem ?? 'X'} (#${atomIndex})`, {
        position: { x: atom.x, y: atom.y, z: atom.z },
        backgroundColor: '#111827',
        fontColor: '#e5e7eb',
        borderThickness: 0,
        inFront: true,
        showBackground: true
      })
      viewer.render()
    })
    viewer.zoomTo()
    viewer.render()

    const onResize = (): void => {
      viewer.resize()
    }

    window.addEventListener('resize', onResize)
    window.setTimeout(() => {
      viewer.resize()
    }, 0)

    return () => {
      window.removeEventListener('resize', onResize)
      viewer.clear()
      viewerRef.current = null
    }
  }, [xyz, loading, atomCount, modelAtoms])

  const handleViewerClick = (): void => {
    if (!selectedAtom) return
    if (Date.now() - lastAtomClickRef.current < 120) return
    resetSelection()
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => (id ? navigate(`/filters/${id}`) : navigate('/filters'))}
            className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Filter Visualization</h1>
            <p className="font-mono text-xs text-muted-foreground">
              {loadedFromName ? `Imported JSON: ${loadedFromName}` : `Filter ${id ?? '-'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void onImportJson(file)
              event.target.value = ''
            }}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} strokeWidth={1.5} />
            Visualize from JSON
          </Button>
        </div>
      </div>
      {error ? (
        <div className="mb-4 rounded-[6px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-[8px] border border-border bg-card">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!loading ? (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] bg-black">
            <div ref={containerRef} className="absolute inset-0" onClick={handleViewerClick} />
          </div>
          <div className="h-36 shrink-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Structure Description</h2>
            {selectedAtom ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  Selected atom: <span className="font-medium text-foreground">{selectedAtom.element}</span> #
                  <span className="font-mono text-foreground">{selectedAtom.index}</span>
                </p>
                <p>
                  Connections: <span className="font-mono text-foreground">{selectedAtom.bonds}</span>
                </p>
                <p>
                  Bonded atom indexes: <span className="font-mono text-foreground">{selectedAtom.bondTargets}</span>
                </p>
                <p>
                  Position (A):{' '}
                  <span className="font-mono text-foreground">
                    {selectedAtom.x.toFixed(3)}, {selectedAtom.y.toFixed(3)}, {selectedAtom.z.toFixed(3)}
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  {usingRealStructure
                    ? hasExplicitConnections
                      ? 'Structure loaded from backend atom coordinates with explicit connection graph.'
                      : 'Structure loaded from backend atom coordinates with inferred connectivity.'
                    : 'Backend atom coordinates unavailable, so a generated fallback topology is shown.'}
                </p>
                <p>
                  Material:{' '}
                  <span className="font-mono text-foreground">{vm.metrics.materialType}</span> | Pore Size:{' '}
                  <span className="font-mono text-foreground">
                    {vm.metrics.poreSize != null ? `${vm.metrics.poreSize.toFixed(3)} nm` : 'n/a'}
                  </span>{' '}
                  | Removal:{' '}
                  <span className="font-mono text-foreground">
                    {vm.metrics.removalEfficiency != null ? `${vm.metrics.removalEfficiency.toFixed(2)}%` : 'n/a'}
                  </span>
                </p>
                <p>Click an atom to inspect it. Click empty space to return to this summary.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Legend</h2>
          <div className="space-y-2 text-sm">
            {elementCounts.length > 0 ? (
              elementCounts.map(([element]) => (
                <p key={`legend-${element}`} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{element}</span>{' '}
                  {ELEMENT_LABELS[element] ?? 'Element'}
                </p>
              ))
            ) : (
              <p className="text-muted-foreground">No elements available.</p>
            )}
          </div>

          <div className="my-4 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Graph Info</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Atoms: <span className="font-mono text-foreground">{atomCount}</span>
              {isDownsampled ? (
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  (from {rawAtomCount}, perf mode)
                </span>
              ) : null}
            </p>
            <p>
              Connections:{' '}
              <span className="font-mono text-foreground">
                {hasExplicitConnections ? vm.atomConnections.length : 'inferred'}
              </span>
            </p>
            <p>
              Structure:{' '}
              <span className="text-foreground">
                {usingRealStructure ? 'Atom coordinates from API payload' : 'Randomized test topology'}
              </span>
            </p>
            <p>
              Purpose:{' '}
              <span className="text-foreground">
                {usingRealStructure ? 'Real backend filter structure' : 'Renderer stress/perf fallback'}
              </span>
            </p>
          </div>

          <div className="my-4 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Filter Metrics</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Material: <span className="font-mono text-foreground">{vm.metrics.materialType}</span>
            </p>
            <p>
              Pore Size:{' '}
              <span className="font-mono text-foreground">
                {vm.metrics.poreSize != null ? `${vm.metrics.poreSize.toFixed(3)} nm` : 'n/a'}
              </span>
            </p>
            <p>
              Layer Thickness:{' '}
              <span className="font-mono text-foreground">
                {vm.metrics.layerThickness != null ? `${vm.metrics.layerThickness.toFixed(3)} nm` : 'n/a'}
              </span>
            </p>
            <p>
              Lattice Spacing:{' '}
              <span className="font-mono text-foreground">
                {vm.metrics.latticeSpacing != null ? `${vm.metrics.latticeSpacing.toFixed(3)} A` : 'n/a'}
              </span>
            </p>
            <p>
              Binding Energy:{' '}
              <span className="font-mono text-foreground">
                {vm.metrics.bindingEnergy != null ? `${vm.metrics.bindingEnergy.toFixed(4)} eV` : 'n/a'}
              </span>
            </p>
            <p>
              Removal Efficiency:{' '}
              <span className="font-mono text-foreground">
                {vm.metrics.removalEfficiency != null ? `${vm.metrics.removalEfficiency.toFixed(2)}%` : 'n/a'}
              </span>
            </p>
            <p>
              Pollutant: <span className="font-mono text-foreground">{vm.metrics.pollutant}</span>
            </p>
          </div>

          <div className="my-4 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Sample Conditions</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Temperature:{' '}
              <span className="font-mono text-foreground">
                {vm.metrics.temperature != null ? `${vm.metrics.temperature.toFixed(2)} C` : 'n/a'}
              </span>
            </p>
            <p>
              pH: <span className="font-mono text-foreground">{vm.metrics.ph != null ? vm.metrics.ph.toFixed(2) : 'n/a'}</span>
            </p>
            <p>
              Parameters: <span className="font-mono text-foreground">{vm.metrics.parameterCount}</span>
            </p>
          </div>

          <div className="my-4 border-t border-border" />

          <h3 className="mb-2 text-sm font-semibold">Element Composition</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            {elementCounts.length > 0 ? (
              elementCounts.map(([element, count]) => (
                <p key={element}>
                  {element}: <span className="font-mono text-foreground">{count}</span>
                </p>
              ))
            ) : (
              <p>No atomic composition available.</p>
            )}
          </div>

          {(filterStructure || experimentPayload || resultPayload) ? (
            <>
              <div className="my-4 border-t border-border" />
              <h3 className="mb-2 text-sm font-semibold">Payload Availability</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  filterStructure:{' '}
                  <span className="font-mono text-foreground">{filterStructure ? 'present' : 'missing'}</span>
                </p>
                <p>
                  experimentPayload:{' '}
                  <span className="font-mono text-foreground">{experimentPayload ? 'present' : 'missing'}</span>
                </p>
                <p>
                  resultPayload: <span className="font-mono text-foreground">{resultPayload ? 'present' : 'missing'}</span>
                </p>
              </div>
            </>
          ) : null}
        </aside>
      </div>
      ) : null}
    </div>
  )
}
