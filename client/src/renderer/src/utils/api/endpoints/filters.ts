import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type FilterDetailsSuccessResponse,
  type FilterStatusRefreshResponse,
  type GenerateFilterRequest,
  type GenerateFilterResponse
} from '../types'

export const generateFilter = async (
  request: GenerateFilterRequest
): Promise<GenerateFilterResponse> => {
  return makeAuthenticatedReq<GenerateFilterRequest, GenerateFilterResponse>({
    method: 'POST',
    path: '/api/filters/generate/',
    body: request,
    authRequired: true,
    fake404: () => ({
      filterId: `fake-filter-${Date.now()}`,
      status: 'Pending'
    })
  })
}

export const getFilterStatus = async (filterId: string): Promise<FilterStatusRefreshResponse> => {
  return makeAuthenticatedReq<undefined, FilterStatusRefreshResponse>({
    method: 'GET',
    path: `/api/filters/${filterId}/status/`,
    authRequired: true,
    fake404: () => ({
      filterId,
      status: 'Generating',
      updatedAt: new Date().toISOString()
    })
  })
}

export const getFilterDetails = async (filterId: string): Promise<FilterDetailsSuccessResponse> => {
  return makeAuthenticatedReq<undefined, FilterDetailsSuccessResponse>({
    method: 'GET',
    path: `/api/filters/${filterId}/`,
    authRequired: true,
    fake404: () => ({
      filterId,
      studyId: `fake-study-${Date.now()}`,
      measurementId: `fake-measurement-${Date.now()}`,
      status: 'Success',
      createdAt: new Date().toISOString(),
      filterInfo: {
        summaryMetrics: {
          summary: 'Fake filter details for development'
        }
      }
    })
  })
}
