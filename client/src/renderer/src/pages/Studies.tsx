import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Breadcrumbs } from '@renderer/components/Breadcrumbs'
import { Button } from '@renderer/components/ui/button'
import { createStudy, getStudies } from '@renderer/utils/api/endpoints'
import { type Study, type StudyListResponse } from '@renderer/utils/api/types'

const resolveStudies = (payload: StudyListResponse): Study[] => {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

const formatDateYmd = (value: unknown): string => {
  if (typeof value !== 'string') return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toISOString().slice(0, 10)
}

export function Studies(): React.JSX.Element {
  const [items, setItems] = useState<Study[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')

  useEffect(() => {
    let isMounted = true
    const loadStudies = async (): Promise<void> => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await getStudies()
        if (!isMounted) return
        setItems(resolveStudies(response))
      } catch (fetchError) {
        if (!isMounted) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load studies.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadStudies()
    return () => {
      isMounted = false
    }
  }, [])

  const total = useMemo(() => items.length, [items])

  const handleCreateStudy = async (): Promise<void> => {
    const trimmedName = nameInput.trim()
    if (!trimmedName) {
      toast.error('Study name is required.')
      return
    }
    setIsCreating(true)
    setError(null)
    try {
      const created = await createStudy({
        name: trimmedName,
        description: descriptionInput.trim() || undefined
      })
      setItems((prev) => [created, ...prev])
      setNameInput('')
      setDescriptionInput('')
      toast.success('Study created.')
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Failed to create study.'
      setError(message)
      toast.error('Failed to create study.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumbs />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Studies</h1>
          <p className="text-sm text-muted-foreground">{total} studies</p>
        </div>
      </div>

      <div className="mb-4 rounded-[6px] border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Create Study</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input
            type="text"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            placeholder="Study name"
            className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm"
          />
          <input
            type="text"
            value={descriptionInput}
            onChange={(event) => setDescriptionInput(event.target.value)}
            placeholder="Description (optional)"
            className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm"
          />
          <Button onClick={() => void handleCreateStudy()} disabled={isCreating}>
            <Plus size={16} strokeWidth={1.5} />
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-[680px] w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left">
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-2.5 font-medium text-muted-foreground">ID</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading studies...
                  </td>
                </tr>
              ) : null}
              {!isLoading && error ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-destructive">
                    {error}
                  </td>
                </tr>
              ) : null}
              {!isLoading && !error && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No studies yet. Create one to organize your filters.
                  </td>
                </tr>
              ) : null}
              {!isLoading &&
                !error &&
                items.map((study) => (
                  <tr key={study.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{study.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{study.description ?? '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {formatDateYmd(study.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {study.id}
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
