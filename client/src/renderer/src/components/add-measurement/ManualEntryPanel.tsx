import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { createMeasurement } from '@renderer/utils/api'

type ParameterPreset = {
  parameterCode: string
  parameterName: string
  unit: string
}

type ManualParameterRow = {
  id: string
  presetKey: string
  value: string
}

const PARAMETER_PRESETS: ParameterPreset[] = [
  { parameterCode: 'Alk-Tot', parameterName: 'Alkalinity', unit: 'mg/l' },
  { parameterCode: 'Al-Dis', parameterName: 'Aluminium', unit: 'mg/l' },
  { parameterCode: 'Al-Tot', parameterName: 'Aluminium', unit: 'mg/l' },
  { parameterCode: 'NH3N', parameterName: 'Ammonia', unit: 'mg/l' },
  { parameterCode: 'NH4N', parameterName: 'Ammonia', unit: 'mg/l' },
  { parameterCode: 'As-Dis', parameterName: 'Arsenic', unit: 'mg/l' },
  { parameterCode: 'As-Tot', parameterName: 'Arsenic', unit: 'mg/l' },
  { parameterCode: 'HCO3', parameterName: 'Bicarbonate', unit: 'mg/l' },
  { parameterCode: 'Cd-Dis', parameterName: 'Cadmium', unit: 'µg/l' },
  { parameterCode: 'Cd-Tot', parameterName: 'Cadmium', unit: 'µg/l' },
  { parameterCode: 'Ca-Dis', parameterName: 'Calcium', unit: 'mg/l' },
  { parameterCode: 'Ca-Tot', parameterName: 'Calcium', unit: 'mg/l' },
  { parameterCode: 'Cl-Dis', parameterName: 'Chloride', unit: 'mg/l' },
  { parameterCode: 'Cl-Tot', parameterName: 'Chloride', unit: 'mg/l' },
  { parameterCode: 'Cr-Dis', parameterName: 'Chromium', unit: 'mg/l' },
  { parameterCode: 'Cr-Tot', parameterName: 'Chromium', unit: 'mg/l' },
  { parameterCode: 'Cu-Dis', parameterName: 'Copper', unit: 'mg/l' },
  { parameterCode: 'Cu-Tot', parameterName: 'Copper', unit: 'mg/l' },
  { parameterCode: 'EC', parameterName: 'Electrical Conductance', unit: 'µS/cm' },
  { parameterCode: 'F-Dis', parameterName: 'Fluoride', unit: 'mg/l' },
  { parameterCode: 'F-Tot', parameterName: 'Fluoride', unit: 'mg/l' },
  { parameterCode: 'H-T', parameterName: 'Hardness', unit: 'mg/l' },
  { parameterCode: 'Fe-Dis', parameterName: 'Iron', unit: 'mg/l' },
  { parameterCode: 'Fe-Tot', parameterName: 'Iron', unit: 'mg/l' },
  { parameterCode: 'Pb-Dis', parameterName: 'Lead', unit: 'mg/l' },
  { parameterCode: 'Pb-Tot', parameterName: 'Lead', unit: 'mg/l' },
  { parameterCode: 'Mg-Dis', parameterName: 'Magnesium', unit: 'mg/l' },
  { parameterCode: 'Mg-Tot', parameterName: 'Magnesium', unit: 'mg/l' },
  { parameterCode: 'Mn-Dis', parameterName: 'Manganese', unit: 'mg/l' },
  { parameterCode: 'Mn-Tot', parameterName: 'Manganese', unit: 'mg/l' },
  { parameterCode: 'Hg-Dis', parameterName: 'Mercury', unit: 'µg/l' },
  { parameterCode: 'Hg-Tot', parameterName: 'Mercury', unit: 'µg/l' },
  { parameterCode: 'Ni-Dis', parameterName: 'Nickel', unit: 'mg/l' },
  { parameterCode: 'Ni-Tot', parameterName: 'Nickel', unit: 'mg/l' },
  { parameterCode: 'TOC', parameterName: 'Organic Carbon', unit: 'mg/l' },
  { parameterCode: 'DOC', parameterName: 'Organic Carbon', unit: 'mg/l' },
  { parameterCode: 'DRP', parameterName: 'Orthophosphate', unit: 'mg/l' },
  { parameterCode: 'NO2N', parameterName: 'Oxidized Nitrogen', unit: 'mg/l' },
  { parameterCode: 'NO3N', parameterName: 'Oxidized Nitrogen', unit: 'mg/l' },
  { parameterCode: 'NOxN', parameterName: 'Oxidized Nitrogen', unit: 'mg/l' },
  { parameterCode: 'O2-Dis', parameterName: 'Oxygen', unit: 'mg/l' },
  { parameterCode: 'BOD', parameterName: 'Oxygen Demand', unit: 'mg/l' },
  { parameterCode: 'COD', parameterName: 'Oxygen Demand', unit: 'mg/l' },
  { parameterCode: 'Sal', parameterName: 'Salinity', unit: 'psu' },
  { parameterCode: 'Se-Dis', parameterName: 'Selenium', unit: 'mg/l' },
  { parameterCode: 'Se-Tot', parameterName: 'Selenium', unit: 'mg/l' },
  { parameterCode: 'SO4-Dis', parameterName: 'Sulfate', unit: 'mg/l' },
  { parameterCode: 'SO4-Tot', parameterName: 'Sulfate', unit: 'mg/l' },
  { parameterCode: 'TURB', parameterName: 'Turbidity', unit: 'NTU' },
  { parameterCode: 'U-Dis', parameterName: 'Uranium', unit: 'mg/l' },
  { parameterCode: 'U-Tot', parameterName: 'Uranium', unit: 'mg/l' },
  { parameterCode: 'V-Dis', parameterName: 'Vanadium', unit: 'mg/l' },
  { parameterCode: 'V-Tot', parameterName: 'Vanadium', unit: 'mg/l' },
  { parameterCode: 'Zn-Dis', parameterName: 'Zinc', unit: 'mg/l' },
  { parameterCode: 'Zn-Tot', parameterName: 'Zinc', unit: 'mg/l' },
]

const getPresetKey = (preset: ParameterPreset): string =>
  `${preset.parameterCode}|${preset.parameterName}|${preset.unit}`

export function ManualEntryPanel(): React.JSX.Element {
  const navigate = useNavigate()
  const [measurementName, setMeasurementName] = useState('')
  const [temperature, setTemperature] = useState('')
  const [ph, setPh] = useState('')
  const [rows, setRows] = useState<ManualParameterRow[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const presetsByKey = Object.fromEntries(PARAMETER_PRESETS.map((p) => [getPresetKey(p), p] as const))

  const addRow = (): void => {
    const first = PARAMETER_PRESETS[0]
    if (!first) return
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        presetKey: getPresetKey(first),
        value: '',
      },
    ])
  }

  const removeRow = (id: string): void => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const updateRow = (id: string, patch: Partial<ManualParameterRow>): void => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const phNumber = ph === '' ? null : Number(ph)
  const isPhValid = phNumber === null || (Number.isFinite(phNumber) && phNumber >= 0 && phNumber <= 14)

  const buildPayload = () => {
    const now = new Date()
    const sampleDate = now.toISOString().slice(0, 10)
    const sampleTime = now.toTimeString().slice(0, 8)
    const extraRows = rows
      .map((row) => {
        const preset = presetsByKey[row.presetKey]
        if (!preset || row.value === '') return null
        const numericValue = Number(row.value)
        if (!Number.isFinite(numericValue)) return null
        return {
          parameterCode: preset.parameterCode,
          parameterName: preset.parameterName,
          unit: preset.unit,
          value: numericValue,
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)

    const requiredRows: Array<{
      parameterCode: string
      parameterName: string
      unit: string
      value: number
    }> = []

    const t = Number(temperature)
    if (Number.isFinite(t)) {
      requiredRows.push({
        parameterCode: 'TEMP',
        parameterName: 'Temperature',
        unit: '°C',
        value: t,
      })
    }

    if (phNumber !== null && Number.isFinite(phNumber)) {
      requiredRows.push({
        parameterCode: 'PH',
        parameterName: 'pH',
        unit: '---',
        value: phNumber,
      })
    }

    return {
      name: measurementName.trim() || undefined,
      source: 'manual' as const,
      sampleDate,
      sampleTime,
      temperature: t,
      ph: Number(ph),
      parameters: [...requiredRows, ...extraRows],
    }
  }

  const canSubmit = temperature !== '' && ph !== '' && isPhValid && Number.isFinite(Number(temperature))

  const handleSave = async (): Promise<void> => {
    if (!canSubmit) {
      setError('Temperature and pH are required and must be valid numbers.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await createMeasurement(buildPayload())
      navigate('/dashboard')
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Failed to save measurement.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveAndGenerate = async (): Promise<void> => {
    await handleSave()
  }

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="flex min-h-0 flex-col rounded-[6px] border border-border bg-card p-4 md:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Manual Measurement</h2>
          <p className="text-sm text-muted-foreground">
            Structure aligned to `POST /api/measurements/`.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="scientific-label mb-1 block">Name (optional)</label>
            <input
              value={measurementName}
              onChange={(e) => setMeasurementName(e.target.value)}
              placeholder="Example: River sample - Site A"
              className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="scientific-label mb-1 block">
              Temperature <span className="text-destructive">*</span>
            </label>
            <input
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              type="number"
              step="any"
              placeholder="22.1"
              className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="scientific-label mb-1 block">
              pH <span className="text-destructive">*</span>
            </label>
            <input
              value={ph}
              onChange={(e) => {
                const next = e.target.value
                if (next === '') {
                  setPh('')
                  return
                }
                const n = Number(next)
                if (!Number.isFinite(n)) return
                if (n < 0 || n > 14) return
                setPh(next)
              }}
              type="number"
              step="any"
              min={0}
              max={14}
              placeholder="7.3"
              className={cn(
                'h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                !isPhValid ? 'border-destructive focus:ring-destructive' : '',
              )}
            />
            {!isPhValid ? (
              <p className="mt-1 text-xs text-destructive">pH must be between 0 and 14.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 mb-3 flex items-center justify-between">
          <p className="scientific-label">Additional Parameters</p>
          <Button type="button" variant="outline" onClick={addRow}>
            <Plus className="mr-1.5" size={14} /> Add Parameter
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
          {rows.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
              No additional parameters yet. Click <strong>Add Parameter</strong> to choose from
              preset code/name/unit entries.
            </div>
          ) : null}

          {rows.map((row) => {
            const preset = presetsByKey[row.presetKey]
            return (
              <div
                key={row.id}
                className="grid grid-cols-1 gap-2 rounded-[6px] border border-border bg-surface-elevated p-3 lg:grid-cols-[1.5fr_1fr_120px_120px_40px]"
              >
                <select
                  value={row.presetKey}
                  onChange={(e) => updateRow(row.id, { presetKey: e.target.value })}
                  className="h-9 rounded-[6px] border border-input bg-background px-2 text-sm"
                >
                  {PARAMETER_PRESETS.map((p) => {
                    const key = getPresetKey(p)
                    return (
                      <option key={key} value={key}>
                        {p.parameterName} - {p.parameterCode} ({p.unit})
                      </option>
                    )
                  })}
                </select>
                <input
                  value={preset?.parameterCode ?? ''}
                  disabled
                  className="h-9 rounded-[6px] border border-input bg-muted px-3 text-sm text-muted-foreground"
                />
                <input
                  value={preset?.unit ?? ''}
                  disabled
                  className="h-9 rounded-[6px] border border-input bg-muted px-3 text-sm text-muted-foreground"
                />
                <input
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  type="number"
                  step="any"
                  placeholder="Value"
                  className="h-9 rounded-[6px] border border-input bg-background px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-input text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => void handleSave()} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Measurement'}
          </Button>
          <Button variant="outline" onClick={() => void handleSaveAndGenerate()} disabled={!canSubmit || isSubmitting}>
            Save &amp; Generate Filter
          </Button>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  )
}
