import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const labels: Record<string, string> = {
  dashboard: 'Dashboard',
  filters: 'All Filters',
  measurements: 'Measurements',
  'add-measurement': 'Add Measurement',
  visualize: 'Visualization'
}

export function Breadcrumbs(): React.JSX.Element {
  const location = useLocation()
  const rawSegments = location.pathname.split('/').filter(Boolean)
  const segments = rawSegments[0] === 'dashboard' ? rawSegments.slice(1) : rawSegments

  if (rawSegments.length === 0) return <></>

  return (
    <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
      <Link to="/dashboard" className="hover:text-foreground">
        Dashboard
      </Link>
      {segments.map((segment, index) => {
        const href = `/${rawSegments.slice(0, index + 1).join('/')}`
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight size={12} strokeWidth={1.5} />
            <span>{labels[segment] ?? segment.toUpperCase()}</span>
          </span>
        )
      })}
    </div>
  )
}
