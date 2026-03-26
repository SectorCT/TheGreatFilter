import { ArrowLeft, FileUp, Keyboard, Map, type LucideIcon, Usb } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CsvImportPanel } from '@renderer/components/add-measurement/CsvImportPanel'
import { GemstatMapPanel } from '@renderer/components/add-measurement/GemstatMapPanel'
import { ManualEntryPanel } from '@renderer/components/add-measurement/ManualEntryPanel'
import { UsbEntryPanel } from '@renderer/components/add-measurement/UsbEntryPanel'

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

export function AddMeasurement(): React.JSX.Element {
  const navigate = useNavigate()
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => (selectedMethod ? setSelectedMethod(null) : navigate('/dashboard'))}
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
        <div className="mx-auto w-full max-w-[900px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {methods.map((method) => {
              const Icon = method.icon
              return (
                <button
                  key={method.key}
                  onClick={() => setSelectedMethod(method.key)}
                  className="flex min-h-[150px] flex-col items-start justify-start gap-2 rounded-[6px] border border-border bg-card p-5 text-left transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border bg-muted/30">
                      <Icon size={18} strokeWidth={1.5} className="text-muted-foreground" />
                    </span>
                    <p className="font-medium">{method.label}</p>
                  </div>
                  <p className="text-sm text-muted-foreground break-words">{method.description}</p>
                  <div className="mt-auto pt-2">
                    <p className="text-xs text-muted-foreground">Continue</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {selectedMethod === 'manual' ? (
        <ManualEntryPanel />
      ) : null}

      {selectedMethod === 'usb' ? (
        <UsbEntryPanel onBack={() => setSelectedMethod(null)} />
      ) : null}

      {selectedMethod === 'map' ? (
        <GemstatMapPanel />
      ) : null}
      {selectedMethod === 'csv' ? (
        <CsvImportPanel />
      ) : null}
    </div>
  )
}
