import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import type { Study, StudyCreateRequest, StudyListResponse, StudyUpdateRequest } from '../types'

export const getStudies = async (): Promise<StudyListResponse> => {
  return makeAuthenticatedReq<undefined, StudyListResponse>({
    method: 'GET',
    path: '/api/studies/',
    authRequired: true,
    fake404: { results: [], count: 0 }
  })
}

export const createStudy = async (request: StudyCreateRequest): Promise<Study> => {
  return makeAuthenticatedReq<StudyCreateRequest, Study>({
    method: 'POST',
    path: '/api/studies/',
    body: request,
    authRequired: true,
    fake404: {
      id: `fake-study-${Date.now()}`,
      name: request.name,
      description: request.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
}

export const getStudyById = async (id: string): Promise<Study> => {
  return makeAuthenticatedReq<undefined, Study>({
    method: 'GET',
    path: `/api/studies/${id}/`,
    authRequired: true,
    fake404: {
      id,
      name: 'Fake Study',
      description: 'Development fallback study',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
}

export const updateStudy = async (id: string, request: StudyUpdateRequest): Promise<Study> => {
  return makeAuthenticatedReq<StudyUpdateRequest, Study>({
    method: 'PUT',
    path: `/api/studies/${id}/`,
    body: request,
    authRequired: true,
    fake404: {
      id,
      name: request.name ?? 'Fake Study',
      description: request.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
}

export const deleteStudy = async (id: string): Promise<{ success: boolean }> => {
  return makeAuthenticatedReq<undefined, { success: boolean }>({
    method: 'DELETE',
    path: `/api/studies/${id}/`,
    authRequired: true,
    fake404: { success: true }
  })
}
