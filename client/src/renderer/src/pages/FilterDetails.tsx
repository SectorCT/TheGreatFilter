import { ArrowLeft, Download, Eye, Microscope, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { exportFilterCsv, getFilterDetails, getFilterStatus } from '@renderer/utils/api/endpoints'
import { type FilterDetailsSuccessResponse, type FilterStatus } from '@renderer/utils/api/types'

export function FilterDetails(): React.JSX.Element {
  const navigate = useNavigate()
  const { id } = useParams()
  const [status, setStatus] = useState<FilterStatus | null>(null)
  const [details, setDetails] = useState<FilterDetailsSuccessResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadStatus = async (): Promise<void> => {
      if (!id) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await getFilterStatus(id)
        if (!isMounted) return
        setStatus(response.status)
      } catch (fetchError) {
        if (!isMounted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter status.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadStatus()
    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    let isMounted = true
    const loadDetails = async (): Promise<void> => {
      if (!id || status !== 'Success') return
      try {
        const response = await getFilterDetails(id)
        if (!isMounted) return
        setDetails(response)
      } catch (fetchError) {
        if (!isMounted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load filter details.')
      }
    }
    void loadDetails()
    return () => {
      isMounted = false
    }
  }, [id, status])

  const displayStatus = status ?? 'Pending'
  const createdAt = useMemo(
    () => (details?.createdAt ? new Date(details.createdAt).toISOString().slice(0, 10) : '-'),
    [details?.createdAt]
  )
  const filterInfo = details?.filterInfo ?? {}
  const summaryEntries = Object.entries(filterInfo)

  const handleExportCsv = async (): Promise<void> => {
    if (!id || status !== 'Success') return
    setIsExporting(true)
    setError(null)
    try {
      const result = await exportFilterCsv(id)
      if (result.kind === 'downloadUrl') {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer')
      } else {
        const blob = new Blob([result.csvText], { type: 'text/csv;charset=utf-8;' })
        const href = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = href
        link.setAttribute('download', `filter-${id}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(href)
      }
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Failed to export CSV.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/filters')}
            className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Filter Details</h1>
            <p className="font-mono text-xs text-muted-foreground">
              Filter {id ?? '-'} · Generated {createdAt}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/filters/${id}/analysis`)}>
            <Microscope size={16} strokeWidth={1.5} />
            Analyze
          </Button>
          <Button variant="outline" onClick={() => navigate(`/filters/${id}/visualize`)}>
            <Eye size={16} strokeWidth={1.5} />
            Visualize
          </Button>
          <Button variant="outline" onClick={() => navigate(`/filters/${id}/simulate`)}>
            <Play size={16} strokeWidth={1.5} />
            Simulate
          </Button>
          <Button variant="outline" onClick={() => void handleExportCsv()} disabled={status !== 'Success' || isExporting}>
            <Download size={16} strokeWidth={1.5} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-[6px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Status</p>
          <StatusBadge status={displayStatus} />
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Study ID</p>
          <p className="text-sm font-medium font-mono">{details?.studyId ?? '-'}</p>
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Measurement ID</p>
          <p className="font-mono text-xs">{details?.measurementId ?? '-'}</p>
        </div>
        <div className="rounded-[6px] border border-border bg-card p-4">
          <p className="scientific-label mb-2">Created</p>
          <p className="font-mono text-xs">{createdAt}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[6px] border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading filter status...
        </div>
      ) : null}

      {!isLoading && status !== 'Success' ? (
        <div className="rounded-[6px] border border-border bg-card p-6 text-sm text-muted-foreground">
          Filter is currently <StatusBadge status={displayStatus} />. Details and export unlock when status
          becomes Success.
        </div>
      ) : null}

      {!isLoading && status === 'Success' ? (
        <div className="rounded-[6px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Filter Payload</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left">
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Section</th>
                  <th className="px-4 py-2.5 font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {summaryEntries.map(([key, value]) => (
                  <tr key={key} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{key}</td>
                    <td className="px-4 py-3">
                      <pre className="overflow-x-auto font-mono text-xs">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
                {summaryEntries.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No filter detail payload returned by server.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
