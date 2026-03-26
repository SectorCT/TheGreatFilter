import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { Button } from '@renderer/components/ui/button'
import { getMeasurementById, getMeasurements } from '@renderer/utils/api/endpoints'
import { type MeasurementListItem, type MeasurementListResponse } from '@renderer/utils/api/types'

const resolveMeasurements = (payload: MeasurementListResponse): MeasurementListItem[] => {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

export function NewFilter(): React.JSX.Element {
  const navigate = useNavigate()
  const [measurements, setMeasurements] = useState<MeasurementListItem[]>([])
  const [selectedMeasurementId, setSelectedMeasurementId] = useState('')
  const [selectedImpurities, setSelectedImpurities] = useState<string[]>([])
  const [impurityToAdd, setImpurityToAdd] = useState('')
  const [measurementImpurities, setMeasurementImpurities] = useState<string[]>([])
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const loadMeasurements = async (): Promise<void> => {
      setIsLoadingMeasurements(true)
      setError(null)
      try {
        const response = await getMeasurements()
        if (!isMounted) return
        const items = resolveMeasurements(response)
        setMeasurements(items)
        if (items.length > 0) {
          setSelectedMeasurementId(items[0]?.measurementId ?? '')
        }
      } catch (fetchError) {
        if (!isMounted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load measurements.')
      } finally {
        if (isMounted) setIsLoadingMeasurements(false)
      }
    }
    void loadMeasurements()
    return () => {
      isMounted = false
    }
  }, [])

  const selectedMeasurement = useMemo(
    () => measurements.find((item) => item.measurementId === selectedMeasurementId) ?? null,
    [measurements, selectedMeasurementId]
  )

  const canSubmit = !!selectedMeasurementId && selectedImpurities.length > 0
  const availableImpurities = useMemo(
    () => measurementImpurities.filter((impurity) => !selectedImpurities.includes(impurity)),
    [measurementImpurities, selectedImpurities]
  )

  useEffect(() => {
    let isMounted = true
    const loadMeasurementImpurities = async (): Promise<void> => {
      if (!selectedMeasurementId) {
        setMeasurementImpurities([])
        setSelectedImpurities([])
        return
      }

      try {
        const detail = await getMeasurementById(selectedMeasurementId)
        if (!isMounted) return
        const derived = Array.from(
          new Set(
            (detail.parameters ?? [])
              .filter((parameter) => !['TEMP', 'PH'].includes(parameter.parameterCode.toUpperCase()))
              .map(
                (parameter) =>
                  parameter.parameterName?.trim() || parameter.parameterCode?.trim() || 'Unknown'
              )
              .filter((value) => value.length > 0)
          )
        )
        setMeasurementImpurities(derived)
        setSelectedImpurities((prev) => prev.filter((value) => derived.includes(value)))
      } catch {
        if (!isMounted) return
        setMeasurementImpurities([])
        setSelectedImpurities([])
      }
    }

    void loadMeasurementImpurities()
    return () => {
      isMounted = false
    }
  }, [selectedMeasurementId])

  const handleAddImpurity = (value: string): void => {
    if (!value) return
    setSelectedImpurities((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setImpurityToAdd('')
  }

  const handleRemoveImpurity = (value: string): void => {
    setSelectedImpurities((prev) => prev.filter((item) => item !== value))
  }

  const handleSubmit = (): void => {
    if (!canSubmit) return
    const payload = {
      measurementId: selectedMeasurementId,
      impurities: selectedImpurities
    }
    console.log('[New Filter] JSON payload:', JSON.stringify(payload, null, 2))
    toast.success('Filter request prepared (frontend-only).')
    navigate('/filters')
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-6 flex items-start gap-3">
        <button
          onClick={() => navigate('/filters')}
          className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-xl font-semibold">New Filter</h1>
          <p className="text-sm text-muted-foreground">
            Choose an existing measurement and target impurities to remove.
          </p>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-5">
        {isLoadingMeasurements ? (
          <p className="text-sm text-muted-foreground">Loading your measurements...</p>
        ) : null}
        {!isLoadingMeasurements && error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!isLoadingMeasurements && !error ? (
          <div className="space-y-5">
            <div>
              <label className="scientific-label mb-1 block">Water Measurement</label>
              <select
                value={selectedMeasurementId}
                onChange={(e) => setSelectedMeasurementId(e.target.value)}
                className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm"
              >
                {measurements.length === 0 ? <option value="">No measurements available</option> : null}
                {measurements.map((measurement) => (
                  <option key={measurement.measurementId} value={measurement.measurementId}>
                    {measurement.name ?? 'Untitled measurement'}
                  </option>
                ))}
              </select>
              {selectedMeasurement ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  pH {selectedMeasurement.ph.toFixed(2)} | Temperature{' '}
                  {selectedMeasurement.temperature.toFixed(2)} C
                </p>
              ) : null}
            </div>

            <div>
              <label className="scientific-label mb-1 block">Impurities To Clean Out</label>
              <div className="flex gap-2">
                <select
                  value={impurityToAdd}
                  onChange={(e) => handleAddImpurity(e.target.value)}
                  className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm"
                  disabled={availableImpurities.length === 0}
                >
                  <option value="">
                    {availableImpurities.length === 0 ? 'No contaminants available' : 'Select impurity...'}
                  </option>
                  {availableImpurities.map((impurity) => (
                    <option key={impurity} value={impurity}>
                      {impurity}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedImpurities([])}
                  disabled={selectedImpurities.length === 0}
                >
                  Clear
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedImpurities.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No impurities selected yet.</span>
                ) : null}
                {selectedImpurities.map((impurity) => (
                  <button
                    key={impurity}
                    type="button"
                    onClick={() => handleRemoveImpurity(impurity)}
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs transition-colors hover:bg-secondary"
                    title="Remove"
                  >
                    {impurity} x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                Trigger Filter Generation
              </Button>
              <Button variant="outline" onClick={() => navigate('/filters')}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
