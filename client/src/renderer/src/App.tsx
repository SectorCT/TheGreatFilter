import { useCallback, useEffect, useMemo, useState } from 'react'

type ImportState =
  | 'waiting_device'
  | 'connected'
  | 'reading'
  | 'dry'
  | 'wet_received'
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
const API_UNAVAILABLE_MESSAGE =
  'Device API unavailable. Ensure the app is launched in Electron and preload is loaded.'
const BACKEND_UNREACHABLE_MESSAGE = `Could not reach backend at ${API_BASE_URL}. Device read can still work; start backend before importing.`

function App(): React.JSX.Element {
  const [ports, setPorts] = useState<string[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [status, setStatus] = useState<ImportState>('waiting_device')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [measurement, setMeasurement] = useState<MeasurementPayload | null>(null)
  const [createdMeasurementId, setCreatedMeasurementId] = useState<string>('')
  const [busy, setBusy] = useState<boolean>(false)

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'waiting_device':
        return 'Waiting for device'
      case 'connected':
        return 'Connected'
      case 'reading':
        return 'Reading data'
      case 'dry':
        return 'Probes are dry'
      case 'wet_received':
        return 'Measurement received'
      case 'imported':
        return 'Import completed'
      case 'error':
        return 'Import error'
      default:
        return status
    }
  }, [status])

  const getLabApi = useCallback(() => {
    const api = window.labApi ?? window.api
    if (!api) {
      setStatus('error')
      setErrorMessage(API_UNAVAILABLE_MESSAGE)
      return null
    }
    return api
  }, [])

  const refreshPorts = useCallback(async (): Promise<void> => {
    const api = getLabApi()
    if (!api) return
    const availablePorts = await api.listPorts()
    setPorts(availablePorts)
    if (!selectedPort && availablePorts.length > 0) {
      setSelectedPort(availablePorts[0])
    }
  }, [getLabApi, selectedPort])

  useEffect(() => {
    const api = getLabApi()
    if (!api) return

    void refreshPorts()
    void api.getDeviceState().then((state) => {
      if (state.connected) {
        setStatus('connected')
      }
    })
  }, [getLabApi, refreshPorts])

  const connectDevice = async (): Promise<void> => {
    if (!selectedPort) {
      setErrorMessage('Select a serial port first.')
      setStatus('error')
      return
    }

    setBusy(true)
    setErrorMessage('')
    try {
      const api = getLabApi()
      if (!api) return
      await api.connectDevice(selectedPort)
      setStatus('connected')
    } catch (error) {
      setStatus('error')
      setErrorMessage(`Connection failed: ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  const disconnectDevice = async (): Promise<void> => {
    setBusy(true)
    setErrorMessage('')
    try {
      const api = getLabApi()
      if (!api) return
      await api.disconnectDevice()
      setStatus('waiting_device')
    } catch (error) {
      setStatus('error')
      setErrorMessage(`Read failed: ${String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  const readMeasurement = async (): Promise<void> => {
    setBusy(true)
    setErrorMessage('')
    setCreatedMeasurementId('')
    setStatus('reading')
    try {
      const api = getLabApi()
      if (!api) return
      const result = await api.readMeasurement()
      if (result.status === 'DRY') {
        setStatus('dry')
        setMeasurement(null)
        return
      }
      if (!result.measurement) {
        throw new Error('Device returned WET status without measurement payload.')
      }
      setMeasurement(result.measurement)
      setStatus('wet_received')
    } catch (error) {
      setStatus('error')
      if (error instanceof TypeError) {
        setErrorMessage(BACKEND_UNREACHABLE_MESSAGE)
      } else {
        setErrorMessage(`Import failed: ${String(error)}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const importMeasurement = async (): Promise<void> => {
    if (!measurement) return

    setBusy(true)
    setErrorMessage('')
    try {
      validateMeasurement(measurement)
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
      setStatus('imported')
    } catch (error) {
      setStatus('error')
      setErrorMessage(String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="lab-layout">
      <h1>Lab Equipment Import</h1>
      <p className="muted">Status: {statusLabel}</p>
      <p className="muted">API base URL: {API_BASE_URL}</p>

      <section className="card">
        <h2>1) Connection</h2>
        <div className="row">
          <button disabled={busy} onClick={() => void refreshPorts()} type="button">
            Refresh ports
          </button>
          <select
            disabled={busy || ports.length === 0}
            onChange={(event) => setSelectedPort(event.target.value)}
            value={selectedPort}
          >
            {ports.length === 0 && <option value="">No serial ports found</option>}
            {ports.map((port) => (
              <option key={port} value={port}>
                {port}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <button
            disabled={busy || !selectedPort}
            onClick={() => void connectDevice()}
            type="button"
          >
            Connect
          </button>
          <button disabled={busy} onClick={() => void disconnectDevice()} type="button">
            Disconnect
          </button>
        </div>
      </section>

      <section className="card">
        <h2>2) Request reading</h2>
        <button
          disabled={busy || status === 'waiting_device'}
          onClick={() => void readMeasurement()}
          type="button"
        >
          Request measurement
        </button>
        {status === 'dry' && (
          <p className="warn">Probes are dry. Put probes into water and retry.</p>
        )}
      </section>

      <section className="card">
        <h2>3) Preview</h2>
        {!measurement && <p className="muted">No measurement received yet.</p>}
        {measurement && (
          <>
            <p>Temperature: {measurement.temperature.toFixed(1)} deg C</p>
            <p>pH: {measurement.ph.toFixed(2)}</p>
            <p>Parameters: {measurement.parameters.length}</p>
            <pre>{JSON.stringify(measurement, null, 2)}</pre>
          </>
        )}
      </section>

      <section className="card">
        <h2>4) Save to backend</h2>
        <button
          disabled={busy || !measurement}
          onClick={() => void importMeasurement()}
          type="button"
        >
          Import measurement
        </button>
        {createdMeasurementId && (
          <p className="success">Created measurementId: {createdMeasurementId}</p>
        )}
      </section>

      {errorMessage && <p className="error">{errorMessage}</p>}
    </main>
  )
}

function validateMeasurement(measurement: MeasurementPayload): void {
  if (!Number.isFinite(measurement.temperature)) {
    throw new Error('Invalid temperature')
  }
  if (!Number.isFinite(measurement.ph)) {
    throw new Error('Invalid pH')
  }

  for (const parameter of measurement.parameters) {
    if (!parameter.parameterCode) {
      throw new Error('Missing parameterCode in parameters item')
    }
    if (!Number.isFinite(parameter.value)) {
      throw new Error(`Invalid value for parameterCode ${parameter.parameterCode}`)
    }
  }
}

export default App
