import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { ApiError } from '@renderer/utils/api/makeAuthenticatedReq'
import { getAccessToken, login, signup } from '@renderer/utils/api'

type PasswordRule = {
  key: 'length' | 'notNumeric' | 'notCommon' | 'notSimilarToEmail'
  label: string
  met: boolean
}

export function Auth(): React.JSX.Element {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const getAuthErrorMessage = (submitError: unknown): string => {
    const normalizeAuthMessage = (rawMessage: string): string => {
      const trimmed = rawMessage.trim()
      if (!trimmed) return trimmed

      const lower = trimmed.toLowerCase()
      if (lower.includes('too common')) {
        return 'Password is too common. Use a more unique password.'
      }
      if (lower.includes('entirely numeric')) {
        return 'Password cannot be only numbers.'
      }
      if (lower.includes('too short') || lower.includes('at least 8')) {
        return 'Password must be at least 8 characters long.'
      }
      if (lower.includes('too similar')) {
        return 'Password is too similar to your personal information.'
      }

      return trimmed
    }

    if (submitError instanceof ApiError) {
      const bodyText = submitError.responseBodyText
      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText) as { message?: string; detail?: string }
          if (parsed.message && parsed.message.trim().length > 0) {
            return normalizeAuthMessage(parsed.message)
          }
          if (parsed.detail && parsed.detail.trim().length > 0) {
            return normalizeAuthMessage(parsed.detail)
          }
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

  const getPasswordRules = (value: string, userEmail: string): PasswordRule[] => {
    const trimmed = value.trim()
    const emailLocalPart = userEmail.trim().split('@')[0]?.toLowerCase() ?? ''
    const normalized = trimmed.toLowerCase()

    const commonPasswords = new Set([
      'password',
      'password123',
      '12345678',
      '123456789',
      'qwerty',
      'qwerty123',
      'admin123',
      'letmein',
    ])

    return [
      {
        key: 'length',
        label: 'At least 8 characters',
        met: value.length >= 8,
      },
      {
        key: 'notNumeric',
        label: 'Not entirely numeric',
        met: value.length > 0 && !/^\d+$/.test(value),
      },
      {
        key: 'notCommon',
        label: 'Not a common password',
        met: !!trimmed && !commonPasswords.has(normalized),
      },
      {
        key: 'notSimilarToEmail',
        label: 'Not similar to your email',
        met: !emailLocalPart || !normalized.includes(emailLocalPart),
      },
    ]
  }

  const passwordRules = getPasswordRules(password, email)
  const incompletePasswordRules = passwordRules.filter((rule) => !rule.met)

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

    if (mode === 'signup') {
      const unmetRule = getPasswordRules(password, email).find((rule) => !rule.met)
      if (unmetRule) {
        setError(`Password requirement not met: ${unmetRule.label}.`)
        return
      }
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
            <div className="space-y-1 rounded-[6px] border border-border bg-muted/20 px-3 py-2">
              {incompletePasswordRules.length > 0 ? (
                incompletePasswordRules.map((rule) => (
                  <p key={rule.key} className="text-xs text-muted-foreground">
                    • {rule.label}
                  </p>
                ))
              ) : (
                <p className="text-xs text-emerald-600">✓ All password requirements are met.</p>
              )}
            </div>
          ) : null}
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
