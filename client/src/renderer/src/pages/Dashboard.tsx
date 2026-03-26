import { ArrowRight, Clock, Droplets, FlaskConical, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { filters, measurements } from '@renderer/data/mockData'

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of filter generation and water measurements
          </p>
        </div>
        <Button onClick={() => navigate('/add-measurement')}>
          <Plus size={16} strokeWidth={1.5} />
          New Measurement
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Filters', value: '5', Icon: FlaskConical },
          { label: 'Measurements', value: '4', Icon: Droplets },
          { label: 'In Progress', value: '2', Icon: Clock },
          { label: 'Completed', value: '3', Icon: FlaskConical }
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="scientific-label">{label}</p>
              <Icon size={14} strokeWidth={1.5} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-[6px] border border-border bg-card xl:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent Filters</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/filters')}>
              View All <ArrowRight size={14} strokeWidth={1.5} />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left">
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Source</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {filters.slice(0, 5).map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/filters/${item.id}`)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.id}</td>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{item.source}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {item.date}
                    </td>
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

        <div className="rounded-[6px] border border-border bg-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Measurements</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/measurements')}>
              View All <ArrowRight size={14} strokeWidth={1.5} />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {measurements.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="cursor-pointer px-4 py-3 transition-colors hover:bg-table-row-hover"
                onClick={() => navigate('/measurements')}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">
                      pH {item.ph} · {item.temp} · {item.params} params
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
