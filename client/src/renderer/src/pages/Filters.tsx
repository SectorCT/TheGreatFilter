import { ArrowRight, FlaskConical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { filters } from '@renderer/data/mockData'

export function Filters(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">All Filters</h1>
          <p className="text-sm text-muted-foreground">{filters.length} generated filters</p>
        </div>
        <Button onClick={() => navigate('/add-measurement')}>
          <FlaskConical size={16} strokeWidth={1.5} />
          New Filter
        </Button>
      </div>

      <div className="rounded-[6px] border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-table-header text-left">
              <th className="px-4 py-2.5 font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Filter Name</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Parameters</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {filters.map((item, idx) => (
              <tr
                key={item.id}
                onClick={() => navigate(`/filters/${item.id}`)}
                className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover"
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.id}</td>
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3">{item.source}</td>
                <td className="px-4 py-3 font-mono text-xs">{10 + idx}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.date}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <ArrowRight size={14} strokeWidth={1.5} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
