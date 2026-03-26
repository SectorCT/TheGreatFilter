import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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

const api = {
  listPorts: (): Promise<string[]> => electronAPI.ipcRenderer.invoke('lab:listPorts'),
  connectDevice: (portPath: string): Promise<DeviceConnectionState> =>
    electronAPI.ipcRenderer.invoke('lab:connect', portPath),
  disconnectDevice: (): Promise<DeviceConnectionState> =>
    electronAPI.ipcRenderer.invoke('lab:disconnect'),
  getDeviceState: (): Promise<DeviceConnectionState> => electronAPI.ipcRenderer.invoke('lab:state'),
  readMeasurement: (): Promise<DeviceMeasurementResponse> =>
    electronAPI.ipcRenderer.invoke('lab:readMeasurement')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('labApi', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.labApi = api
}
