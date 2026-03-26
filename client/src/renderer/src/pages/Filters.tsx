import { ArrowRight, FlaskConical } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/ui/button'
import { getFilters } from '@renderer/utils/api/endpoints'
import { type FilterListItem, type FilterListResponse } from '@renderer/utils/api/types'

const resolveFilters = (payload: FilterListResponse): FilterListItem[] => {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

export function Filters(): React.JSX.Element {
  const navigate = useNavigate()
  const [items, setItems] = useState<FilterListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const total = useMemo(() => items.length, [items])

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">All Filters</h1>
          <p className="text-sm text-muted-foreground">{total} generated filters</p>
        </div>
        <Button onClick={() => navigate('/filters/new')}>
          <FlaskConical size={16} strokeWidth={1.5} />
          New Filter
        </Button>
      </div>

      <div className="rounded-[6px] border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Filter Name</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Parameters</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading filters...
                  </td>
                </tr>
              ) : null}
              {!isLoading && error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-destructive">
                    {error}
                  </td>
                </tr>
              ) : null}
              {!isLoading && !error && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No filters generated yet.
                  </td>
                </tr>
              ) : null}
              {!isLoading && !error && items.map((item) => (
                <tr
                  key={item.filterId}
                  onClick={() => navigate(`/filters/${item.filterId}`)}
                  className={`cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-table-row-hover ${
                    item.status === 'Generating' ? 'shimmer-row' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.filterId}</td>
                  <td className="px-4 py-3 font-medium">Filter {item.filterId.slice(0, 8)}</td>
                  <td className="px-4 py-3">-</td>
                  <td className="px-4 py-3 font-mono text-xs">-</td>
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
