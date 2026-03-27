import { ArrowRight, Download, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { getMeasurementById, getMeasurements } from '@renderer/utils/api/endpoints'
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

const csvEscape = (value: unknown): string => {
  const text = value == null ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

const toSafeFileStem = (value: string): string => {
  const normalized = value
    .trim()
    .replaceAll(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/\.+$/g, '')
  return normalized || 'measurement'
}

const buildMeasurementCsv = (measurement: {
  measurementId: string
  name?: string
  source: string
  createdAt?: string
  sampleDate?: string
  sampleTime?: string
  temperature: number
  ph: number
  parameters?: Array<{
    parameterCode: string
    parameterName?: string | null
    unit?: string | null
    value: number
  }>
}): string => {
  const lines: string[] = []
  lines.push('section,key,value')
  lines.push(`measurement,measurementId,${csvEscape(measurement.measurementId)}`)
  lines.push(`measurement,name,${csvEscape(measurement.name ?? '')}`)
  lines.push(`measurement,source,${csvEscape(measurement.source)}`)
  lines.push(`measurement,createdAt,${csvEscape(measurement.createdAt ?? '')}`)
  lines.push(`measurement,sampleDate,${csvEscape(measurement.sampleDate ?? '')}`)
  lines.push(`measurement,sampleTime,${csvEscape(measurement.sampleTime ?? '')}`)
  lines.push(`measurement,temperature,${csvEscape(measurement.temperature)}`)
  lines.push(`measurement,ph,${csvEscape(measurement.ph)}`)
  lines.push('')
  lines.push('parameterCode,parameterName,unit,value')
  for (const parameter of measurement.parameters ?? []) {
    lines.push(
      [
        csvEscape(parameter.parameterCode),
        csvEscape(parameter.parameterName ?? ''),
        csvEscape(parameter.unit ?? ''),
        csvEscape(parameter.value)
      ].join(',')
    )
  }
  return lines.join('\n')
}

export function Measurements(): React.JSX.Element {
  const navigate = useNavigate()
  const [items, setItems] = useState<MeasurementListItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportingMeasurementId, setExportingMeasurementId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadMeasurements = async (): Promise<void> => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getMeasurements()
        if (!isMounted) return
        setItems(resolveMeasurements(response))
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : 'Failed to load measurements.'
        setError(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMeasurements()

    return () => {
      isMounted = false
    }
  }, [])

  const measurementCount = useMemo(() => items.length, [items])

  const onExportMeasurementCsv = async (measurementId: string): Promise<void> => {
    setExportingMeasurementId(measurementId)
    setExportError(null)
    try {
      const details = await getMeasurementById(measurementId)
      const csvText = buildMeasurementCsv(details)
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
      const href = URL.createObjectURL(blob)
      const fileStem = toSafeFileStem(details.name ?? 'measurement')
      const link = document.createElement('a')
      link.href = href
      link.setAttribute('download', `${fileStem}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(href)
    } catch (exportErr) {
      setExportError(exportErr instanceof Error ? exportErr.message : 'Failed to export measurement CSV.')
    } finally {
      setExportingMeasurementId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Water Measurements</h1>
          <p className="text-sm text-muted-foreground">{measurementCount} measurements</p>
        </div>
        <Button onClick={() => navigate('/add-measurement')}>
          <Plus size={16} strokeWidth={1.5} />
          Add Measurement
        </Button>
      </div>

      <div className="rounded-[6px] border border-border bg-card">
        {exportError ? (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {exportError}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Label</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">pH</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Temp</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Params</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Export</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading measurements...
                  </td>
                </tr>
              ) : null}

              {!isLoading && error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-destructive">
                    {error}
                  </td>
                </tr>
              ) : null}

              {!isLoading && !error && items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No measurements yet. Add one to get started.
                  </td>
                </tr>
              ) : null}

              {!isLoading &&
                !error &&
                items.map((item) => (
                <tr
                  key={item.measurementId}
                  onClick={() => navigate(`/measurements/${item.measurementId}`)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover"
                >
                  <td className="px-4 py-3 font-medium">{item.name ?? 'Untitled measurement'}</td>
                  <td className="px-4 py-3">{humanizeSource(item.source)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatFixed(item.ph)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {formatFixed(item.temperature)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {item.parameters?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {formatDateYmd(item.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={exportingMeasurementId === item.measurementId}
                      onClick={(event) => {
                        event.stopPropagation()
                        void onExportMeasurementCsv(item.measurementId)
                      }}
                    >
                      <Download size={14} strokeWidth={1.5} />
                      {exportingMeasurementId === item.measurementId ? 'Exporting...' : 'CSV'}
                    </Button>
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
    </div>
  )
}
