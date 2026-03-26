const ACCESS_TOKEN_KEY = 'tgif_access_token'

let inMemoryAccessToken: string | null = null

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

export const getAccessToken = (): string | null => {
  if (inMemoryAccessToken) return inMemoryAccessToken
  const token = safeGetLocalStorage()?.getItem(ACCESS_TOKEN_KEY)
  inMemoryAccessToken = token ?? null
  return inMemoryAccessToken
}

export const clearAccessToken = (): void => {
  inMemoryAccessToken = null
  safeGetLocalStorage()?.removeItem(ACCESS_TOKEN_KEY)
}
