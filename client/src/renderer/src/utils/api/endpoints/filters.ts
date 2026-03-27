import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type FilterDetailsSuccessResponse,
  type FilterListResponse,
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
  })
}

export const getFilterStatus = async (filterId: string): Promise<FilterStatusRefreshResponse> => {
  return makeAuthenticatedReq<undefined, FilterStatusRefreshResponse>({
    method: 'GET',
    path: `/api/filters/${filterId}/status/`,
    authRequired: true,
  })
}

export const getFilters = async (): Promise<FilterListResponse> => {
  return makeAuthenticatedReq<undefined, FilterListResponse>({
    method: 'GET',
    path: '/api/filters/',
    authRequired: true,
  })
}

export const getFilterDetails = async (filterId: string): Promise<FilterDetailsSuccessResponse> => {
  return makeAuthenticatedReq<undefined, FilterDetailsSuccessResponse>({
    method: 'GET',
    path: `/api/filters/${filterId}/`,
    authRequired: true,
  })
}
