import { FileUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'

export function CsvImportPanel(): React.JSX.Element {
  const navigate = useNavigate()

  return (
    <div className="space-y-4 rounded-[6px] border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">Import CSV</h2>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file containing water quality parameter values.
        </p>
      </div>
      <div className="flex h-52 items-center justify-center rounded-[6px] border border-dashed border-border bg-muted">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <FileUp size={24} strokeWidth={1.5} />
          <span className="text-sm">Drop CSV file here</span>
        </div>
      </div>
      <Button onClick={() => navigate('/dashboard')}>Continue</Button>
    </div>
  )
}
