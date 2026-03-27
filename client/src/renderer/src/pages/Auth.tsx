import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { ApiError } from '@renderer/utils/api/makeAuthenticatedReq'
import { getAccessToken, login, signup } from '@renderer/utils/api'

export function Auth(): React.JSX.Element {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const getAuthErrorMessage = (submitError: unknown): string => {
    if (submitError instanceof ApiError) {
      const bodyText = submitError.responseBodyText
      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText) as { message?: string; detail?: string }
          if (parsed.message && parsed.message.trim().length > 0) return parsed.message
          if (parsed.detail && parsed.detail.trim().length > 0) return parsed.detail
        } catch {
          // Not JSON; fall back to HTTP status below.
        }
      }
      return `Authentication failed (HTTP ${submitError.status}).`
    }
    if (submitError instanceof Error && submitError.message.trim().length > 0) {
      return submitError.message
    }
    return 'Authentication failed. Check credentials and try again.'
  }

  useEffect(() => {
    const existingToken = getAccessToken()
    if (existingToken) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password })
      } else {
        await signup({
          email: email.trim(),
          password,
          password2: confirmPassword,
        })
      }
      navigate('/dashboard')
    } catch (submitError) {
      console.error(submitError)
      setError(getAuthErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

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
            void handleSubmit(e)
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {mode === 'signup' ? (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">v1.0 · Hack TUES 2026</p>
      </div>
    </div>
  )
}
