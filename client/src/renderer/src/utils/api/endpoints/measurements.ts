import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
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
