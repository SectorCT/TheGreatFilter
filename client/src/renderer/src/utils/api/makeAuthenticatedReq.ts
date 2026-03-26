import { apiUrl } from './config'
import { refreshAccessToken } from './refreshAccessToken'

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

export type MakeAuthenticatedReqArgs<Req, Res> = {
  method: 'GET' | 'POST'
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
   * Returned when the server responds with 404 (in development).
   * Must match `Res` to keep full type safety.
   */
  fake404: Res | (() => Res)
}

const defaultParseJson = async <Res>(response: Response): Promise<Res> => {
  // Some backends return empty bodies for 204/etc. Those endpoints aren't in the contract yet.
  const data = (await response.json()) as Res | JsonValue
  return data as Res
}

const isDevMode = (): boolean => {
  // Vite provides `import.meta.env.DEV` as a boolean.
  return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV)
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

export const makeAuthenticatedReq = async <Req, Res>(
  args: MakeAuthenticatedReqArgs<Req, Res>,
): Promise<Res> => {
  const {
    method,
    path,
    query,
    body,
    authRequired = true,
    parseResponse = defaultParseJson<Res>,
    fake404,
  } = args

  const url = `${apiUrl(path)}${buildQuery(query)}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (authRequired) {
    const token = await refreshAccessToken()
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 404) {
    if (isDevMode()) {
      console.warn(
        '[DEV] API returned 404; using fake response.',
        JSON.stringify({ method, path, query }),
      )
      return typeof fake404 === 'function' ? (fake404 as () => Res)() : fake404
    }
    throw new ApiError(`Request failed with 404: ${method} ${path}`, 404)
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => undefined)
    throw new ApiError(`Request failed: ${method} ${path}`, response.status, bodyText)
  }

  return parseResponse(response)
}

