import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { ReadlineParser, SerialPort } from 'serialport'
import icon from '../../resources/icon.png?asset'

const SERIAL_BAUD_RATE = 115200
const READ_TIMEOUT_MS = 1200
const RETRY_COUNT = 1

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

class LabEquipmentService {
  private port: SerialPort | null = null
  private parser: ReadlineParser | null = null
  private selectedPath: string | null = null

  async listPorts(): Promise<string[]> {
    const ports = await SerialPort.list()
    return ports.map((port) => port.path)
  }

  async connect(portPath: string): Promise<void> {
    await this.disconnect()
    this.port = new SerialPort({
      path: portPath,
      baudRate: SERIAL_BAUD_RATE,
      autoOpen: false
    })
    await new Promise<void>((resolve, reject) => {
      this.port?.open((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })

    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }))
    this.selectedPath = portPath
  }

  async disconnect(): Promise<void> {
    if (!this.port) return

    const currentPort = this.port
    this.port = null
    this.parser = null
    this.selectedPath = null

    await new Promise<void>((resolve) => {
      if (!currentPort.isOpen) {
        resolve()
        return
      }
      currentPort.close(() => resolve())
    })
  }

  getConnectionState(): { connected: boolean; portPath: string | null } {
    return {
      connected: Boolean(this.port?.isOpen),
      portPath: this.selectedPath
    }
  }

  async readMeasurement(): Promise<DeviceMeasurementResponse> {
    if (!this.port || !this.parser || !this.port.isOpen) {
      throw new Error('Device is not connected')
    }

    const requestId = crypto.randomUUID()
    const requestLine = JSON.stringify({ cmd: 'READ_MEASUREMENT', requestId }) + '\n'

    for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
      await this.writeLine(requestLine)
      const response = await this.waitForResponse(requestId, READ_TIMEOUT_MS)
      if (response) {
        return response
      }
    }

    throw new Error('Timeout waiting for device response')
  }

  private async writeLine(line: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.port?.write(line, (error) => {
        if (error) {
          reject(error)
          return
        }
        this.port?.drain((drainError) => {
          if (drainError) {
            reject(drainError)
            return
          }
          resolve()
        })
      })
    })
  }

  private async waitForResponse(
    requestId: string,
    timeoutMs: number
  ): Promise<DeviceMeasurementResponse | null> {
    return await new Promise<DeviceMeasurementResponse | null>((resolve) => {
      if (!this.parser) {
        resolve(null)
        return
      }

      let timeout: NodeJS.Timeout | null = null
      const onData = (rawLine: string): void => {
        const line = rawLine.trim()
        if (!line.startsWith('{')) {
          return
        }

        try {
          const message = JSON.parse(line) as
            | DeviceMeasurementResponse
            | { type: 'ACK'; requestId: string }
          if (message.requestId !== requestId) {
            return
          }
          if (message.type === 'ACK') {
            return
          }
          if (message.type === 'MEASUREMENT') {
            cleanup()
            resolve(message)
          }
        } catch {
          // Ignore non-JSON telemetry lines from firmware.
        }
      }

      const cleanup = (): void => {
        if (timeout) clearTimeout(timeout)
        this.parser?.off('data', onData)
      }

      timeout = setTimeout(() => {
        cleanup()
        resolve(null)
      }, timeoutMs)

      this.parser.on('data', onData)
    })
  }
}

const labEquipmentService = new LabEquipmentService()

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('lab:listPorts', async () => await labEquipmentService.listPorts())
  ipcMain.handle('lab:connect', async (_, portPath: string) => {
    await labEquipmentService.connect(portPath)
    return labEquipmentService.getConnectionState()
  })
  ipcMain.handle('lab:disconnect', async () => {
    await labEquipmentService.disconnect()
    return labEquipmentService.getConnectionState()
  })
  ipcMain.handle('lab:state', () => labEquipmentService.getConnectionState())
  ipcMain.handle('lab:readMeasurement', async () => await labEquipmentService.readMeasurement())

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await labEquipmentService.disconnect()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
