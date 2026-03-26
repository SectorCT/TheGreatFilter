import { ArrowRight, Clock, Droplets, FlaskConical, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { filters } from '@renderer/data/mockData'
import { getMeasurements } from '@renderer/utils/api/endpoints'
import { type MeasurementListItem, type MeasurementListResponse } from '@renderer/utils/api/types'

const resolveMeasurements = (payload: MeasurementListResponse): MeasurementListItem[] => {
  if (Array.isArray(payload)) {
    return payload
  }
  return payload.results ?? []
}

const humanizeSource = (source: string): string =>
  source
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const [measurements, setMeasurements] = useState<MeasurementListItem[]>([])

  useEffect(() => {
    let isMounted = true

    const loadMeasurements = async (): Promise<void> => {
      try {
        const response = await getMeasurements()
        if (!isMounted) return
        setMeasurements(resolveMeasurements(response))
      } catch {
        if (!isMounted) return
        setMeasurements([])
      }
    }

    loadMeasurements()

    return () => {
      isMounted = false
    }
  }, [])

  const measurementCount = useMemo(() => measurements.length, [measurements])

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
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
          { label: 'Total Filters', value: '5', trend: '+2 this week', Icon: FlaskConical },
          {
            label: 'Measurements',
            value: String(measurementCount),
            trend: measurementCount > 0 ? 'Connected to backend' : 'No measurements yet',
            Icon: Droplets
          },
          { label: 'In Progress', value: '2', Icon: Clock },
          { label: 'Completed', value: '3', Icon: FlaskConical }
        ].map(({ label, value, trend, Icon }) => (
          <div key={label} className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="scientific-label">{label}</p>
              <Icon size={14} strokeWidth={1.5} className="text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            {trend ? <p className="mt-1 font-mono text-xs text-muted-foreground">{trend}</p> : null}
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
                    className={`cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover ${
                      item.status === 'Generating' ? 'shimmer-row' : ''
                    }`}
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

        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-[6px] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Quantum Queue</h2>
              <span className="scientific-label">VQE</span>
            </div>
            <div className="divide-y divide-border">
              {[
                { id: 'F-002', progress: 72, stage: 'Hamiltonian assembly' },
                { id: 'F-003', progress: 41, stage: 'Energy minimization' },
                { id: 'F-006', progress: 14, stage: 'Preparing ansatz' }
              ].map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-xs">{item.id}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-[6px] bg-muted">
                    <div
                      className="h-full rounded-[6px] bg-status-generating"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.stage}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[6px] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Measurements</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/measurements')}>
                View All <ArrowRight size={14} strokeWidth={1.5} />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {measurements.slice(0, 4).map((item) => (
                <div
                  key={item.measurementId}
                  className="cursor-pointer px-4 py-3 transition-colors hover:bg-table-row-hover"
                  onClick={() => navigate('/measurements')}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.name ?? 'Untitled measurement'}</p>
                      <p className="text-sm text-muted-foreground">
                        pH {item.ph.toFixed(2)} · {item.temperature.toFixed(2)} C ·{' '}
                        {humanizeSource(item.source)}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(item.createdAt).toISOString().slice(0, 10)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
