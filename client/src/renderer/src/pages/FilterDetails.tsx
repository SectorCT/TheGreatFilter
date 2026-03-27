import { ArrowLeft, Download, Eye, Microscope, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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
import { isFilterStatusWaiting } from '@renderer/hooks/usePollPendingFilterStatuses'
import { exportFilterCsv, getFilterDetails, getFilterStatus } from '@renderer/utils/api/endpoints'
import { type FilterDetailsSuccessResponse, type FilterStatus } from '@renderer/utils/api/types'

/** UI-only: JSON import is not a server job status. */
type FilterDetailsPageStatus = FilterStatus | 'Imported'
import { buildFilterInfoViewModel } from '@renderer/utils/filterInfoViewModel'
import {
  buildFilterDetailsFromImportedJson,
  isImportedFilterRouteId,
  readImportedFilterSession,
  type ImportedFilterLocationState,
} from '@renderer/utils/importedFilterPayload'

const toSafeFileStem = (value: string): string => {
  const normalized = value
    .trim()
    .replaceAll(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/\.+$/g, '')
  return normalized || 'filter'
}

export function FilterDetails(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isImported = isImportedFilterRouteId(id)
  const importedSession = useMemo((): ImportedFilterLocationState | null => {
    if (!isImported) return null
    return readImportedFilterSession(location)
  }, [isImported, location.state])
  const [status, setStatus] = useState<FilterDetailsPageStatus | null>(null)
  const [details, setDetails] = useState<FilterDetailsSuccessResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!isImported || !id) return
    if (!importedSession?.importedFilterJson) {
      setDetails(null)
      setStatus(null)
      setError('No imported filter data. Upload a JSON file from All Filters.')
      setIsLoading(false)
      return
    }
    try {
      setDetails(buildFilterDetailsFromImportedJson(importedSession.importedFilterJson, importedSession.importedFileName))
      setStatus('Imported')
      setError(null)
    } catch (parseError) {
      setDetails(null)
      setStatus(null)
      setError(parseError instanceof Error ? parseError.message : 'Invalid filter JSON.')
    } finally {
      setIsLoading(false)
    }
  }, [isImported, id, importedSession])

  useEffect(() => {
    if (isImported) return

    let isMounted = true
    setStatus(null)
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
  }, [id, isImported])

  const statusPollingActive = id != null && !isImported && isFilterStatusWaiting(status)

  useEffect(() => {
    if (!id || !statusPollingActive) return

    let cancelled = false
    const poll = async (): Promise<void> => {
      try {
        const response = await getFilterStatus(id)
        if (cancelled) return
        setStatus(response.status)
      } catch {
        // Transient poll errors: keep showing the last known status.
      }
    }

    const interval = window.setInterval(() => {
      void poll()
    }, 5000)
    void poll()

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [id, statusPollingActive])

  useEffect(() => {
    let isMounted = true
    const loadDetails = async (): Promise<void> => {
      if (!id || isImported || status !== 'Success') return
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
  }, [id, status, isImported])

  const displayStatus = status ?? 'Pending'
  const dashboardReady = status === 'Success' || status === 'Imported'
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
  const compositionData = useMemo(() => {
    if (view.parameterBarData.length > 0) return view.parameterBarData
    const fallback = [
      { code: 'PH', name: 'pH', value: view.metrics.ph ?? 7, rawValue: view.metrics.ph ?? 7, unit: '' },
      { code: 'TMP', name: 'Temperature', value: view.metrics.temperature ?? 25, rawValue: view.metrics.temperature ?? 25, unit: 'C' },
      { code: 'PSE', name: 'Pore Size', value: view.metrics.poreSize ?? 1, rawValue: view.metrics.poreSize ?? 1, unit: 'nm' },
      { code: 'BND', name: 'Binding Energy', value: view.metrics.bindingEnergy ?? 1, rawValue: view.metrics.bindingEnergy ?? 1, unit: 'eV' },
      { code: 'EFF', name: 'Removal', value: view.metrics.removalEfficiency ?? 50, rawValue: view.metrics.removalEfficiency ?? 50, unit: '%' }
    ]
    const maxF = Math.max(...fallback.map((i) => Math.abs(Number(i.value)) || 0), 1e-9)
    return fallback.map((item) => ({
      ...item,
      value: Number(((Math.abs(Number(item.value)) / maxF) * 100).toFixed(2)),
      rawValue: Number(Number(item.rawValue).toFixed(4))
    }))
  }, [view])
  const fingerprintData = useMemo(() => {
    if (view.parameterRadarData.length > 0) return view.parameterRadarData
    const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))
    return [
      { parameter: 'Efficiency', value: clamp(view.metrics.removalEfficiency ?? 50) },
      { parameter: 'Pore Fit', value: clamp(((view.metrics.poreSize ?? 1) / 3) * 100) },
      { parameter: 'Binding', value: clamp((Math.abs(view.metrics.bindingEnergy ?? 1) / 5) * 100) },
      { parameter: 'Neutral pH', value: clamp((1 - Math.min(1, Math.abs((view.metrics.ph ?? 7) - 7) / 7)) * 100) },
      {
        parameter: 'Thermal Stability',
        value: clamp((1 - Math.min(1, Math.abs((view.metrics.temperature ?? 25) - 25) / 50)) * 100)
      }
    ]
  }, [view])
  const donutData = useMemo(() => {
    if (view.parameterDonutData.length > 0) return view.parameterDonutData
    const sorted = compositionData
      .filter((item) => item.rawValue > 0 || item.value > 0)
      .map((item) => ({
        code: item.code,
        name: item.name,
        value: Math.max(item.rawValue, 1e-9),
        rawValue: item.rawValue,
        unit: item.unit
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    return sorted.length > 0 ? sorted : [{ code: 'N/A', name: 'No Data', value: 1, rawValue: 0, unit: '' }]
  }, [compositionData, view.parameterDonutData])
  const donutColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

  const handleExportCsv = async (): Promise<void> => {
    if (!id || status !== 'Success' || isImported) return
    setIsExporting(true)
    setError(null)
    try {
      const result = await exportFilterCsv(id)
      if (result.kind !== 'csvText') {
        throw new Error('Unexpected export response (expected CSV text).')
      }
      const blob = new Blob([result.csvText], { type: 'text/csv;charset=utf-8;' })
      const href = URL.createObjectURL(blob)
      const preferredName = details?.measurementName?.trim() || details?.studyName?.trim() || 'filter'
      const fileStem = toSafeFileStem(preferredName)
      const link = document.createElement('a')
      link.href = href
      link.setAttribute('download', `${fileStem}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(href)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Failed to export CSV.')
    } finally {
      setIsExporting(false)
    }
  }

  const importedReady = !isImported || Boolean(importedSession?.importedFilterJson)
  const childNavState = isImported ? importedSession ?? undefined : undefined

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
              {isImported && importedSession?.importedFileName ? (
                <>
                  Imported <span className="text-foreground">{importedSession.importedFileName}</span> · local
                  preview (not saved) · {details?.filterId ?? id}
                </>
              ) : (
                <>
                  Filter {id ?? '-'} · Generated {createdAt}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/filters/${id}/analysis`, { state: childNavState })}
            disabled={!id || !importedReady}
          >
            <Microscope size={16} strokeWidth={1.5} />
            Analyze
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/filters/${id}/visualize`, { state: childNavState })}
            disabled={!id || !importedReady}
          >
            <Eye size={16} strokeWidth={1.5} />
            Visualize
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/filters/${id}/simulate`, { state: childNavState })}
            disabled={!id || !importedReady}
          >
            <Play size={16} strokeWidth={1.5} />
            Simulate
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleExportCsv()}
            disabled={status !== 'Success' || isExporting || isImported}
            title={isImported ? 'Export is only available for saved filters.' : undefined}
          >
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

      {!isLoading && !dashboardReady ? (
        <div className="rounded-[6px] border border-border bg-card p-6 text-sm text-muted-foreground">
          Filter is currently <StatusBadge status={displayStatus} />. Details and export unlock when status
          becomes Success.
        </div>
      ) : null}

      {!isLoading && dashboardReady ? (
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
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compositionData} margin={{ top: 6, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      formatter={(_value, _name, item) => {
                        const p = item?.payload as { rawValue?: number; unit?: string } | undefined
                        const raw = p?.rawValue
                        const u = p?.unit ?? ''
                        return [`${raw != null ? String(raw) : '-'} ${u}`.trim(), 'Measured']
                      }}
                      contentStyle={{
                        borderRadius: 8,
                        borderColor: 'hsl(var(--border))',
                        background: 'hsl(var(--card))'
                      }}
                    />
                    <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {view.parameterBarData.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Experimental parameter values unavailable; showing derived profile from filter metrics.
                </p>
              ) : null}
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">Quality Fingerprint</h2>
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={fingerprintData}>
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
              </div>
              {view.parameterRadarData.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Fingerprint is estimated from efficiency, pore size, binding, pH, and temperature.
                </p>
              ) : null}
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4 2xl:col-span-2">
              <h2 className="mb-2 text-sm font-semibold">Composition Share (Top Signals)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="code"
                      innerRadius={64}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`${entry.code}-${index}`} fill={donutColors[index % donutColors.length]} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value, _entry, index) => {
                        const data = donutData[index]
                        if (!data) return String(value)
                        return `${data.code}: ${data.rawValue} ${data.unit}`.trim()
                      }}
                    />
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const payload = item?.payload as { unit?: string; rawValue?: number } | undefined
                        const total = donutData.reduce((s, d) => s + d.value, 0)
                        const pct = total > 0 && value != null ? ((Number(value) / total) * 100).toFixed(1) : '0'
                        const raw = payload?.rawValue
                        return [
                          `${pct}% (${raw != null ? String(raw) : '-'} ${payload?.unit ?? ''})`.trim(),
                          'Share'
                        ]
                      }}
                      contentStyle={{
                        borderRadius: 8,
                        borderColor: 'hsl(var(--border))',
                        background: 'hsl(var(--card))'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
