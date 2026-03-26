import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Droplets,
  FileUp,
  Keyboard,
  Loader2,
  Map,
  type LucideIcon,
  RefreshCw,
  Save,
  Thermometer,
  Usb,
  Zap
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { importMeasurementCsv } from '@renderer/utils/api/endpoints'
import { ApiError } from '@renderer/utils/api/makeAuthenticatedReq'
import { cn } from '@renderer/lib/utils'

type Method = 'manual' | 'usb' | 'map' | 'csv'
type UsbStatus =
  | 'idle'
  | 'connected'
  | 'reading'
  | 'waiting_wet'
  | 'dry'
  | 'measurement'
  | 'imported'
  | 'error'

type MeasurementParameter = {
  file?: string
  parameterCode: string
  parameterName?: string
  unit?: string
  value: number
}

type MeasurementPayload = {
  source: 'lab_equipment'
  temperature: number
  ph: number
  parameters: MeasurementParameter[]
}

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

function ConnectionDot({ status }: { status: UsbStatus }): React.JSX.Element {
  const isConnected = status !== 'idle' && status !== 'error'
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        isConnected
          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
          : 'bg-muted-foreground/40'
      )}
    />
  )
}

function CoreValueCard({
  icon: Icon,
  label,
  value,
  unit,
  accent
}: {
  icon: LucideIcon
  label: string
  value: string
  unit: string
  accent: string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-[6px] border border-border bg-card p-4">
      <div
        className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', accent)}
      >
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="scientific-label">{label}</p>
        <p className="font-mono text-lg font-semibold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{unit}</p>
      </div>
    </div>
  )
}

const parseCsvImportError = (error: unknown): string => {
  if (!(error instanceof ApiError)) {
    return 'CSV import failed. Please try again.'
  }

  if (!error.responseBodyText) {
    return `CSV import failed (HTTP ${error.status}).`
  }

  try {
    const parsed = JSON.parse(error.responseBodyText) as Record<string, unknown>
    const fieldMessages: string[] = []
    for (const [field, value] of Object.entries(parsed)) {
      if (Array.isArray(value) && value.length > 0) {
        fieldMessages.push(`${field}: ${value.map(String).join(', ')}`)
      } else if (typeof value === 'string') {
        fieldMessages.push(`${field}: ${value}`)
      }
    }
    return fieldMessages.length > 0
      ? fieldMessages.join(' | ')
      : `CSV import failed (HTTP ${error.status}).`
  } catch {
    return error.responseBodyText
  }
}

export function AddMeasurement(): React.JSX.Element {
  const WET_POLL_INTERVAL_MS = 300
  const navigate = useNavigate()
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)
  const [ports, setPorts] = useState<string[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [usbStatus, setUsbStatus] = useState<UsbStatus>('idle')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [measurement, setMeasurement] = useState<MeasurementPayload | null>(null)
  const [createdMeasurementId, setCreatedMeasurementId] = useState('')
  const [showRawJson, setShowRawJson] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvLabel, setCsvLabel] = useState('')
  const [csvBusy, setCsvBusy] = useState(false)
  const [csvError, setCsvError] = useState('')
  const stopWaitingForWetRef = useRef(false)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
  const labApi = window.labApi ?? window.api

  const isConnected = usbStatus !== 'idle' && usbStatus !== 'error'

  const statusLabel = useMemo(() => {
    switch (usbStatus) {
      case 'idle':
        return 'Disconnected'
      case 'connected':
        return 'Connected'
      case 'reading':
        return 'Reading'
      case 'waiting_wet':
        return 'Waiting for wet probes'
      case 'dry':
        return 'Probes dry'
      case 'measurement':
        return 'Data ready'
      case 'imported':
        return 'Saved'
      case 'error':
        return 'Error'
      default:
        return usbStatus
    }
  }, [usbStatus])

  const refreshPorts = useCallback(async (): Promise<void> => {
    if (!labApi) {
      setUsbStatus('error')
      setMessage('Device API unavailable. Restart Electron app.')
      return
    }
    const availablePorts = await labApi.listPorts()
    setPorts(availablePorts)
    if (!selectedPort && availablePorts.length > 0) {
      setSelectedPort(availablePorts[0])
    }
  }, [labApi, selectedPort])

  useEffect(() => {
    if (selectedMethod !== 'usb' || !labApi) return
    void refreshPorts()
  }, [selectedMethod, labApi, refreshPorts])

  useEffect(() => {
    return () => {
      stopWaitingForWetRef.current = true
    }
  }, [])

  async function connectDevice(): Promise<void> {
    if (!labApi) {
      setUsbStatus('error')
      setMessage('Device API unavailable. Restart Electron app.')
      return
    }
    if (!selectedPort) {
      setUsbStatus('error')
      setMessage('Select a serial port first.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await labApi.connectDevice(selectedPort)
      setUsbStatus('connected')
    } catch (error) {
      setUsbStatus('error')
      setMessage(`Connection failed: ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  async function disconnectDevice(): Promise<void> {
    if (!labApi) return
    stopWaitingForWetRef.current = true
    setBusy(true)
    setMessage('')
    try {
      await labApi.disconnectDevice()
      setUsbStatus('idle')
      setMeasurement(null)
    } catch (error) {
      setMessage(`Disconnect failed: ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  async function requestMeasurement(): Promise<void> {
    if (!labApi) {
      setUsbStatus('error')
      setMessage('Device API unavailable. Restart Electron app.')
      return
    }
    setBusy(true)
    setMessage('')
    setCreatedMeasurementId('')
    stopWaitingForWetRef.current = false
    setUsbStatus('reading')
    try {
      while (!stopWaitingForWetRef.current) {
        const result = await labApi.readMeasurement()
        if (result.status === 'DRY') {
          setUsbStatus('waiting_wet')
          setMeasurement(null)
          await new Promise((resolve) => setTimeout(resolve, WET_POLL_INTERVAL_MS))
          continue
        }
        if (!result.measurement) {
          throw new Error('Device returned WET without measurement payload.')
        }
        setMeasurement(result.measurement)
        setUsbStatus('measurement')
        return
      }
      setUsbStatus('connected')
    } catch (error) {
      setUsbStatus('error')
      setMessage(`Read failed: ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  function cancelWaitingForWet(): void {
    stopWaitingForWetRef.current = true
    setUsbStatus('connected')
    setBusy(false)
  }

  async function importMeasurement(): Promise<void> {
    if (!measurement) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(measurement)
      })
      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}.`)
      }
      const data = (await response.json()) as { measurementId?: string }
      if (!data.measurementId) {
        throw new Error('Missing measurementId from backend response.')
      }
      setCreatedMeasurementId(data.measurementId)
      setUsbStatus('imported')
    } catch (error) {
      setUsbStatus('error')
      if (error instanceof TypeError) {
        setMessage(`Could not reach backend at ${API_BASE_URL}.`)
      } else {
        setMessage(`Import failed: ${String(error)}`)
      }
    } finally {
      setBusy(false)
    }
  }

  async function importCsvMeasurement(): Promise<void> {
    if (!csvFile) {
      setCsvError('Select a CSV file first.')
      return
    }

    setCsvBusy(true)
    setCsvError('')
    try {
      await importMeasurementCsv({ file: csvFile, name: csvLabel })
      navigate('/dashboard')
    } catch (error) {
      setCsvError(parseCsvImportError(error))
    } finally {
      setCsvBusy(false)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => (selectedMethod ? setSelectedMethod(null) : navigate('/dashboard'))}
          className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-xl font-semibold">Add Water Measurement</h1>
          <p className="text-sm text-muted-foreground">
            {selectedMethod
              ? methods.find((m) => m.key === selectedMethod)?.label
              : 'Select input method'}
          </p>
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
        <div className="max-w-4xl rounded-[6px] border border-border bg-card p-4 md:p-5">
          <div className="mb-4">
            <label className="scientific-label mb-1 block">Measurement Label</label>
            <input className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <p className="scientific-label mb-2">Parameters</p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {[
              { label: 'Temperature (deg C)', required: true },
              { label: 'pH', required: true },
              { label: 'Dissolved Oxygen (mg/L)', required: false },
              { label: 'Conductivity (uS/cm)', required: false },
              { label: 'Turbidity (NTU)', required: false },
              { label: 'Nitrate (mg/L)', required: false },
              { label: 'Phosphate (mg/L)', required: false },
              { label: 'Total Hardness (mg/L)', required: false },
              { label: 'Total Dissolved Solids (mg/L)', required: false },
              { label: 'Chloride (mg/L)', required: false }
            ].map(({ label, required }) => (
              <div key={label}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {label}
                  {required ? <span className="ml-1 text-destructive">*</span> : null}
                </label>
                <input
                  className={cn(
                    'h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                    'font-mono'
                  )}
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => navigate('/dashboard')}>Save Measurement</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Save &amp; Generate Filter
            </Button>
          </div>
        </div>
      ) : null}

      {selectedMethod === 'usb' ? (
        <div className="max-w-4xl space-y-5">
          {/* --- Connection bar --- */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Usb size={15} strokeWidth={1.5} className="text-muted-foreground" />
                <span className="text-sm font-medium">Device</span>
                <ConnectionDot status={usbStatus} />
                <span className="text-xs text-muted-foreground">{statusLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedPort}
                  onChange={(event) => setSelectedPort(event.target.value)}
                  className="h-9 w-full appearance-none rounded-[6px] border border-input bg-surface-elevated pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={busy || ports.length === 0 || isConnected}
                >
                  {ports.length === 0 && <option value="">No serial ports found</option>}
                  {ports.map((port) => (
                    <option key={port} value={port}>
                      {port}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              </div>

              <button
                onClick={() => void refreshPorts()}
                disabled={busy || isConnected}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-input bg-surface-elevated transition-colors hover:bg-secondary disabled:opacity-40"
                title="Refresh ports"
              >
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </div>

            <div className="mt-3">
              {!isConnected ? (
                <Button
                  className="w-full"
                  onClick={() => void connectDevice()}
                  disabled={busy || !selectedPort}
                >
                  {busy ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Usb size={14} strokeWidth={1.5} />
                  )}
                  Connect device
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-[6px] border border-emerald-600/30 bg-emerald-500/10 px-4 py-2">
                    <CheckCircle2
                      size={14}
                      strokeWidth={1.5}
                      className="shrink-0 text-emerald-600"
                    />
                    <span className="text-sm font-medium text-emerald-700">
                      Connected — {selectedPort}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void disconnectDevice()}
                    disabled={busy}
                  >
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* --- CTA: Request measurement --- */}
          <Button
            size="lg"
            className="w-full text-base"
            onClick={() => void requestMeasurement()}
            disabled={busy || !isConnected}
          >
            {usbStatus === 'reading' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} strokeWidth={1.5} />
            )}
            {usbStatus === 'reading' ? 'Reading from device...' : 'Request Measurement'}
          </Button>

          {/* --- Dry warning --- */}
          {usbStatus === 'dry' && (
            <div className="flex items-center gap-3 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <Droplets size={18} strokeWidth={1.5} className="shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-700">Probes are dry</p>
                <p className="text-xs text-amber-600/80">
                  Place probes in water and press Request Measurement again.
                </p>
              </div>
            </div>
          )}

          {usbStatus === 'waiting_wet' && (
            <div className="flex items-center justify-between gap-3 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-700">
                    Waiting for probes to get wet
                  </p>
                  <p className="text-xs text-amber-600/80">
                    Keep probes in water. Auto-capture runs every{' '}
                    {(WET_POLL_INTERVAL_MS / 1000).toFixed(1)}s.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={cancelWaitingForWet}>
                Cancel
              </Button>
            </div>
          )}

          {/* --- Measurement results --- */}
          {measurement && (
            <div className="space-y-4">
              {/* Core values hero cards */}
              <div className="grid grid-cols-2 gap-3">
                <CoreValueCard
                  icon={Thermometer}
                  label="Temperature"
                  value={measurement.temperature.toFixed(1)}
                  unit="deg C"
                  accent="bg-orange-500/10 text-orange-600"
                />
                <CoreValueCard
                  icon={Droplets}
                  label="pH"
                  value={measurement.ph.toFixed(2)}
                  unit="dimensionless"
                  accent="bg-blue-500/10 text-blue-600"
                />
              </div>

              {/* Parameters table */}
              <div className="rounded-[6px] border border-border">
                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5">
                  <p className="scientific-label">Parameters ({measurement.parameters.length})</p>
                  <button
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showRawJson ? 'Table view' : 'Raw JSON'}
                  </button>
                </div>

                {showRawJson ? (
                  <pre className="max-h-72 overflow-auto p-4 font-mono text-xs leading-relaxed">
                    {JSON.stringify(measurement, null, 2)}
                  </pre>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Code
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Parameter
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Value
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Unit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {measurement.parameters.map((param, idx) => (
                          <tr
                            key={param.parameterCode + idx}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
                          >
                            <td className="px-4 py-2.5">
                              <span className="inline-flex rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-medium text-primary">
                                {param.parameterCode}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-foreground">
                              {param.parameterName || param.parameterCode}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">
                              {typeof param.value === 'number'
                                ? param.value.toLocaleString()
                                : param.value}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {param.unit || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Import actions */}
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => void importMeasurement()} disabled={busy}>
                  {busy ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} strokeWidth={1.5} />
                  )}
                  Save measurement
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to dashboard
                </Button>
              </div>

              {/* Success state */}
              {createdMeasurementId && (
                <div className="flex items-center gap-2 rounded-[6px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-600" />
                  <p className="text-sm text-emerald-700">
                    Measurement saved — ID:{' '}
                    <span className="font-mono">{createdMeasurementId}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error banner */}
          {message && (
            <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">{message}</p>
            </div>
          )}
        </div>
      ) : null}

      {selectedMethod === 'map' ? (
        <PlaceholderPanel
          title="GemStat Map"
          description="Select a station from the map and continue with dataset import."
        />
      ) : null}
      {selectedMethod === 'csv' ? (
        <div className="max-w-2xl rounded-[6px] border border-border bg-card p-4 md:p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold">Import CSV</h2>
            <p className="text-sm text-muted-foreground">
              Temperature and pH are required. Other parameters are optional.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="scientific-label mb-1 block">
                CSV File <span className="text-destructive">*</span>
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setCsvFile(file)
                }}
                className="block w-full cursor-pointer rounded-[6px] border border-input bg-surface-elevated px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-[6px] file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-secondary/80"
                disabled={csvBusy}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Accepted format: .csv (headers can include aliases supported by backend parser).
              </p>
            </div>

            <div>
              <label className="scientific-label mb-1 block">Measurement Label (optional)</label>
              <input
                value={csvLabel}
                onChange={(event) => setCsvLabel(event.target.value)}
                placeholder="e.g. River Station Alpha"
                className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={csvBusy}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => void importCsvMeasurement()} disabled={csvBusy || !csvFile}>
              {csvBusy ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              Import CSV
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} disabled={csvBusy}>
              Cancel
            </Button>
          </div>

          {csvError ? (
            <div className="mt-4 rounded-[6px] border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">{csvError}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
