import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type Measurement,
  type MeasurementCreateRequest,
  type MeasurementCreateResponse,
  type MeasurementListResponse,
  type MeasurementMapResponse
} from '../types'

export const createMeasurement = async (
  request: MeasurementCreateRequest
): Promise<MeasurementCreateResponse> => {
  return makeAuthenticatedReq<MeasurementCreateRequest, MeasurementCreateResponse>({
    method: 'POST',
    path: '/api/measurements/',
    body: request,
    authRequired: true,
    fake404: () => ({
      measurementId: `fake-measurement-${Date.now()}`
    })
  })
}

export const getMeasurements = async (): Promise<MeasurementListResponse> => {
  return makeAuthenticatedReq<undefined, MeasurementListResponse>({
    method: 'GET',
    path: '/api/measurements/',
    authRequired: true,
    fake404: { results: [], count: 0 }
  })
}

export const getMeasurementById = async (measurementId: string): Promise<Measurement> => {
  return makeAuthenticatedReq<undefined, Measurement>({
    method: 'GET',
    path: `/api/measurements/${measurementId}/`,
    authRequired: true,
    fake404: {
      measurementId,
      source: 'manual',
      createdAt: new Date().toISOString(),
      temperature: 22.1,
      ph: 7.3,
      parameters: []
    }
  })
}

export const getMeasurementsMap = async (): Promise<MeasurementMapResponse> => {
  return makeAuthenticatedReq<undefined, MeasurementMapResponse>({
    method: 'GET',
    path: '/api/measurements/map/',
    authRequired: true,
    fake404: { results: [], count: 0 }
  })
}

export type ImportMeasurementCsvRequest = {
  file: File
  name?: string
}

export const importMeasurementCsv = async (
  request: ImportMeasurementCsvRequest
): Promise<MeasurementCreateResponse> => {
  const formData = new FormData()
  formData.append('file', request.file)
  if (request.name?.trim()) {
    formData.append('name', request.name.trim())
  }

  return makeAuthenticatedReq<FormData, MeasurementCreateResponse>({
    method: 'POST',
    path: '/api/measurements/import/csv/',
    body: formData,
    authRequired: true,
    fake404: { measurementId: `fake-measurement-${Date.now()}` }
  })
}
