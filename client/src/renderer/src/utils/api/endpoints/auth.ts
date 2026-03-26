import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import { clearAccessToken, setAccessToken, setRefreshToken } from '../authTokenStore'
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
    fake404: () => ({
      token: 'fake-dev-access-token',
      refreshToken: 'fake-dev-refresh-token',
      user: {
        userId: 1,
        username: 'fake-user',
        email: request.email,
        full_name: 'Fake User',
        organization_name: '',
        role_title: '',
        country: '',
        dateJoined: new Date().toISOString()
      }
    })
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
    fake404: () => ({
      token: 'fake-dev-access-token',
      refreshToken: 'fake-dev-refresh-token',
      user: {
        userId: 1,
        username: 'fake-user',
        email: request.email,
        full_name: request.full_name ?? '',
        organization_name: request.organization_name ?? '',
        role_title: request.role_title ?? '',
        country: request.country ?? '',
        dateJoined: new Date().toISOString()
      }
    })
  })

  setAccessToken(response.token)
  setRefreshToken(response.refreshToken)
  return response
}

export const logout = async (): Promise<void> => {
  await makeAuthenticatedReq<undefined, { success?: boolean }>({
    method: 'POST',
    path: '/api/auth/logout/',
    authRequired: true,
    fake404: { success: true }
  })
  clearAccessToken()
}
