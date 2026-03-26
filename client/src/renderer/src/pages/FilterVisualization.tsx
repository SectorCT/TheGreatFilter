import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
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

const BASE_ELEMENTS = ['C', 'N', 'O', 'S', 'H'] as const

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
  const [seed, setSeed] = useState(() => Date.now())
  const [selectedAtom, setSelectedAtom] = useState<SelectedAtomInfo | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [filterInfo, setFilterInfo] = useState<FilterInfo | null>(null)
  const [error, setError] = useState<string | null>(id ? null : 'Missing filter ID.')

  useEffect(() => {
    let cancelled = false
    if (!id) {
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

  const vm = useMemo(() => buildFilterInfoViewModel(filterInfo), [filterInfo])
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

  useEffect(() => {
    if (loading) return
    if (!containerRef.current) return

    const viewer = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: '#0b0f17'
    })
    if (modelAtoms) {
      const model = viewer.addModel()
      model.addAtoms(modelAtoms)
    } else {
      viewer.addModel(xyz, 'xyz')
    }
    if (atomCount > 1400) {
      viewer.setStyle({}, { sphere: { scale: 0.16 } })
    } else if (atomCount > 700) {
      viewer.setStyle({}, { sphere: { scale: 0.24 } })
    } else {
      viewer.setStyle({}, { stick: { radius: 0.16 }, sphere: { scale: 0.29 } })
    }
    viewer.setClickable({}, true, (atom: ClickableAtom) => {
      const atomIndex = typeof atom?.serial === 'number' ? atom.serial : (atom?.index ?? '?')
      const targets = Array.isArray(atom?.bonds) ? atom.bonds.slice(0, 8).join(', ') : 'None'
      setSelectedAtom({
        index: atomIndex,
        element: atom?.elem ?? 'Unknown',
        bonds: Array.isArray(atom?.bonds) ? atom.bonds.length : 0,
        bondTargets: targets.length > 0 ? targets : 'None'
      })
      viewer.removeAllLabels()
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
    }
  }, [xyz, loading, atomCount, modelAtoms])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(`/filters/${id}`)}
            className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Filter Visualization</h1>
            <p className="font-mono text-xs text-muted-foreground">Filter {id ?? '-'}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setSeed(Date.now())}>
          <RefreshCw size={14} strokeWidth={1.5} />
          Regenerate Fallback Structure
        </Button>
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
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] border border-border bg-black">
            <div ref={containerRef} className="absolute inset-0" />
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {usingRealStructure
                  ? hasExplicitConnections
                    ? 'Structure loaded from backend atoms + explicit connections. Click any atom in the 3D view to inspect its element and connectivity.'
                    : 'Structure loaded from backend atomPositions. Click any atom in the 3D view to inspect its element and connectivity.'
                  : 'Backend atomPositions were missing, so a generated fallback structure is shown. Click any atom in the 3D view to inspect it.'}
              </p>
            )}
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto rounded-[8px] border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Legend</h2>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">C</span> Carbon (gray)
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">O</span> Oxygen (red)
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">N</span> Nitrogen (blue)
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">S</span> Sulfur (yellow)
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">H</span> Hydrogen (white)
            </p>
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
        </aside>
      </div>
      ) : null}
    </div>
  )
}
