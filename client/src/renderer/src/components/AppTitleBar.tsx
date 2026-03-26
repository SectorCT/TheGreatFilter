import { Minus, Search, Square, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

type PulseState = 'idle' | 'running' | 'error'

export function AppTitleBar(): React.JSX.Element {
  const [engineMode, setEngineMode] = useState<'Qiskit Aer (Local)' | 'IBM Quantum (Cloud)'>(
    'Qiskit Aer (Local)'
  )
  const [precision, setPrecision] = useState<
    'Low (4 Qubits)' | 'Medium (8 Qubits)' | 'High (16 Qubits)'
  >('Medium (8 Qubits)')
  const [dark, setDark] = useState(false)
  const [pulseState, setPulseState] = useState<PulseState>('idle')
  const [seconds, setSeconds] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const interval = window.setInterval(() => setSeconds((prev) => prev + 1), 1000)
    return () => window.clearInterval(interval)
  }, [])

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

  const pulseClass = useMemo(() => {
    if (pulseState === 'running') return 'bg-blue-400 pulse-dot'
    if (pulseState === 'error') return 'bg-red-400'
    return 'bg-green-500'
  }, [pulseState])

  const timerLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <header className="drag-region flex h-12 items-center justify-between border-b border-border bg-card/90 px-3 backdrop-blur">
      <div className="no-drag flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-secondary text-xs font-semibold">
          H₂
        </div>
        <Menu title="File">
          <MenuItem onClick={() => toast.info('New measurement initiated')}>
            New Measurement
          </MenuItem>
          <MenuItem onClick={() => toast.info('Session export placeholder')}>
            Export Session
          </MenuItem>
          <MenuItem onClick={() => window.api.window.close()}>Exit</MenuItem>
        </Menu>
        <Menu title="Engine">
          <MenuItem onClick={() => setEngineMode('Qiskit Aer (Local)')}>
            Simulator Mode: Qiskit Aer (Local)
          </MenuItem>
          <MenuItem onClick={() => setEngineMode('IBM Quantum (Cloud)')}>
            Simulator Mode: IBM Quantum (Cloud)
          </MenuItem>
          <div className="my-1 h-px bg-border" />
          <MenuItem onClick={() => setPrecision('Low (4 Qubits)')}>
            Precision: Low (4 Qubits)
          </MenuItem>
          <MenuItem onClick={() => setPrecision('Medium (8 Qubits)')}>
            Precision: Medium (8 Qubits)
          </MenuItem>
          <MenuItem onClick={() => setPrecision('High (16 Qubits)')}>
            Precision: High (16 Qubits)
          </MenuItem>
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
          <MenuItem onClick={() => toast.info('3D view reset')}>Reset 3D View</MenuItem>
        </Menu>
      </div>

      <div className="no-drag mx-4 hidden max-w-xl flex-1 lg:flex">
        <div className="flex h-8 w-full items-center gap-2 rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-muted-foreground">
          <Search size={14} strokeWidth={1.5} />
          <input
            ref={searchRef}
            placeholder="Search Filters, Samples, or Contaminants..."
            className="h-full w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="no-drag flex items-center gap-3">
        <button
          className="rounded-[6px] border border-input px-2 py-1 text-xs text-muted-foreground"
          onClick={() => {
            const next =
              pulseState === 'idle' ? 'running' : pulseState === 'running' ? 'error' : 'idle'
            setPulseState(next)
          }}
        >
          <span className={`mr-1 inline-block h-2 w-2 rounded-full ${pulseClass}`} />
          Quantum Pulse
        </button>
        <span className="font-mono text-xs text-muted-foreground">{timerLabel}</span>
        <span className="hidden text-xs text-muted-foreground xl:inline">
          {engineMode} · {precision}
        </span>
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
