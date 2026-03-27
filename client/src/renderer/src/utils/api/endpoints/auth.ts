import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import { clearAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../authTokenStore'
import { type AuthResponse, type LoginRequest, type SignupRequest } from '../types'

type RawAuthResponse = Partial<AuthResponse> & {
  access?: string
  refresh?: string
}

const parseAuthResponse = async (response: Response): Promise<AuthResponse> => {
  const raw = (await response.json()) as RawAuthResponse
  const token = raw.token ?? raw.access
  const refreshToken = raw.refreshToken ?? raw.refresh

  if (!token || !refreshToken || !raw.user) {
    throw new Error('Unexpected auth response shape')
  }

  return {
    token,
    refreshToken,
    user: raw.user,
  }
}

export const login = async (request: LoginRequest): Promise<AuthResponse> => {
  const response = await makeAuthenticatedReq<LoginRequest, AuthResponse>({
    method: 'POST',
    path: '/api/auth/login/',
    body: request,
    authRequired: false,
    parseResponse: parseAuthResponse,
    suppressErrorToast: true,
  })

  setAccessToken(response.token)
  setRefreshToken(response.refreshToken)
  return response
}

export const signup = async (request: SignupRequest): Promise<AuthResponse> => {
  const response = await makeAuthenticatedReq<SignupRequest, AuthResponse>({
    method: 'POST',
    path: '/api/auth/signup/',
    body: request,
    authRequired: false,
    parseResponse: parseAuthResponse,
    suppressErrorToast: true,
  })

  setAccessToken(response.token)
  setRefreshToken(response.refreshToken)
  return response
}
export const logout = async (): Promise<void> => {
  const refresh = getRefreshToken()
  await makeAuthenticatedReq<{ refresh: string }, { success?: boolean }>({
    method: 'POST',
    path: '/api/auth/logout/',
    body: { refresh: refresh ?? '' },
    authRequired: true,
  })
  clearAccessToken()
}
