const ACCESS_TOKEN_KEY = 'tgif_access_token'
const REFRESH_TOKEN_KEY = 'tgif_refresh_token'

let inMemoryAccessToken: string | null = null
let inMemoryRefreshToken: string | null = null

const safeGetLocalStorage = (): Storage | null => {
  try {
    return localStorage
  } catch {
    return null
  }
}

export const setAccessToken = (token: string): void => {
  inMemoryAccessToken = token
  safeGetLocalStorage()?.setItem(ACCESS_TOKEN_KEY, token)
}

export const setRefreshToken = (token: string): void => {
  inMemoryRefreshToken = token
  safeGetLocalStorage()?.setItem(REFRESH_TOKEN_KEY, token)
}

export const getAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken
  const token = safeGetLocalStorage()?.getItem(ACCESS_TOKEN_KEY)
  inMemoryAccessToken = token ?? null
  return inMemoryAccessToken
}

export const getRefreshToken = (): string | null => {
  if (inMemoryRefreshToken) return inMemoryRefreshToken
  const token = safeGetLocalStorage()?.getItem(REFRESH_TOKEN_KEY)
  inMemoryRefreshToken = token ?? null
  return inMemoryRefreshToken
}

export const clearAccessToken = (): void => {
  inMemoryAccessToken = null
  safeGetLocalStorage()?.removeItem(ACCESS_TOKEN_KEY)
  inMemoryRefreshToken = null
  safeGetLocalStorage()?.removeItem(REFRESH_TOKEN_KEY)
}
