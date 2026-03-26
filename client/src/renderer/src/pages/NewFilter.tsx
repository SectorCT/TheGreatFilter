import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { Button } from '@renderer/components/ui/button'
import {
  createStudy,
  generateFilter,
  getMeasurementById,
  getMeasurements,
  getStudies
} from '@renderer/utils/api/endpoints'
import {
  type MeasurementListItem,
  type MeasurementListResponse,
  type Measurement,
  type MeasurementParameter,
  type Study,
  type StudyListResponse
} from '@renderer/utils/api/types'

const resolveMeasurements = (payload: MeasurementListResponse): MeasurementListItem[] => {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

const resolveStudies = (payload: StudyListResponse): Study[] => {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

const formatFixed = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return value.toFixed(2)
}

export function NewFilter(): React.JSX.Element {
  const navigate = useNavigate()
  const [measurements, setMeasurements] = useState<MeasurementListItem[]>([])
  const [studies, setStudies] = useState<Study[]>([])
  const [selectedStudyId, setSelectedStudyId] = useState('')
  const [selectedMeasurementId, setSelectedMeasurementId] = useState('')
  const [selectedTargetCodes, setSelectedTargetCodes] = useState<string[]>([])
  const [codeToAdd, setCodeToAdd] = useState('')
  const [measurementParameters, setMeasurementParameters] = useState<MeasurementParameter[]>([])
  const [selectedMeasurementDetail, setSelectedMeasurementDetail] = useState<Measurement | null>(
    null
  )
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true)
  const [isLoadingStudies, setIsLoadingStudies] = useState(true)
  const [isCreatingStudyInline, setIsCreatingStudyInline] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inlineStudyName, setInlineStudyName] = useState('')
  const [inlineStudyDescription, setInlineStudyDescription] = useState('')

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

  useEffect(() => {
    let isMounted = true
    const loadStudies = async (): Promise<void> => {
      setIsLoadingStudies(true)
      try {
        const response = await getStudies()
        if (!isMounted) return
        const items = resolveStudies(response)
        if (items.length > 0) {
          setStudies(items)
          setSelectedStudyId(items[0]?.id ?? '')
          return
        }

        const created = await createStudy({
          name: 'Default Study',
          description: 'Auto-created default study for filter experiments'
        })
        if (!isMounted) return
        setStudies([created])
        setSelectedStudyId(created.id)
      } catch (studyError) {
        if (!isMounted) return
        setStudies([])
        setSelectedStudyId('')
        const message =
          studyError instanceof Error ? studyError.message : 'Failed to load or create a study.'
        setError(message)
      } finally {
        if (isMounted) {
          setIsLoadingStudies(false)
        }
      }
    }
    void loadStudies()
    return () => {
      isMounted = false
    }
  }, [])

  const selectedMeasurement = useMemo(
    () => measurements.find((item) => item.measurementId === selectedMeasurementId) ?? null,
    [measurements, selectedMeasurementId]
  )

  const canSubmit = !!selectedStudyId && !!selectedMeasurementId && selectedTargetCodes.length > 0
  const availableParameterOptions = useMemo(
    () =>
      measurementParameters
        .filter((parameter) => !selectedTargetCodes.includes(parameter.parameterCode))
        .map((parameter) => ({
          code: parameter.parameterCode,
          label: parameter.parameterName?.trim() || parameter.parameterCode
        })),
    [measurementParameters, selectedTargetCodes]
  )

  useEffect(() => {
    let isMounted = true
    const loadMeasurementImpurities = async (): Promise<void> => {
      if (!selectedMeasurementId) {
        setMeasurementParameters([])
        setSelectedTargetCodes([])
        setSelectedMeasurementDetail(null)
        return
      }

      try {
        const detail = await getMeasurementById(selectedMeasurementId)
        if (!isMounted) return
        setSelectedMeasurementDetail(detail)
        const derived = Array.from(
          new Map(
            (detail.parameters ?? [])
              .filter(
                (parameter) => !['TEMP', 'PH'].includes(parameter.parameterCode.toUpperCase())
              )
              .map((parameter) => [parameter.parameterCode, parameter] as const)
          ).values()
        )
        setMeasurementParameters(derived)
        setSelectedTargetCodes((prev) =>
          prev.filter((code) => derived.some((parameter) => parameter.parameterCode === code))
        )
      } catch {
        if (!isMounted) return
        setMeasurementParameters([])
        setSelectedTargetCodes([])
        setSelectedMeasurementDetail(null)
      }
    }

    void loadMeasurementImpurities()
    return () => {
      isMounted = false
    }
  }, [selectedMeasurementId])

  const handleAddImpurity = (value: string): void => {
    if (!value) return
    setSelectedTargetCodes((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setCodeToAdd('')
  }

  const handleRemoveImpurity = (code: string): void => {
    setSelectedTargetCodes((prev) => prev.filter((item) => item !== code))
  }

  const selectedCodeLabels = useMemo(() => {
    const byCode = new Map(
      measurementParameters.map((parameter) => [
        parameter.parameterCode,
        parameter.parameterName?.trim() || parameter.parameterCode
      ])
    )
    return selectedTargetCodes.map((code) => ({
      code,
      label: byCode.get(code) ?? code
    }))
  }, [measurementParameters, selectedTargetCodes])

  const buildMeasurementPayload = (
    detail: Measurement
  ): { temperature: number; ph: number; parameters: MeasurementParameter[] } => ({
    temperature:
      typeof detail.temperature === 'number' && Number.isFinite(detail.temperature)
        ? detail.temperature
        : 0,
    ph: typeof detail.ph === 'number' && Number.isFinite(detail.ph) ? detail.ph : 0,
    parameters: detail.parameters ?? []
  })

  const selectedStudy = useMemo(
    () => studies.find((study) => study.id === selectedStudyId) ?? null,
    [studies, selectedStudyId]
  )

  const selectedTargetParameters = useMemo(
    () =>
      measurementParameters.filter((parameter) =>
        selectedTargetCodes.includes(parameter.parameterCode)
      ),
    [measurementParameters, selectedTargetCodes]
  )

  const selectedTargetParameterCodes = useMemo(
    () => selectedTargetParameters.map((parameter) => parameter.parameterCode),
    [selectedTargetParameters]
  )

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit || !selectedMeasurementDetail) return
    const payload = {
      studyId: selectedStudyId,
      studyName: selectedStudy?.name ?? null,
      measurementId: selectedMeasurementId,
      measurement: buildMeasurementPayload(selectedMeasurementDetail),
      targetParameterCodes: selectedTargetParameterCodes,
      coreInputs: {}
    }
    console.log(
      '[New Filter] study selection:',
      JSON.stringify(
        {
          selectedStudyId,
          selectedStudyName: selectedStudy?.name ?? null,
          availableStudyCount: studies.length
        },
        null,
        2
      )
    )
    console.log('[New Filter] JSON payload:', JSON.stringify(payload, null, 2))
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await generateFilter(payload)
      console.log(
        '[New Filter] Generate response:',
        JSON.stringify({ filterId: result.filterId, status: result.status }, null, 2)
      )
      toast.success(`Filter generation started (${result.status}).`)
      navigate(`/filters/${result.filterId}`)
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Failed to trigger filter generation.'
      setError(message)
      toast.error('Failed to trigger filter generation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateStudyInline = async (): Promise<void> => {
    const trimmedName = inlineStudyName.trim()
    if (!trimmedName) {
      toast.error('Study name is required.')
      return
    }
    setIsCreatingStudyInline(true)
    setError(null)
    try {
      const created = await createStudy({
        name: trimmedName,
        description: inlineStudyDescription.trim() || undefined
      })
      setStudies((prev) => {
        if (prev.some((study) => study.id === created.id)) return prev
        return [created, ...prev]
      })
      setSelectedStudyId(created.id)
      setInlineStudyName('')
      setInlineStudyDescription('')
      console.log(
        '[New Filter] inline study created:',
        JSON.stringify({ studyId: created.id, studyName: created.name }, null, 2)
      )
      toast.success('Study created and selected.')
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Failed to create study.'
      setError(message)
      toast.error('Failed to create study.')
    } finally {
      setIsCreatingStudyInline(false)
    }
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
        {isLoadingStudies ? (
          <p className="text-sm text-muted-foreground">Loading your studies...</p>
        ) : null}
        {!isLoadingMeasurements && error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {!isLoadingMeasurements && !error ? (
          <div className="space-y-5">
            <div>
              <label className="scientific-label mb-1 block">Study</label>
              <select
                value={selectedStudyId}
                onChange={(e) => setSelectedStudyId(e.target.value)}
                className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm"
                disabled={isLoadingStudies}
              >
                {studies.length === 0 ? <option value="">No studies available</option> : null}
                {studies.map((study) => (
                  <option key={study.id} value={study.id}>
                    {study.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <input
                  type="text"
                  value={inlineStudyName}
                  onChange={(event) => setInlineStudyName(event.target.value)}
                  placeholder="New study name"
                  className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm"
                />
                <input
                  type="text"
                  value={inlineStudyDescription}
                  onChange={(event) => setInlineStudyDescription(event.target.value)}
                  placeholder="Description (optional)"
                  className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCreateStudyInline()}
                  disabled={isCreatingStudyInline}
                >
                  {isCreatingStudyInline ? 'Creating...' : 'Create Study'}
                </Button>
              </div>
            </div>
            <div>
              <label className="scientific-label mb-1 block">Water Measurement</label>
              <select
                value={selectedMeasurementId}
                onChange={(e) => setSelectedMeasurementId(e.target.value)}
                className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm"
              >
                {measurements.length === 0 ? (
                  <option value="">No measurements available</option>
                ) : null}
                {measurements.map((measurement) => (
                  <option key={measurement.measurementId} value={measurement.measurementId}>
                    {measurement.name ?? 'Untitled measurement'}
                  </option>
                ))}
              </select>
              {selectedMeasurement ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  pH {formatFixed(selectedMeasurement.ph)} | Temperature{' '}
                  {formatFixed(selectedMeasurement.temperature)} C
                </p>
              ) : null}
            </div>

            <div>
              <label className="scientific-label mb-1 block">Impurities To Clean Out</label>
              <div className="flex gap-2">
                <select
                  value={codeToAdd}
                  onChange={(e) => handleAddImpurity(e.target.value)}
                  className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm"
                  disabled={availableParameterOptions.length === 0}
                >
                  <option value="">
                    {availableParameterOptions.length === 0
                      ? 'No contaminants available'
                      : 'Select contaminant...'}
                  </option>
                  {availableParameterOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedTargetCodes([])}
                  disabled={selectedTargetCodes.length === 0}
                >
                  Clear
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCodeLabels.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No impurities selected yet.</span>
                ) : null}
                {selectedCodeLabels.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleRemoveImpurity(item.code)}
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs transition-colors hover:bg-secondary"
                    title="Remove"
                  >
                    {item.label} ({item.code}) x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => void handleSubmit()}
                disabled={!canSubmit || isSubmitting || isLoadingStudies}
              >
                {isSubmitting ? 'Starting...' : 'Trigger Filter Generation'}
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
