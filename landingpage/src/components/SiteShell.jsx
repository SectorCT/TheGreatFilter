import { Link, NavLink } from 'react-router-dom'

import { APP_NAME, TAGLINE } from '../lib/constants'

function LogoMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-border bg-card">
      <img src="/TheGreatFilterIcon.png" alt={`${APP_NAME} icon`} className="h-8 w-8" />
    </div>
  )
}

export default function SiteShell({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[6px] focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Desktop App</div>
              <div className="text-2xl font-semibold tracking-tight">{APP_NAME}</div>
              <div className="scientific-label mt-1">{TAGLINE}</div>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            {[
              { to: '/', label: 'Home' },
              { to: '/download', label: 'Download' },
              { to: '/about', label: 'About' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'rounded-[6px] px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  ].join(' ')
                }
                end={to === '/'}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main id="main-content" className="mt-10" tabIndex={-1}>
          {children}
        </main>

        <footer className="mt-16 border-t border-border py-8 text-center text-xs text-muted-foreground">
          <div>
            © {new Date().getFullYear()} {APP_NAME} · {TAGLINE}
          </div>
        </footer>
      </div>
    </div>
  )
}

