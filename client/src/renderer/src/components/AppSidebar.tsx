import { FlaskConical, Droplets, LayoutDashboard, LogOut, Plus } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@renderer/lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/filters', label: 'All Filters', icon: FlaskConical },
  { to: '/measurements', label: 'Measurements', icon: Droplets },
  { to: '/add-measurement', label: 'New Measurement', icon: Plus }
]

export function AppSidebar(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <h2 className="text-base font-semibold tracking-tight">H₂O-Sim</h2>
        <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          v1.0
        </span>
      </div>

      <div className="flex-1 px-3 py-4">
        <p className="scientific-label mb-2">Navigation</p>
        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-[6px] px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-secondary font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-border p-3">
        <button
          onClick={() => navigate('/')}
          className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
