import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface DesktopApi {
    window: {
      minimize: () => Promise<void>
      toggleMaximize: () => Promise<boolean>
      close: () => Promise<void>
    }
  }

  interface Window {
    electron: ElectronAPI
    api: DesktopApi
  }
}
