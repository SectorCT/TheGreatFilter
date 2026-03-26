import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import {
  type FilterDetailsSuccessResponse,
  type FilterListResponse,
  type FilterInfo,
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
      materialType: 'Activated Carbon',
      atomPositions: [
        { id: 0, x: 0, y: 0, z: 0, element: 'C' },
        { id: 1, x: 1.42, y: 0, z: 0, element: 'C' },
        { id: 2, x: 2.13, y: 1.23, z: 0, element: 'C' },
        { id: 3, x: 1.42, y: 2.46, z: 0, element: 'C' },
        { id: 4, x: 0, y: 2.46, z: 0, element: 'C' },
        { id: 5, x: -0.71, y: 1.23, z: 0, element: 'C' },
        { id: 6, x: 0.71, y: 1.23, z: 3.1, element: 'N' }
      ],
      connections: [
        { from: 0, to: 1, order: 1 },
        { from: 1, to: 2, order: 1 },
        { from: 2, to: 3, order: 1 },
        { from: 3, to: 4, order: 1 },
        { from: 4, to: 5, order: 1 },
        { from: 5, to: 0, order: 1 },
        { from: 0, to: 6, order: 1 }
      ]
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
      parameter_count: 6,
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
