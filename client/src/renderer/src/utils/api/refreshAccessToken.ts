import { getAccessToken } from './authTokenStore'

/**
 * Refresh access token infrastructure.
 *
 * For now this is a no-op that returns the currently stored token.
 * Later, this can call a dedicated refresh endpoint and update the token store.
 */
export const refreshAccessToken = async (): Promise<string> => {
  const token = getAccessToken()
  if (!token) {
    throw new Error('Missing access token. Authenticate first.')
  }
  return token
}
