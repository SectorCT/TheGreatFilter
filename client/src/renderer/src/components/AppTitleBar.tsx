import { Minus, Search, Square, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { getFilters, getMeasurements, getStudies } from '@renderer/utils/api/endpoints'
import type { FilterListItem, MeasurementListItem, Study } from '@renderer/utils/api/types'

type SearchKind = 'filter' | 'measurement' | 'study' | 'contaminant'
type SearchResult = {
  id: string
  title: string
  subtitle: string
  kind: SearchKind
  route: string
  score: number
}

function normalizeList<T>(payload: { results?: T[] } | T[]): T[] {
  if (Array.isArray(payload)) return payload
  return Array.isArray(payload.results) ? payload.results : []
}

function scoreText(query: string, candidate: string): number {
  const q = query.trim().toLowerCase()
  const c = candidate.trim().toLowerCase()
  if (!q || !c) return 0
  if (c === q) return 120
  if (c.startsWith(q)) return 90
  if (c.includes(q)) return 60
  const qTokens = q.split(/\s+/).filter(Boolean)
  const allTokensPresent = qTokens.length > 0 && qTokens.every((token) => c.includes(token))
  return allTokensPresent ? 40 : 0
}

export function AppTitleBar(): React.JSX.Element {
  const navigate = useNavigate()
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const [searchSnapshot, setSearchSnapshot] = useState<{
    filters: FilterListItem[]
    measurements: MeasurementListItem[]
    studies: Study[]
  } | null>(null)
  const [hasLoadedSnapshot, setHasLoadedSnapshot] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node | null
      if (!target) return
      if (searchContainerRef.current?.contains(target)) return
      setIsOpen(false)
      setActiveIndex(-1)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [])

  const fetchSearchSnapshot = async (): Promise<{
    filters: FilterListItem[]
    measurements: MeasurementListItem[]
    studies: Study[]
  }> => {
    const [filtersResponse, measurementsResponse, studiesResponse] = await Promise.all([
      getFilters(),
      getMeasurements(),
      getStudies()
    ])
    return {
      filters: normalizeList(filtersResponse),
      measurements: normalizeList(measurementsResponse),
      studies: normalizeList(studiesResponse)
    }
  }

  const buildResults = (
    rawQuery: string,
    data: { filters: FilterListItem[]; measurements: MeasurementListItem[]; studies: Study[] }
  ): SearchResult[] => {
    const q = rawQuery.trim().toLowerCase()
    if (!q) return []
    const built: SearchResult[] = []

    for (const filter of data.filters) {
      const score = Math.max(
        scoreText(q, filter.filterId),
        scoreText(q, filter.studyId),
        scoreText(q, filter.measurementId),
        scoreText(q, filter.status)
      )
      if (score <= 0) continue
      built.push({
        id: `filter-${filter.filterId}`,
        kind: 'filter',
        title: `Filter ${filter.filterId}`,
        subtitle: `${filter.status} · Study ${filter.studyId}`,
        route: `/filters/${filter.filterId}`,
        score
      })
    }

    for (const measurement of data.measurements) {
      const paramLabel = (measurement.parameters ?? [])
        .slice(0, 3)
        .map((p) => p.parameterName ?? p.parameterCode)
        .join(', ')
      const score = Math.max(
        scoreText(q, measurement.measurementId),
        scoreText(q, measurement.name ?? ''),
        scoreText(q, measurement.source),
        scoreText(q, paramLabel)
      )
      if (score > 0) {
        built.push({
          id: `measurement-${measurement.measurementId}`,
          kind: 'measurement',
          title: `Measurement ${measurement.measurementId}`,
          subtitle: `${measurement.name ?? 'Unnamed'} · ${measurement.source}`,
          route: `/measurements/${measurement.measurementId}`,
          score
        })
      }

      for (const parameter of measurement.parameters ?? []) {
        const paramCode = parameter.parameterCode ?? ''
        const paramName = parameter.parameterName ?? ''
        const contaminantScore = Math.max(scoreText(q, paramCode), scoreText(q, paramName))
        if (contaminantScore <= 0) continue
        built.push({
          id: `contaminant-${measurement.measurementId}-${paramCode}`,
          kind: 'contaminant',
          title: `${paramName || paramCode}`,
          subtitle: `in Measurement ${measurement.measurementId}`,
          route: `/measurements/${measurement.measurementId}`,
          score: contaminantScore + 6
        })
      }
    }

    for (const study of data.studies) {
      const score = Math.max(scoreText(q, study.id), scoreText(q, study.name), scoreText(q, study.description ?? ''))
      if (score <= 0) continue
      built.push({
        id: `study-${study.id}`,
        kind: 'study',
        title: `Study ${study.name}`,
        subtitle: study.id,
        route: `/filters?studyId=${encodeURIComponent(study.id)}`,
        score
      })
    }

    return built
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 9)
  }

  const runSearch = async (rawQuery: string): Promise<void> => {
    const trimmed = rawQuery.trim()
    if (!trimmed) {
      setResults([])
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }
    setIsSearching(true)
    setIsOpen(true)
    try {
      const data = searchSnapshot ?? (await fetchSearchSnapshot())
      if (!hasLoadedSnapshot) {
        setSearchSnapshot(data)
        setHasLoadedSnapshot(true)
      }
      const nextResults = buildResults(trimmed, data)
      setResults(nextResults)
      setActiveIndex(nextResults.length > 0 ? 0 : -1)
    } catch (searchError) {
      setResults([])
      setActiveIndex(-1)
      toast.error(searchError instanceof Error ? searchError.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const selectResult = (result: SearchResult): void => {
    navigate(result.route)
    setQuery('')
    setResults([])
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const submitSearch = (): void => {
    const trimmed = query.trim()
    if (!trimmed) return
    if (activeIndex >= 0 && results[activeIndex]) {
      selectResult(results[activeIndex])
      return
    }
    if (results.length > 0) {
      selectResult(results[0])
      return
    }
    toast.info(`No matches found for "${trimmed}"`)
  }

  return (
    <header className="drag-region flex h-12 items-center justify-between border-b border-border bg-card/90 px-3 backdrop-blur">
      <div className="no-drag flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-secondary text-xs font-semibold">
          H₂
        </div>
        <Menu title="File">
          <MenuItem onClick={() => navigate('/add-measurement')}>
            New Measurement
          </MenuItem>
          <MenuItem onClick={() => window.api.window.close()}>Exit</MenuItem>
        </Menu>
        <Menu title="View">
          <MenuItem
            onClick={() => {
              setDark((prev) => !prev)
              toast.success('Theme toggled')
            }}
          >
            Toggle Dark/Light Mode
          </MenuItem>
        </Menu>
      </div>

      <div className="no-drag mx-4 hidden max-w-xl flex-1 lg:flex">
        <div ref={searchContainerRef} className="relative w-full">
          <div className="flex h-8 w-full items-center gap-2 rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-muted-foreground">
          <Search size={14} strokeWidth={1.5} />
          <input
            ref={searchRef}
            placeholder="Search Filters, Samples, or Contaminants..."
            value={query}
            onChange={(event) => {
              const next = event.target.value
              setQuery(next)
              void runSearch(next)
            }}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submitSearch()
                return
              }
              if (event.key === 'Escape') {
                setIsOpen(false)
                setActiveIndex(-1)
                return
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                if (!isOpen && results.length > 0) {
                  setIsOpen(true)
                  setActiveIndex(0)
                  return
                }
                if (results.length === 0) return
                setActiveIndex((prev) => (prev + 1) % results.length)
                return
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                if (results.length === 0) return
                setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1))
              }
            }}
            className="h-full w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          </div>
          {isOpen ? (
            <div className="absolute left-0 top-10 z-50 w-full rounded-[8px] border border-border bg-card p-1 shadow-sm">
              {isSearching ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">No results</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => selectResult(result)}
                      className={`block w-full rounded-[6px] px-2 py-1.5 text-left transition-colors ${
                        index === activeIndex ? 'bg-secondary' : 'hover:bg-secondary'
                      }`}
                    >
                      <p className="text-sm text-foreground">{result.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {result.kind} · {result.subtitle}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="no-drag flex items-center gap-3">
        <div className="flex items-center">
          <ControlButton onClick={() => window.api.window.minimize()}>
            <Minus size={14} strokeWidth={1.5} />
          </ControlButton>
          <ControlButton onClick={() => window.api.window.toggleMaximize()}>
            <Square size={12} strokeWidth={1.5} />
          </ControlButton>
          <ControlButton onClick={() => window.api.window.close()}>
            <X size={14} strokeWidth={1.5} />
          </ControlButton>
        </div>
      </div>
    </header>
  )
}

function Menu({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="group relative">
      <button className="rounded-[6px] px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
        {title}
      </button>
      <div className="pointer-events-none absolute left-0 top-full h-2 w-full" />
      <div className="invisible absolute left-0 top-full z-50 min-w-56 pt-1 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="rounded-[6px] border border-border bg-card p-1 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}

function MenuItem({
  onClick,
  children
}: {
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="block w-full rounded-[6px] px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
    >
      {children}
    </button>
  )
}

function ControlButton({
  children,
  onClick
}: {
  children: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="rounded-[6px] p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
    </button>
  )
}
