export const APP_NAME = 'Qlean'
export const TAGLINE = 'Water Quality Analysis Platform'

// Keep these URLs stable. On each release, upload/replace the files at the same paths
// (e.g. https://your-domain.com/downloads/qlean-setup.exe).
export const WINDOWS_DOWNLOAD_URL =
  import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || '/downloads/qlean-setup.exe'

export const LINUX_DOWNLOAD_URL =
  import.meta.env.VITE_LINUX_DOWNLOAD_URL || '/downloads/client-latest.AppImage'

