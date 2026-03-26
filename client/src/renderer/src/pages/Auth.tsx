import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'

export function Auth(): React.JSX.Element {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">H₂O-Sim</h1>
          <p className="scientific-label mt-1">Water Quality Analysis Platform</p>
        </div>

        <div className="mb-4 flex border-b border-border">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 border-b-2 px-2 pb-2 text-sm transition-colors ${
              mode === 'login'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 border-b-2 px-2 pb-2 text-sm transition-colors ${
              mode === 'signup'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            navigate('/dashboard')
          }}
        >
          <input
            type="email"
            placeholder="Email"
            className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder="Password"
            className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {mode === 'signup' ? (
            <input
              type="password"
              placeholder="Confirm Password"
              className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : null}
          <Button className="w-full">{mode === 'login' ? 'Log In' : 'Create Account'}</Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">v1.0 · Hack TUES 2026</p>
      </div>
    </div>
  )
}
