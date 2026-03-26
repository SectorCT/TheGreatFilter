import { FileUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { importMeasurementCsv } from '@renderer/utils/api'

export function CsvImportPanel(): React.JSX.Element {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (): Promise<void> => {
    if (!file) {
      setError('Please choose a CSV file first.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await importMeasurementCsv(file, name.trim() || undefined)
      navigate('/dashboard')
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Failed to import CSV measurement.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 rounded-[6px] border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">Import CSV</h2>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file containing water quality parameter values.
        </p>
      </div>
      <div>
        <label className="scientific-label mb-1 block">Name (optional)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Example: March station import"
          className="h-9 w-full rounded-[6px] border border-input bg-surface-elevated px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          setError(null)
          setFile(e.target.files?.[0] ?? null)
        }}
      />
      <div
        className="flex h-52 cursor-pointer items-center justify-center rounded-[6px] border border-dashed border-border bg-muted"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <FileUp size={24} strokeWidth={1.5} />
          <span className="text-sm">{file ? file.name : 'Click to choose CSV file'}</span>
        </div>
      </div>
      <Button onClick={() => void handleUpload()} disabled={!file || isSubmitting}>
        {isSubmitting ? 'Importing...' : 'Import Measurement'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
