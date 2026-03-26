import { cn } from '@renderer/lib/utils'

type Props = {
  status: string
}

export function StatusBadge({ status }: Props): React.JSX.Element {
  const base = 'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium'

  const styleMap: Record<string, string> = {
    Complete: 'bg-status-complete/15 text-status-complete',
    Success: 'bg-status-complete/15 text-status-complete',
    Generating: 'bg-status-generating/15 text-status-generating',
    Pending: 'bg-status-pending/15 text-status-pending',
    Failed: 'bg-destructive/15 text-destructive'
  }

  return (
    <span className={cn(base, styleMap[status] ?? 'bg-muted text-muted-foreground')}>{status}</span>
  )
}
