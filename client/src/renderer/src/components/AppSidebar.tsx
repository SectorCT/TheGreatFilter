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
    <aside className="flex w-14 shrink-0 flex-col border-r border-border bg-card md:w-56">
      <div className="flex h-14 items-center justify-center border-b border-border px-2 md:justify-between md:px-4">
        <h2 className="hidden text-base font-semibold tracking-tight md:block">H₂O-Sim</h2>
        <h2 className="text-sm font-semibold tracking-tight md:hidden">H₂O</h2>
        <span className="hidden rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-flex">
          v1.0
        </span>
      </div>

      <div className="flex-1 px-2 py-4 md:px-3">
        <p className="scientific-label mb-2 hidden md:block">Navigation</p>
        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-center rounded-[6px] px-2 py-2 text-sm transition-colors md:justify-start md:gap-2 md:px-3',
                  isActive
                    ? 'bg-secondary font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
              title={label}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-border p-2 md:p-3">
        <button
          onClick={() => navigate('/')}
          title="Sign Out"
          className="flex w-full items-center justify-center rounded-[6px] px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:justify-start md:gap-2 md:px-3"
        >
          <LogOut size={16} strokeWidth={1.5} />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
