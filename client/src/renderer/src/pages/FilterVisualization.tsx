import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import * as $3Dmol from '3dmol'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { Button } from '@renderer/components/ui/button'
import { filters } from '@renderer/data/mockData'

type SelectedAtomInfo = {
  index: number | string
  element: string
  bonds: number
  bondTargets: string
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

export function FilterVisualization(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams()
  const filter = useMemo(() => filters.find((item) => item.id === id) ?? filters[0], [id])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [seed, setSeed] = useState(() => Date.now())
  const [selectedAtom, setSelectedAtom] = useState<SelectedAtomInfo | null>(null)

  const xyz = useMemo(() => buildRandomMoleculeXYZ(seed), [seed])
  const atomCount = useMemo(() => Number(xyz.split('\n')[0] ?? 0), [xyz])

  useEffect(() => {
    if (!containerRef.current) return

    const viewer = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: '#0b0f17'
    })
    viewer.addModel(xyz, 'xyz')
    viewer.setStyle({}, { stick: { radius: 0.16 }, sphere: { scale: 0.29 } })
    viewer.setClickable({}, true, (atom: any) => {
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
    viewer.zoom(1.2, 300)
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
  }, [xyz])

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
            <h1 className="text-xl font-semibold">{filter.name} Visualization</h1>
            <p className="font-mono text-xs text-muted-foreground">Filter {filter.id}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setSeed(Date.now())}>
          <RefreshCw size={14} strokeWidth={1.5} />
          Regenerate Test Structure
        </Button>
      </div>

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
                This is a generated test structure for performance checks. Click any atom in the 3D view to
                inspect its element and connectivity.
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
            </p>
            <p>
              Structure: <span className="text-foreground">Randomized test topology</span>
            </p>
            <p>
              Purpose: <span className="text-foreground">Renderer stress/perf validation</span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
