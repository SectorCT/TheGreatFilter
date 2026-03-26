import { apiUrl } from '../config'
import { ApiError, makeAuthenticatedReq } from '../makeAuthenticatedReq'
import { refreshAccessToken } from '../refreshAccessToken'
import { type MeasurementCreateRequest, type MeasurementCreateResponse } from '../types'

export const createMeasurement = async (
  request: MeasurementCreateRequest
): Promise<MeasurementCreateResponse> => {
  return makeAuthenticatedReq<MeasurementCreateRequest, MeasurementCreateResponse>({
    method: 'POST',
    path: '/measurements',
    body: request,
    authRequired: true,
    fake404: () => ({
      measurementId: `fake-measurement-${Date.now()}`
    })
  })
}

export type ImportMeasurementCsvRequest = {
  file: File
  name?: string
}

export const importMeasurementCsv = async (
  request: ImportMeasurementCsvRequest
): Promise<MeasurementCreateResponse> => {
  const token = await refreshAccessToken()
  const formData = new FormData()
  formData.set('file', request.file)
  if (request.name?.trim()) {
    formData.set('name', request.name.trim())
  }

  const response = await fetch(apiUrl('/measurements/import/csv/'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: formData
  })

  if (response.status === 404 && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    return { measurementId: `fake-measurement-${Date.now()}` }
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => undefined)
    throw new ApiError('Request failed: POST /measurements/import/csv/', response.status, bodyText)
  }

  return (await response.json()) as MeasurementCreateResponse
}
