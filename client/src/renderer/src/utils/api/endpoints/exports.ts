import { makeAuthenticatedReq } from '../makeAuthenticatedReq'
import { type ExportGeneratedFilterCsvResponse } from '../types'

type DownloadUrlJson = { downloadUrl: string }

const isDownloadUrlJson = (value: unknown): value is DownloadUrlJson => {
  if (typeof value !== 'object' || value === null) return false
  if (!('downloadUrl' in value)) return false
  const record = value as Record<string, unknown>
  return typeof record.downloadUrl === 'string'
}

const parseExportResponse = async (
  response: Response
): Promise<ExportGeneratedFilterCsvResponse> => {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/csv')) {
    const csvText = await response.text()
    return { kind: 'csvText', csvText }
  }

  // Alternative contract: JSON payload containing a temporary download URL.
  const json = (await response.json()) as unknown
  if (isDownloadUrlJson(json)) {
    const downloadResponse = await fetch(json.downloadUrl)
    if (!downloadResponse.ok) {
      throw new Error(`Failed to fetch CSV from export URL (${downloadResponse.status})`)
    }
    const csvText = await downloadResponse.text()
    return { kind: 'csvText', csvText }
  }

  throw new Error('Unexpected export response shape')
}

export const exportFilterCsv = async (
  filterId: string
): Promise<ExportGeneratedFilterCsvResponse> => {
  return makeAuthenticatedReq<undefined, ExportGeneratedFilterCsvResponse>({
    method: 'GET',
    path: `/api/filters/${filterId}/export/`,
    query: { format: 'csv' },
    authRequired: true,
    parseResponse: parseExportResponse,
    fake404: () => ({
      kind: 'csvText',
      csvText: `filter_id,${filterId}\nstatus,fake\n`
    })
  })
}
