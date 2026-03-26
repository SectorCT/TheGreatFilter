import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { getMeasurementById } from '@renderer/utils/api/endpoints'
import { type Measurement } from '@renderer/utils/api/types'

const humanizeSource = (source: string): string =>
  source
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

export function MeasurementDetails(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams()
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadMeasurement = async (): Promise<void> => {
      if (!id) {
        setError('Missing measurement ID.')
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const response = await getMeasurementById(id)
        if (!isMounted) return
        setMeasurement(response)
      } catch (fetchError) {
        if (!isMounted) return
        const message =
          fetchError instanceof Error ? fetchError.message : 'Failed to load measurement details.'
        setError(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadMeasurement()
    return () => {
      isMounted = false
    }
  }, [id])

  const createdDate = useMemo(() => {
    if (!measurement?.createdAt) return '-'
    return new Date(measurement.createdAt).toISOString().slice(0, 10)
  }, [measurement?.createdAt])

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-6 flex items-start gap-3">
        <button
          onClick={() => navigate('/measurements')}
          className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-xl font-semibold">{measurement?.name ?? 'Measurement Details'}</h1>
          <p className="font-mono text-xs text-muted-foreground">
            {measurement ? `Measurement ${measurement.measurementId}` : 'Loading...'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[6px] border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading measurement details...
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && measurement ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[6px] border border-border bg-card p-4">
              <p className="scientific-label mb-2">Source</p>
              <p className="text-sm font-medium">{humanizeSource(measurement.source)}</p>
            </div>
            <div className="rounded-[6px] border border-border bg-card p-4">
              <p className="scientific-label mb-2">Temperature</p>
              <p className="font-mono text-sm">{measurement.temperature.toFixed(2)} C</p>
            </div>
            <div className="rounded-[6px] border border-border bg-card p-4">
              <p className="scientific-label mb-2">pH</p>
              <p className="font-mono text-sm">{measurement.ph.toFixed(2)}</p>
            </div>
            <div className="rounded-[6px] border border-border bg-card p-4">
              <p className="scientific-label mb-2">Created</p>
              <p className="font-mono text-sm">{createdDate}</p>
            </div>
          </div>

          <div className="rounded-[6px] border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">
                Parameters ({measurement.parameters?.length ?? 0})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[620px] w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-table-header text-left">
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">Code</th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">Parameter</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Value</th>
                    <th className="px-4 py-2.5 font-medium text-muted-foreground">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {(measurement.parameters ?? []).map((parameter) => (
                    <tr
                      key={`${parameter.parameterCode}-${parameter.value}-${parameter.unit ?? ''}`}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {parameter.parameterCode}
                      </td>
                      <td className="px-4 py-3">{parameter.parameterName ?? '-'}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{parameter.value}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {parameter.unit ?? '-'}
                      </td>
                    </tr>
                  ))}
                  {(measurement.parameters ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No parameter values for this measurement.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
