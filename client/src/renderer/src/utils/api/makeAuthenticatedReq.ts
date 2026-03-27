import { toast } from 'sonner'
import { apiUrl } from './config'
import { refreshAccessToken } from './refreshAccessToken'
import { clearAccessToken } from './authTokenStore'

export class ApiError extends Error {
  public readonly status: number

  public readonly responseBodyText?: string

  constructor(message: string, status: number, responseBodyText?: string) {
    super(message)
    this.status = status
    this.responseBodyText = responseBodyText
  }
}

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null

type QueryValue = string | number | boolean | undefined | null

export function formatApiErrorToastMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const raw = error.responseBodyText?.trim()
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { message?: unknown; detail?: unknown; errors?: unknown }
        const msg = typeof parsed.message === 'string' ? parsed.message.trim() : ''
        const detail = typeof parsed.detail === 'string' ? parsed.detail.trim() : ''
        if (msg) return msg
        if (detail) return detail
      } catch {
        if (raw.length > 0 && raw.length < 400) return raw
      }
    }
    if (error.status === 404) return 'Resource not found.'
    return error.message.trim() || 'Request failed'
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  return 'Something went wrong'
}

export type MakeAuthenticatedReqArgs<Req, Res> = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string // e.g. '/auth/login'
  query?: Record<string, QueryValue>
  body?: Req
  authRequired?: boolean
  /**
   * Converts the fetch Response into the expected return type.
   * (For JSON APIs, use the default parser.)
   */
  parseResponse?: (response: Response) => Promise<Res>
  /**
   * When true, failed requests still throw but do not open a toast
   * (e.g. login/signup forms show inline errors).
   */
  suppressErrorToast?: boolean
}

const defaultParseJson = async <Res>(response: Response): Promise<Res> => {
  // Some backends return empty bodies for 204/etc. Those endpoints aren't in the contract yet.
  const data = (await response.json()) as Res | JsonValue
  return data as Res
}

const buildQuery = (query: Record<string, QueryValue> | undefined): string => {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    params.set(key, String(value))
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

const shouldForceLogoutFromUnauthorized = (status: number, bodyText?: string): boolean => {
  if (status !== 401 || !bodyText) return false
  return (
    bodyText.includes('Given token not valid for any token type') ||
    bodyText.includes('token_not_valid') ||
    bodyText.includes('Token is invalid or expired')
  )
}

const forceLogoutAndRedirectToLogin = (): void => {
  clearAccessToken()
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/') return
  window.location.assign('/')
}

export const makeAuthenticatedReq = async <Req, Res>(
  args: MakeAuthenticatedReqArgs<Req, Res>
): Promise<Res> => {
  const {
    method,
    path,
    query,
    body,
    authRequired = true,
    parseResponse = defaultParseJson<Res>,
    suppressErrorToast = false
  } = args

  const url = `${apiUrl(path)}${buildQuery(query)}`

  const headers: Record<string, string> = {
    Accept: 'application/json'
  }

  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData

  if (body !== undefined && !isFormDataBody) {
    headers['Content-Type'] = 'application/json'
  }

  if (authRequired) {
    try {
      const token = await refreshAccessToken()
      headers.Authorization = `Bearer ${token}`
    } catch (tokenError) {
      if (!suppressErrorToast) {
        toast.error(formatApiErrorToastMessage(tokenError))
      }
      throw tokenError
    }
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        body !== undefined ? (isFormDataBody ? (body as BodyInit) : JSON.stringify(body)) : undefined
    })
  } catch (networkError) {
    if (!suppressErrorToast) {
      toast.error(
        networkError instanceof Error && networkError.message
          ? networkError.message
          : 'Network request failed'
      )
    }
    throw networkError
  }

  const fail = async (bodyText: string | undefined): Promise<never> => {
    const err = new ApiError(`Request failed: ${method} ${path}`, response.status, bodyText)
    if (!suppressErrorToast) {
      toast.error(formatApiErrorToastMessage(err))
    }
    throw err
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => undefined)
    if (authRequired && shouldForceLogoutFromUnauthorized(response.status, bodyText)) {
      forceLogoutAndRedirectToLogin()
    }
    await fail(bodyText)
  }

  try {
    return await parseResponse(response)
  } catch (parseError) {
    if (!suppressErrorToast) {
      toast.error(formatApiErrorToastMessage(parseError))
    }
    throw parseError
  }
}
