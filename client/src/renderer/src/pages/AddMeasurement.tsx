import { ArrowLeft, FileUp, Keyboard, Map, Plus, Trash2, type LucideIcon, Usb } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import OpenStreetMapPointsCard from '@renderer/components/OpenStreetMapPointsCard'
import { cn } from '@renderer/lib/utils'
import { getGemstatLocations, type GemstatLocation } from '@renderer/utils/api'

type Method = 'manual' | 'usb' | 'map' | 'csv'

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

const methods: { key: Method; label: string; description: string; icon: LucideIcon }[] = [
  {
    key: 'manual',
    label: 'Manual Input',
    description: 'Enter parameters directly',
    icon: Keyboard
  },
  {
    key: 'usb',
    label: 'Lab Equipment (USB)',
    description: 'Import from connected sensor',
    icon: Usb
  },
  { key: 'map', label: 'GemStat Map', description: 'Select from global stations', icon: Map },
  { key: 'csv', label: 'Import CSV', description: 'Upload measurement file', icon: FileUp }
]

function PlaceholderPanel({
  title,
  description
}: {
  title: string
  description: string
}): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="space-y-4 rounded-[6px] border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex h-52 items-center justify-center rounded-[6px] border border-dashed border-border bg-muted">
        {title.includes('Map') ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Map size={24} strokeWidth={1.5} />
            <span className="text-sm">Map placeholder</span>
          </div>
        ) : title.includes('CSV') ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FileUp size={24} strokeWidth={1.5} />
            <span className="text-sm">Drop CSV file here</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Usb size={24} strokeWidth={1.5} />
            <span className="text-sm">USB device placeholder</span>
          </div>
        )}
      </div>
      <Button onClick={() => navigate('/dashboard')}>Continue</Button>
    </div>
  )
}

function GemstatMapPanel(): React.JSX.Element {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<GemstatLocation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      setIsLoading(true)
      try {
        const result = await getGemstatLocations()
        if (cancelled) return
        console.info('[Map] Loaded locations:', result.locations.length)
        setLocations(result.locations)
      } catch (e) {
        console.error(e)
        if (cancelled) return
        setError('Failed to load map locations')
        setLocations([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4 rounded-[6px] border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">GemStat Map</h2>
        <p className="text-sm text-muted-foreground">
          Select a station from the map and continue with dataset import.
        </p>
        {!isLoading && locations ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Loaded points: <span className="font-mono">{locations.length}</span>
          </p>
        ) : null}
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Loading map data...</p>
          <div className="h-2 w-full overflow-hidden rounded bg-secondary">
            <div
              className="h-full w-1/3 bg-primary"
              style={{
                animation: 'tgif-progress-indeterminate 1.1s ease-in-out infinite',
              }}
            />
          </div>
          <style>{`
            @keyframes tgif-progress-indeterminate {
              0% { transform: translateX(-110%); }
              100% { transform: translateX(330%); }
            }
          `}</style>
        </div>
      ) : null}
      <div className="relative h-[520px] overflow-hidden rounded-[6px] border border-border bg-muted">
        {!isLoading && locations && locations.length > 0 ? (
          <OpenStreetMapPointsCard points={locations} />
        ) : !isLoading && locations && locations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No map points returned by backend for this account.
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Preparing map data...
          </div>
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button onClick={() => navigate('/dashboard')}>Continue</Button>
    </div>
  )
}

export function AddMeasurement(): React.JSX.Element {
  const navigate = useNavigate()
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)
  const [measurementName, setMeasurementName] = useState('')
  const [temperature, setTemperature] = useState('')
  const [ph, setPh] = useState('')
  const [rows, setRows] = useState<ManualParameterRow[]>([])
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

  const buildManualParameters = (): Array<{
    parameterCode: string
    parameterName: string
    unit: string
    value: number
  }> => {
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
    if (temperature !== '' && Number.isFinite(t)) {
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

    return [...requiredRows, ...extraRows]
  }

  const handleSave = (): void => {
    const parameters = buildManualParameters()
    console.info('[Manual] Prepared parameters array:', parameters)
    navigate('/dashboard')
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-xl font-semibold">Add Water Measurement</h1>
          <p className="text-sm text-muted-foreground">Select input method</p>
        </div>
      </div>

      {!selectedMethod ? (
        <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {methods.map((method) => {
            const Icon = method.icon
            return (
              <button
                key={method.key}
                onClick={() => setSelectedMethod(method.key)}
                className="rounded-[6px] border border-border bg-card p-4 text-left transition-colors hover:bg-secondary"
              >
                <Icon size={18} strokeWidth={1.5} className="mb-2 text-muted-foreground" />
                <p className="font-medium">{method.label}</p>
                <p className="text-sm text-muted-foreground">{method.description}</p>
              </button>
            )
          })}
        </div>
      ) : null}

      {selectedMethod === 'manual' ? (
        <div className="min-h-[calc(100vh-180px)]">
          <div className="flex min-h-0 flex-col rounded-[6px] border border-border bg-card p-4 md:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold">Manual Measurement</h2>
              <p className="text-sm text-muted-foreground">
                Structure aligned to `POST /api/measurements/` (UI-only, no submit integration yet).
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
              <Button onClick={handleSave}>Save Measurement</Button>
              <Button variant="outline" onClick={handleSave}>
                Save &amp; Generate Filter
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedMethod === 'usb' ? (
        <PlaceholderPanel
          title="Lab Equipment (USB)"
          description="Import water measurement from connected hardware sensor."
        />
      ) : null}

      {selectedMethod === 'map' ? (
        <GemstatMapPanel />
      ) : null}
      {selectedMethod === 'csv' ? (
        <PlaceholderPanel
          title="Import CSV"
          description="Upload a CSV file containing water quality parameter values."
        />
      ) : null}
    </div>
  )
}
