const joinUrl = (baseUrl: string, path: string): string => {
  if (!baseUrl) return path
  const trimmedBase = baseUrl.replace(/\/+$/, '')
  const trimmedPath = path.startsWith('/') ? path : `/${path}`
  return `${trimmedBase}${trimmedPath}`
}

export const API_BASE_URL: string =
  // Vite exposes env vars as `import.meta.env.VITE_*`.
  (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? ''

export const apiUrl = (path: string): string => joinUrl(API_BASE_URL, path)

