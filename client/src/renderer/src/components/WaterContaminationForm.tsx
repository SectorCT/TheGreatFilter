import { FormEvent, useMemo, useState } from 'react'
import { contaminationParameters, type ParameterOption } from '../data/contaminationParameters'

type FormPayload = {
  parameter: ParameterOption
  measuredValue: string
  optional: {
    sampleDate?: string
    location?: string
    notes?: string
  }
}

const filterParameter = (option: ParameterOption, search: string): boolean => {
  if (!search) return true
  const query = search.toLowerCase()
  const searchable =
    `${option.name} ${option.code} ${option.group} ${option.file} ${option.unit}`.toLowerCase()
  return searchable.includes(query)
}

function WaterContaminationForm(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [measuredValue, setMeasuredValue] = useState('')
  const [sampleDate, setSampleDate] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [submittedPayload, setSubmittedPayload] = useState<FormPayload | null>(null)

  const filteredOptions = useMemo(
    () => contaminationParameters.filter((option) => filterParameter(option, searchTerm)),
    [searchTerm]
  )

  const selectedParameter = useMemo(
    () => contaminationParameters.find((option) => option.id === selectedId) ?? null,
    [selectedId]
  )

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (!selectedParameter) {
      setError('Please select a parameter first.')
      return
    }
    if (!measuredValue.trim()) {
      setError('Measured value is required.')
      return
    }
    setError('')

    setSubmittedPayload({
      parameter: selectedParameter,
      measuredValue: measuredValue.trim(),
      optional: {
        sampleDate: sampleDate || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined
      }
    })
  }

  return (
    <section className="water-form-shell">
      <header className="water-form-header">
        <h1>Water Contamination Entry</h1>
        <p>Select a parameter, enter measured value, and submit.</p>
      </header>

      <form className="water-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Search parameter</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, code, group, file..."
          />
        </label>

        <label className="field">
          <span>Parameter</span>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            required
          >
            <option value="">Select parameter</option>
            {filteredOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.code}) - {option.unit}
              </option>
            ))}
          </select>
        </label>

        {selectedParameter ? (
          <div className="meta-card">
            <p>
              <strong>Group:</strong> {selectedParameter.group}
            </p>
            <p>
              <strong>File:</strong> {selectedParameter.file}
            </p>
            <p>
              <strong>Code:</strong> {selectedParameter.code}
            </p>
            <p>
              <strong>Name:</strong> {selectedParameter.name}
            </p>
            <p>
              <strong>Unit:</strong> {selectedParameter.unit}
            </p>
          </div>
        ) : null}

        <label className="field">
          <span>
            Measured value <em>(required)</em>
          </span>
          <input
            type="text"
            value={measuredValue}
            onChange={(event) => setMeasuredValue(event.target.value)}
            placeholder={
              selectedParameter ? `Value in ${selectedParameter.unit}` : 'Enter measured value'
            }
            required
          />
        </label>

        <details className="optional-details">
          <summary>Optional details</summary>
          <div className="optional-grid">
            <label className="field">
              <span>Sample date</span>
              <input
                type="date"
                value={sampleDate}
                onChange={(event) => setSampleDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Location / site</span>
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Sampling location"
              />
            </label>
            <label className="field notes-field">
              <span>Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Any additional context"
              />
            </label>
          </div>
        </details>

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit">Save measurement</button>
      </form>

      {submittedPayload ? (
        <article className="submit-preview">
          <h2>Latest payload (dev preview)</h2>
          <pre>{JSON.stringify(submittedPayload, null, 2)}</pre>
        </article>
      ) : null}
    </section>
  )
}

export default WaterContaminationForm
