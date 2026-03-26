import { ArrowRight, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
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

export function Measurements(): React.JSX.Element {
  const navigate = useNavigate()
  const [items, setItems] = useState<MeasurementListItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

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
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Label</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">pH</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Temp</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">DO</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Conductivity
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Params</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading measurements...
                  </td>
                </tr>
              ) : null}

              {!isLoading && error ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-destructive">
                    {error}
                  </td>
                </tr>
              ) : null}

              {!isLoading && !error && items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No measurements yet. Add one to get started.
                  </td>
                </tr>
              ) : null}

              {!isLoading &&
                !error &&
                items.map((item) => (
                <tr
                  key={item.measurementId}
                  onClick={() => navigate('/add-measurement')}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {item.measurementId}
                  </td>
                  <td className="px-4 py-3 font-medium">{item.name ?? 'Untitled measurement'}</td>
                  <td className="px-4 py-3">{humanizeSource(item.source)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{item.ph.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {item.temperature.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">-</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">-</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {item.parameters?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(item.createdAt).toISOString().slice(0, 10)}
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
