import { ArrowLeft, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { filterDetailParameters, filters, filterStages } from '@renderer/data/mockData'

export function FilterDetails(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams()
  const filter = useMemo(() => filters.find((item) => item.id === id) ?? filters[0], [id])
  const [simRunning, setSimRunning] = useState(false)
  const [bindingEnergy, setBindingEnergy] = useState(-18.4)
  const [porosity] = useState(0.82)
  const [convergence, setConvergence] = useState<number[]>([-5, -8, -10.5, -12.9, -15.1, -16.4])

  const affinity = Math.max(
    0,
    Math.min(100, Math.round(((Math.abs(bindingEnergy) * 4 + porosity * 100) / 2.1) * 0.8))
  )

  const recalculateWithQuantum = (): void => {
    setSimRunning(true)
    toast.info('Quantum simulation started (VQE)')
    window.setTimeout(() => {
      const newEnergy = -1 * (16 + Math.random() * 8)
      const points = Array.from({ length: 8 }, (_, idx) => -5 - idx * 1.5 - Math.random() * 1.1)
      setBindingEnergy(Number(newEnergy.toFixed(2)))
      setConvergence(points.map((point) => Number(point.toFixed(2))))
      setSimRunning(false)
      toast.success(`Quantum Simulation Complete: ${Math.max(84, affinity)}% Efficiency Predicted`)
    }, 1800)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/filters')}
            className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">{filter.name}</h1>
            <p className="font-mono text-xs text-muted-foreground">
              Filter {filter.id} · Generated {filter.date}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/filters/${filter.id}/visualize`)}>
            <Eye size={16} strokeWidth={1.5} />
            Visualize
          </Button>
          <Button variant="outline">
            <Download size={16} strokeWidth={1.5} />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Status</p>
          <StatusBadge status={filter.status} />
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Source</p>
          <p className="text-sm font-medium">{filter.source}</p>
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Generation Time</p>
          <p className="font-mono text-xs">00:04:21</p>
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Parameters</p>
          <p className="font-mono text-xs">{filterDetailParameters.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <div className="rounded-[6px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Input Parameters</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[560px] w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left">
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Parameter</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    Value
                  </th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Unit</th>
                </tr>
              </thead>
              <tbody>
                {filterDetailParameters.map((item) => (
                  <tr key={item.code} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {item.code}
                    </td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{item.value}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border p-4">
            <Button onClick={recalculateWithQuantum} disabled={simRunning}>
              {simRunning ? 'Running Quantum Simulation...' : 'Recalculate with Quantum'}
            </Button>
          </div>
        </div>

        <div className="rounded-[6px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Generated Filter Design</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left">
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Stage</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Media</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Rating</th>
                </tr>
              </thead>
              <tbody>
                {filterStages.map((item) => (
                  <tr key={item.stage} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{item.stage}</td>
                    <td className="px-4 py-3">{item.type}</td>
                    <td className="px-4 py-3">{item.media}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.micron}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <div className="relative h-64 rounded-[6px] border border-dashed border-border bg-muted">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-40 w-40 items-center justify-center rounded-full border border-border">
                  <div className="h-24 w-24 rounded-full border border-border" />
                </div>
              </div>
              <div className="absolute right-3 top-3 w-56 rounded-[6px] border border-border bg-card p-3">
                <p className="scientific-label mb-1">Convergence Plot</p>
                <svg viewBox="0 0 220 80" className="h-20 w-full">
                  <polyline
                    fill="none"
                    stroke="hsl(var(--status-generating))"
                    strokeWidth="2"
                    points={convergence
                      .map(
                        (value, idx) =>
                          `${idx * (220 / (convergence.length - 1))},${72 - (value + 20) * 2.5}`
                      )
                      .join(' ')}
                  />
                </svg>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ebinding</span>
                  <span className="font-mono">{bindingEnergy} eV</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Binding Affinity</span>
                  <span className="font-mono">{affinity}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
