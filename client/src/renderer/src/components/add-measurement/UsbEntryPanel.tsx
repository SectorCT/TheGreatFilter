import {
  CheckCircle2,
  ChevronDown,
  Droplets,
  Loader2,
  RefreshCw,
  Save,
  Thermometer,
  Usb,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import { createMeasurement } from '@renderer/utils/api'

type UsbStatus =
  | 'idle'
  | 'connected'
  | 'reading'
  | 'waiting_wet'
  | 'dry'
  | 'measurement'
  | 'imported'
  | 'error'

type DeviceMeasurementPayload = {
  source: 'lab_equipment'
  temperature: number
  ph: number
  parameters: Array<{
    file?: string
    parameterCode: string
    parameterName?: string
    unit?: string
    value: number
  }>
}

function ConnectionDot({ status }: { status: UsbStatus }): React.JSX.Element {
  const isConnected = status !== 'idle' && status !== 'error'
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        isConnected
          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
          : 'bg-muted-foreground/40',
      )}
    />
  )
}

function CoreValueCard({
  label,
  value,
  unit,
  accent,
  icon,
}: {
  label: string
  value: string
  unit: string
  accent: string
  icon: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-[6px] border border-border bg-card p-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', accent)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="scientific-label">{label}</p>
        <p className="font-mono text-lg font-semibold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{unit}</p>
      </div>
    </div>
  )
}

export function UsbEntryPanel({ onBack }: { onBack: () => void }): React.JSX.Element {
  const WET_POLL_INTERVAL_MS = 300
  const [ports, setPorts] = useState<string[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [usbStatus, setUsbStatus] = useState<UsbStatus>('idle')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [measurement, setMeasurement] = useState<DeviceMeasurementPayload | null>(null)
  const [createdMeasurementId, setCreatedMeasurementId] = useState('')
  const [showRawJson, setShowRawJson] = useState(false)
  const stopWaitingForWetRef = useRef(false)

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
      setSelectedPort(availablePorts[0] ?? '')
    }
  }, [labApi, selectedPort])

  useEffect(() => {
    if (!labApi) return
    void refreshPorts()
  }, [labApi, refreshPorts])

  useEffect(() => {
    return () => {
      stopWaitingForWetRef.current = true
    }
  }, [])

  const connectDevice = async (): Promise<void> => {
    if (!labApi) return
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

  const disconnectDevice = async (): Promise<void> => {
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

  const requestMeasurement = async (): Promise<void> => {
    if (!labApi) return
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
        if (!result.measurement) throw new Error('Device returned WET without measurement payload.')
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

  const importMeasurement = async (): Promise<void> => {
    if (!measurement) return
    setBusy(true)
    setMessage('')
    try {
      const now = new Date()
      const result = await createMeasurement({
        source: measurement.source,
        sampleDate: now.toISOString().slice(0, 10),
        sampleTime: now.toTimeString().slice(0, 8),
        temperature: measurement.temperature,
        ph: measurement.ph,
        parameters: measurement.parameters,
      })
      setCreatedMeasurementId(result.measurementId)
      setUsbStatus('imported')
    } catch (error) {
      setUsbStatus('error')
      setMessage(`Import failed: ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full space-y-5">
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
              {ports.length === 0 ? <option value="">No serial ports found</option> : null}
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
            onClick={() => {
              void refreshPorts()
            }}
            disabled={busy || isConnected}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-input bg-surface-elevated transition-colors hover:bg-secondary disabled:opacity-40"
            title="Refresh ports"
          >
            <RefreshCw size={14} strokeWidth={1.5} />
          </button>
        </div>
        <div className="mt-3">
          {!isConnected ? (
            <Button className="w-full" onClick={() => void connectDevice()} disabled={busy || !selectedPort}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Usb size={14} strokeWidth={1.5} />}
              Connect device
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-[6px] border border-emerald-600/30 bg-emerald-500/10 px-4 py-2">
                <CheckCircle2 size={14} strokeWidth={1.5} className="shrink-0 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Connected — {selectedPort}</span>
              </div>
              <Button variant="destructive" size="sm" onClick={() => void disconnectDevice()} disabled={busy}>
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </div>

      <Button size="lg" className="w-full text-base" onClick={() => void requestMeasurement()} disabled={busy || !isConnected}>
        {usbStatus === 'reading' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} strokeWidth={1.5} />}
        {usbStatus === 'reading' ? 'Reading from device...' : 'Request Measurement'}
      </Button>

      {usbStatus === 'dry' ? (
        <div className="flex items-center gap-3 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <Droplets size={18} strokeWidth={1.5} className="shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-700">Probes are dry</p>
            <p className="text-xs text-amber-600/80">
              Place probes in water and press Request Measurement again.
            </p>
          </div>
        </div>
      ) : null}

      {usbStatus === 'waiting_wet' ? (
        <div className="flex items-center justify-between gap-3 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-700">Waiting for probes to get wet</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => {
            stopWaitingForWetRef.current = true
            setUsbStatus('connected')
            setBusy(false)
          }}>
            Cancel
          </Button>
        </div>
      ) : null}

      {measurement ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <CoreValueCard
              icon={<Thermometer size={18} strokeWidth={1.5} />}
              label="Temperature"
              value={measurement.temperature.toFixed(1)}
              unit="deg C"
              accent="bg-orange-500/10 text-orange-600"
            />
            <CoreValueCard
              icon={<Droplets size={18} strokeWidth={1.5} />}
              label="pH"
              value={measurement.ph.toFixed(2)}
              unit="dimensionless"
              accent="bg-blue-500/10 text-blue-600"
            />
          </div>
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
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void importMeasurement()} disabled={busy}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={1.5} />}
              Save measurement
            </Button>
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          </div>
          {createdMeasurementId ? (
            <div className="flex items-center gap-2 rounded-[6px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <CheckCircle2 size={16} strokeWidth={1.5} className="text-emerald-600" />
              <p className="text-sm text-emerald-700">
                Measurement saved — ID: <span className="font-mono">{createdMeasurementId}</span>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-[6px] border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{message}</p>
        </div>
      ) : null}
    </div>
  )
}
