import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { getFilters } from '@renderer/utils/api/endpoints'
import type { FilterListItem, FilterListResponse, FilterStatus } from '@renderer/utils/api/types'

const POLL_MS = 5000

const resolveFilters = (payload: FilterListResponse): FilterListItem[] => {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

/** True while a filter row is still Pending or Generating (case-insensitive). */
export const isFilterStatusWaiting = (s: FilterStatus | string | undefined | null): boolean => {
  if (s == null || typeof s !== 'string') return false
  const n = s.trim().toLowerCase()
  return n === 'pending' || n === 'generating'
}

const listHasWaitingFilters = (list: FilterListItem[]): boolean =>
  list.some((it) => isFilterStatusWaiting(it.status))

/**
 * While any filter is Pending or Generating, refetches the filter list on a fixed interval.
 * Uses GET /filters/ (not per-id status) so DevTools shows periodic `filters/` requests and
 * status always matches the list endpoint.
 */
export function usePollPendingFilterStatuses(
  items: FilterListItem[],
  setItems: Dispatch<SetStateAction<FilterListItem[]>>
): void {
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const hasWaiting = listHasWaitingFilters(items)

  useEffect(() => {
    if (!hasWaiting) return

    let cancelled = false
    let inFlight = false

    const poll = async (): Promise<void> => {
      if (cancelled || inFlight) return

      const current = itemsRef.current
      if (!listHasWaitingFilters(current)) return

      inFlight = true
      try {
        const response = await getFilters()
        if (cancelled) return
        const fresh = resolveFilters(response)
        setItems((prev) => {
          const prevById = new Map(prev.map((p) => [p.filterId, p]))
          return fresh.map((item) => ({
            ...item,
            useQuantumComputer: item.useQuantumComputer ?? prevById.get(item.filterId)?.useQuantumComputer,
          }))
        })
      } catch {
        // Polling failures should not break the page.
      } finally {
        inFlight = false
      }
    }

    const interval = window.setInterval(() => {
      void poll()
    }, POLL_MS)

    void poll()

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [setItems, hasWaiting])
}
