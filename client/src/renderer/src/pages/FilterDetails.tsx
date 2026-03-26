import { ArrowLeft, Download, Eye, Microscope, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { exportFilterCsv, getFilterDetails, getFilterStatus } from '@renderer/utils/api/endpoints'
import { type FilterDetailsSuccessResponse, type FilterStatus } from '@renderer/utils/api/types'
import { buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel'

function useMeasuredSize() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setSize({ width: cr.width, height: cr.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, width: size.width, height: size.height }
}

export function FilterDetails(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams()
  const [status, setStatus] = useState<FilterStatus | null>(null)
  const [details, setDetails] = useState<FilterDetailsSuccessResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadStatus = async (): Promise<void> => {
      if (!id) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await getFilterStatus(id)
        if (!isMounted) return
        setStatus(response.status)
      } catch (fetchError) {
        if (!isMounted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter status.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadStatus()
    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    let isMounted = true
    const loadDetails = async (): Promise<void> => {
      if (!id || status !== 'Success') return
      try {
        const response = await getFilterDetails(id)
        if (!isMounted) return
        setDetails(response)
      } catch (fetchError) {
        if (!isMounted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter details.')
      }
    }
    void loadDetails()
    return () => {
      isMounted = false
    }
  }, [id, status])

  const displayStatus = status ?? 'Pending'
  const createdAt = useMemo(
    () => (details?.createdAt ? new Date(details.createdAt).toISOString().slice(0, 10) : '-'),
    [details?.createdAt]
  )
  const view = useMemo(() => buildFilterInfoViewModel(details?.filterInfo), [details?.filterInfo])
  const metricCards = useMemo(
    () => [
      { label: 'Material', value: view.metrics.materialType },
      { label: 'Pore Size', value: view.metrics.poreSize != null ? `${view.metrics.poreSize.toFixed(3)} nm` : '-' },
      {
        label: 'Binding Energy',
        value: view.metrics.bindingEnergy != null ? `${view.metrics.bindingEnergy.toFixed(4)} eV` : '-'
      },
      {
        label: 'Removal Efficiency',
        value: view.metrics.removalEfficiency != null ? `${view.metrics.removalEfficiency.toFixed(2)}%` : '-'
      },
      { label: 'Pollutant', value: view.metrics.pollutant },
      { label: 'Parameter Count', value: String(view.metrics.parameterCount) }
    ],
    [view]
  )

  const barSize = useMeasuredSize()
  const radarSize = useMeasuredSize()

  const handleExportCsv = async (): Promise<void> => {
    if (!id || status !== 'Success') return
    setIsExporting(true)
    setError(null)
    try {
      const result = await exportFilterCsv(id)
      if (result.kind === 'downloadUrl') {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
      } else {
        const blob = new Blob([result.csvText], { type: 'text/csv;charset=utf-8;' })
        const href = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = href
        link.setAttribute('download', `filter-${id}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
      }
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Failed to export CSV.')
    } finally {
      setIsExporting(false)
    }
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
            <h1 className="text-xl font-semibold">Filter Details</h1>
            <p className="font-mono text-xs text-muted-foreground">
              Filter {id ?? '-'} · Generated {createdAt}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/filters/${id}/analysis`)}>
            <Microscope size={16} strokeWidth={1.5} />
            Analyze
          </Button>
          <Button variant="outline" onClick={() => navigate(`/filters/${id}/visualize`)}>
            <Eye size={16} strokeWidth={1.5} />
            Visualize
          </Button>
          <Button variant="outline" onClick={() => navigate(`/filters/${id}/simulate`)}>
            <Play size={16} strokeWidth={1.5} />
            Simulate
          </Button>
          <Button variant="outline" onClick={() => void handleExportCsv()} disabled={status !== 'Success' || isExporting}>
            <Download size={16} strokeWidth={1.5} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-[6px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Status</p>
          <StatusBadge status={displayStatus} />
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Study ID</p>
          <p className="text-sm font-medium font-mono">{details?.studyId ?? '-'}</p>
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Measurement ID</p>
          <p className="font-mono text-xs">{details?.measurementId ?? '-'}</p>
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Created</p>
          <p className="font-mono text-xs">{createdAt}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[6px] border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading filter status...
        </div>
      ) : null}

      {!isLoading && status !== 'Success' ? (
        <div className="rounded-[6px] border border-border bg-card p-6 text-sm text-muted-foreground">
          Filter is currently <StatusBadge status={displayStatus} />. Details and export unlock when status
          becomes Success.
        </div>
      ) : null}

      {!isLoading && status === 'Success' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metricCards.map((card) => (
              <div key={card.label} className="rounded-[6px] border border-border bg-card p-4">
                <p className="scientific-label mb-2">{card.label}</p>
                <p className="font-mono text-sm">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
            <div className="rounded-[6px] border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">Parameter Composition</h2>
              <div ref={barSize.ref} className="h-72 w-full min-w-0">
                {barSize.width > 0 && barSize.height > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={view.parameterBarData} margin={{ top: 6, right: 12, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        formatter={(value, _name, item) => [
                          `${String(value ?? '-')} ${((item?.payload as { unit?: string } | undefined)?.unit ?? '')}`.trim(),
                          'Value'
                        ]}
                        contentStyle={{
                          borderRadius: 8,
                          borderColor: 'hsl(var(--border))',
                          background: 'hsl(var(--card))'
                        }}
                      />
                      <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">Quality Fingerprint</h2>
              <div ref={radarSize.ref} className="h-72 w-full min-w-0">
                {radarSize.width > 0 && radarSize.height > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <RadarChart data={view.parameterRadarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="parameter"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 100]}
                        tickCount={6}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.28} />
                      <Tooltip
                        formatter={(value) => [`${String(value ?? '-')}%`, 'Normalized']}
                        contentStyle={{
                          borderRadius: 8,
                          borderColor: 'hsl(var(--border))',
                          background: 'hsl(var(--card))'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
