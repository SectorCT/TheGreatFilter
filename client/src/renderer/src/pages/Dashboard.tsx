import { ArrowRight, Clock, Cpu, Droplets, FlaskConical, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { getFilters, getMeasurements } from '@renderer/utils/api/endpoints'
import {
  type FilterListItem,
  type FilterListResponse,
  type MeasurementListItem,
  type MeasurementListResponse
} from '@renderer/utils/api/types'

const resolveMeasurements = (payload: MeasurementListResponse): MeasurementListItem[] => {
  if (Array.isArray(payload)) {
    return payload
  }
  return payload.results ?? []
}

const resolveFilters = (payload: FilterListResponse): FilterListItem[] => {
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

const formatFixed = (value: unknown, digits = 2): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return value.toFixed(digits)
}

const formatDateYmd = (value: unknown): string => {
  if (typeof value !== 'string') return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toISOString().slice(0, 10)
}

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate()
  const [measurements, setMeasurements] = useState<MeasurementListItem[]>([])
  const [filters, setFilters] = useState<FilterListItem[]>([])

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

  useEffect(() => {
    let isMounted = true

    const loadFilters = async (): Promise<void> => {
      try {
        const response = await getFilters()
        if (!isMounted) return
        setFilters(resolveFilters(response))
      } catch {
        if (!isMounted) return
        setFilters([])
      }
    }

    void loadFilters()

    return () => {
      isMounted = false
    }
  }, [])

  const measurementCount = useMemo(() => measurements.length, [measurements])
  const filterCount = useMemo(() => filters.length, [filters])
  const generatingCount = useMemo(
    () => filters.filter((item) => item.status === 'Generating' || item.status === 'Pending').length,
    [filters]
  )
  const completedCount = useMemo(
    () => filters.filter((item) => item.status === 'Success').length,
    [filters]
  )

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
          { label: 'Total Filters', value: String(filterCount), trend: '', Icon: FlaskConical },
          {
            label: 'Measurements',
            value: String(measurementCount),
            trend: '',
            Icon: Droplets
          },
          { label: 'In Progress', value: String(generatingCount), trend: '', Icon: Clock },
          { label: 'Completed', value: String(completedCount), trend: '', Icon: FlaskConical }
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
                    key={item.filterId}
                    onClick={() => navigate(`/filters/${item.filterId}`)}
                    className={`cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover ${
                      item.status === 'Generating' ? 'shimmer-row' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.filterId}</td>
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <span>Filter {item.filterId.slice(0, 8)}</span>
                        {item.useQuantumComputer === true ? (
                          <Cpu size={14} strokeWidth={1.7} className="text-violet-600" aria-label="Quantum computer" />
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3">-</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {formatDateYmd(item.createdAt)}
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

        <div className="xl:col-span-2">
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
                        pH {formatFixed(item.ph)} · {formatFixed(item.temperature)} C ·{' '}
                        {humanizeSource(item.source)}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDateYmd(item.createdAt)}
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
