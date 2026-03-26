import { ArrowLeft, Download, Eye } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { filterDetailParameters, filters, filterStages } from '@renderer/data/mockData'

export function FilterDetails(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams()
  const filter = useMemo(() => filters.find((item) => item.id === id) ?? filters[0], [id])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
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
          <Button variant="outline">
            <Eye size={16} strokeWidth={1.5} />
            Visualize
          </Button>
          <Button variant="outline">
            <Download size={16} strokeWidth={1.5} />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
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

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-[6px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Input Parameters</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Parameter</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Value</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Unit</th>
              </tr>
            </thead>
            <tbody>
              {filterDetailParameters.map((item) => (
                <tr key={item.code} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.code}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{item.value}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-[6px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Generated Filter Design</h2>
          </div>
          <table className="w-full text-sm">
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
          <div className="p-4">
            <div className="flex h-48 items-center justify-center rounded-[6px] border border-dashed border-border bg-muted">
              <p className="text-sm text-muted-foreground">Filter visualization placeholder</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
