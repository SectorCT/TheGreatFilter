import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import { setAccessToken } from '../authTokenStore'
import { type AuthResponse, type LoginRequest, type SignupRequest } from '../types'

export const login = async (request: LoginRequest): Promise<AuthResponse> => {
  const response = await makeAuthenticatedReq<LoginRequest, AuthResponse>({
    method: 'POST',
    path: '/auth/login',
    body: request,
    authRequired: false,
    fake404: () => ({
      token: 'fake-dev-access-token',
      user: { userId: 'fake-user-id', email: request.email }
    })
  })

  setAccessToken(response.token)
  return response
}

export const signup = async (request: SignupRequest): Promise<AuthResponse> => {
  const response = await makeAuthenticatedReq<SignupRequest, AuthResponse>({
    method: 'POST',
    path: '/auth/signup',
    body: request,
    authRequired: false,
    fake404: () => ({
      token: 'fake-dev-access-token',
      user: { userId: 'fake-user-id', email: request.email }
    })
  })

  setAccessToken(response.token)
  return response
}
