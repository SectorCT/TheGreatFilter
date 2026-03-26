import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'

export function NotFound(): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="rounded-[6px] border border-border bg-card p-6 text-center">
        <h1 className="mb-2 text-xl font-semibold">404</h1>
        <p className="mb-4 text-sm text-muted-foreground">Page not found</p>
        <Button onClick={() => navigate('/')}>Go to Auth</Button>
      </div>
    </div>
  )
}
