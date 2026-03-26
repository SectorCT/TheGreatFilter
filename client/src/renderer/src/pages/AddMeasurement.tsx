import { ArrowLeft, FileUp, Keyboard, Map, type LucideIcon, Usb } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type Method = 'manual' | 'usb' | 'map' | 'csv'

const methods: { key: Method; label: string; description: string; icon: LucideIcon }[] = [
  {
    key: 'manual',
    label: 'Manual Input',
    description: 'Enter parameters directly',
    icon: Keyboard
  },
  {
    key: 'usb',
    label: 'Lab Equipment (USB)',
    description: 'Import from connected sensor',
    icon: Usb
  },
  { key: 'map', label: 'GemStat Map', description: 'Select from global stations', icon: Map },
  { key: 'csv', label: 'Import CSV', description: 'Upload measurement file', icon: FileUp }
]

function PlaceholderPanel({
  title,
  description
}: {
  title: string
  description: string
}): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="space-y-4 rounded-[6px] border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex h-52 items-center justify-center rounded-[6px] border border-dashed border-border bg-muted">
        {title.includes('Map') ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Map size={24} strokeWidth={1.5} />
            <span className="text-sm">Map placeholder</span>
          </div>
        ) : title.includes('CSV') ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FileUp size={24} strokeWidth={1.5} />
            <span className="text-sm">Drop CSV file here</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Usb size={24} strokeWidth={1.5} />
            <span className="text-sm">USB device placeholder</span>
          </div>
        )}
      </div>
      <Button onClick={() => navigate('/dashboard')}>Continue</Button>
    </div>
  )
}

export function AddMeasurement(): React.JSX.Element {
  const navigate = useNavigate()
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="rounded-[6px] p-1.5 transition-colors hover:bg-secondary"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-xl font-semibold">Add Water Measurement</h1>
          <p className="text-sm text-muted-foreground">Select input method</p>
        </div>
      </div>

      {!selectedMethod ? (
        <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {methods.map((method) => {
            const Icon = method.icon
            return (
              <button
                key={method.key}
                onClick={() => setSelectedMethod(method.key)}
                className="rounded-[6px] border border-border bg-card p-4 text-left transition-colors hover:bg-secondary"
              >
                <Icon size={18} strokeWidth={1.5} className="mb-2 text-muted-foreground" />
                <p className="font-medium">{method.label}</p>
                <p className="text-sm text-muted-foreground">{method.description}</p>
              </button>
            )
          })}
        </div>
      ) : null}

      {selectedMethod === 'manual' ? (
        <div className="max-w-4xl rounded-[6px] border border-border bg-card p-4 md:p-5">
          <div className="mb-4">
            <label className="scientific-label mb-1 block">Measurement Label</label>
            <input className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <p className="scientific-label mb-2">Parameters</p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {[
              { label: 'Temperature (deg C)', required: true },
              { label: 'pH', required: true },
              { label: 'Dissolved Oxygen (mg/L)', required: false },
              { label: 'Conductivity (uS/cm)', required: false },
              { label: 'Turbidity (NTU)', required: false },
              { label: 'Nitrate (mg/L)', required: false },
              { label: 'Phosphate (mg/L)', required: false },
              { label: 'Total Hardness (mg/L)', required: false },
              { label: 'Total Dissolved Solids (mg/L)', required: false },
              { label: 'Chloride (mg/L)', required: false }
            ].map(({ label, required }) => (
              <div key={label}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {label}
                  {required ? <span className="ml-1 text-destructive">*</span> : null}
                </label>
                <input
                  className={cn(
                    'h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                    'font-mono'
                  )}
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => navigate('/dashboard')}>Save Measurement</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Save &amp; Generate Filter
            </Button>
          </div>
        </div>
      ) : null}

      {selectedMethod === 'usb' ? (
        <PlaceholderPanel
          title="Lab Equipment (USB)"
          description="Import water measurement from connected hardware sensor."
        />
      ) : null}
      {selectedMethod === 'map' ? (
        <PlaceholderPanel
          title="GemStat Map"
          description="Select a station from the map and continue with dataset import."
        />
      ) : null}
      {selectedMethod === 'csv' ? (
        <PlaceholderPanel
          title="Import CSV"
          description="Upload a CSV file containing water quality parameter values."
        />
      ) : null}
    </div>
  )
}
