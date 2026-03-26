import { ElectronAPI } from '@electron-toolkit/preload'

type DeviceStatus = 'WET' | 'DRY'

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

type DeviceMeasurementResponse = {
  type: 'MEASUREMENT'
  requestId: string
  status: DeviceStatus
  reason?: string
  measurement?: MeasurementPayload
}

type DeviceConnectionState = {
  connected: boolean
  portPath: string | null
}

type LabApi = {
  listPorts: () => Promise<string[]>
  connectDevice: (portPath: string) => Promise<DeviceConnectionState>
  disconnectDevice: () => Promise<DeviceConnectionState>
  getDeviceState: () => Promise<DeviceConnectionState>
  readMeasurement: () => Promise<DeviceMeasurementResponse>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api?: LabApi
    labApi?: LabApi
  }
}
