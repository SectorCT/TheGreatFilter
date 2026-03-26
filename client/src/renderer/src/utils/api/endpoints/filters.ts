import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type FilterDetailsSuccessResponse,
  type FilterInfo,
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

export const getFilters = async (): Promise<FilterListResponse> => {
  return makeAuthenticatedReq<undefined, FilterListResponse>({
    method: 'GET',
    path: '/api/filters/',
    authRequired: true,
    fake404: { results: [], count: 0 }
  })
}

const buildFakeFilterInfo = (): FilterInfo => {
  return {
    filterStructure: {
      poreSize: 0.45,
      layerThickness: 2.1,
      latticeSpacing: 0.34,
      materialType: 'Activated Carbon'
    },
    experimentPayload: {
      temperature: 18.5,
      ph: 7.2,
      params: [
        { name: 'NO3', value: 3.2, unit: 'mg/L' },
        { name: 'PO4', value: 0.05, unit: 'mg/L' },
        { name: 'FE', value: 0.12, unit: 'mg/L' },
        { name: 'MN', value: 0.03, unit: 'mg/L' },
        { name: 'CL', value: 25, unit: 'mg/L' },
        { name: 'TDS', value: 300, unit: 'mg/L' }
      ]
    },
    resultPayload: {
      bindingEnergy: -18.4,
      removalEfficiency: 92,
      pollutant: 'Nitrate',
      pollutantSymbol: 'NO3'
    },
    summaryMetrics: {
      parameter_count: 12,
      removalEfficiency: 92,
      bindingEnergy: -18.4,
      materialType: 'Activated Carbon'
    }
  }
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
      filterInfo: buildFakeFilterInfo()
    })
  })
}
