import { ArrowRight, Cpu, FlaskConical, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { usePollPendingFilterStatuses } from '@renderer/hooks/usePollPendingFilterStatuses'
import { getFilters, getStudies } from '@renderer/utils/api/endpoints'
import { type FilterListItem, type FilterListResponse, type Study, type StudyListResponse } from '@renderer/utils/api/types'
import {
  IMPORTED_FILTER_ROUTE_ID,
  writeImportedFilterSession,
  type ImportedFilterLocationState,
} from '@renderer/utils/importedFilterPayload'

const resolveFilters = (payload: FilterListResponse): FilterListItem[] => {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

const resolveStudies = (payload: StudyListResponse): Study[] => {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

export function Filters(): React.JSX.Element {
  const navigate = useNavigate()
  const jsonInputRef = useRef<HTMLInputElement | null>(null)
  const [items, setItems] = useState<FilterListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [studies, setStudies] = useState<Study[]>([])
  const [isLoadingStudies, setIsLoadingStudies] = useState(true)
  const [studyFilterId, setStudyFilterId] = useState<string>('') // '' means "All"

  useEffect(() => {
    let isMounted = true
    const loadFilters = async (): Promise<void> => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getFilters()
        if (!isMounted) return
        setItems(resolveFilters(response))
      } catch (fetchError) {
        if (!isMounted) return
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load filters.'
        setError(message)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadFilters()
    return () => {
      isMounted = false
    }
  }, [])

  usePollPendingFilterStatuses(items, setItems)

  useEffect(() => {
    let isMounted = true
    const loadStudies = async (): Promise<void> => {
      setIsLoadingStudies(true)
      try {
        const response = await getStudies()
        if (!isMounted) return
        setStudies(resolveStudies(response))
      } catch {
        if (!isMounted) return
        setStudies([])
      } finally {
        if (isMounted) setIsLoadingStudies(false)
      }
    }
    void loadStudies()
    return () => {
      isMounted = false
    }
  }, [])

  const studyNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const study of studies) map.set(study.id, study.name)
    return map
  }, [studies])

  const total = useMemo(() => items.length, [items])
  const filteredItems = useMemo(() => {
    if (!studyFilterId) return items
    return items.filter((item) => item.studyId === studyFilterId)
  }, [items, studyFilterId])

  const handlePickJsonForVisualization = async (file: File): Promise<void> => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const state: ImportedFilterLocationState = {
        importedFilterJson: parsed,
        importedFileName: file.name,
      }
      writeImportedFilterSession(state)
      navigate(`/filters/${IMPORTED_FILTER_ROUTE_ID}`, { state })
    } catch (parseError) {
      const message =
        parseError instanceof Error ? parseError.message : 'Failed to parse JSON file.'
      toast.error(message)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">All Filters</h1>
          <p className="text-sm text-muted-foreground">{total} generated filters</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void handlePickJsonForVisualization(file)
              event.target.value = ''
            }}
          />
          <select
            value={studyFilterId}
            onChange={(e) => setStudyFilterId(e.target.value)}
            className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm md:w-[240px]"
            disabled={isLoadingStudies}
            title="Filter by study"
          >
            <option value="">All Studies</option>
            {studies.map((study) => (
              <option key={study.id} value={study.id}>
                {study.name}
              </option>
            ))}
          </select>
          <Button onClick={() => navigate('/filters/new')} className="shrink-0">
            <FlaskConical size={16} strokeWidth={1.5} />
            New Filter
          </Button>
          <Button
            variant="outline"
            onClick={() => jsonInputRef.current?.click()}
            className="shrink-0"
          >
            <Upload size={16} strokeWidth={1.5} />
            Open JSON…
          </Button>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Study</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Measurement</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading filters...
                  </td>
                </tr>
              ) : null}
              {!isLoading && error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-destructive">
                    {error}
                  </td>
                </tr>
              ) : null}
              {!isLoading && !error && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {studyFilterId ? 'No filters for the selected study.' : 'No filters generated yet.'}
                  </td>
                </tr>
              ) : null}
              {!isLoading && !error && filteredItems.map((item) => (
                <tr
                  key={item.filterId}
                  onClick={() => navigate(`/filters/${item.filterId}`)}
                  className={`cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover ${
                    item.status === 'Generating' ? 'shimmer-row' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {item.studyName?.trim() || studyNameById.get(item.studyId) || '—'}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{item.measurementName?.trim() || '—'}</span>
                      {item.useQuantumComputer === true ? (
                        <Cpu size={14} strokeWidth={1.7} className="text-violet-600" aria-label="Quantum computer" />
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {new Date(item.createdAt).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <ArrowRight size={14} strokeWidth={1.5} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
