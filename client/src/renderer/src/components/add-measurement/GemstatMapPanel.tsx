import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import {
  createMeasurement,
  getGemstatLocations,
  getGemstatStationMeasurements,
  type GemstatLocation,
  type GemstatLocationRow,
  type GemstatStationMeasurementRow,
} from '@renderer/utils/api'

type Step = 'map' | 'timestamps'
const OpenStreetMapPointsCard = lazy(() => import('@renderer/components/OpenStreetMapPointsCard'))

type DateRow = {
  rowKey: string
  stamp: string
  sampleDate: string
  sampleTime: string
  depth: number | null
  temperature: number | null
  ph: number | null
  parameters: Array<{
    parameterCode: string
    parameterName?: string | null
    unit?: string | null
    value: number
  }>
  valuesByParameter: Record<string, number>
}

const formatStationTitle = (station: GemstatLocation): string => {
  return (
    station.waterBodyName ??
    station.stationNarrative ??
    station.stationIdentifier ??
    station.localStationNumber ??
    'Unnamed station'
  )
}

const toDateRows = (
  stationRows: GemstatLocationRow[],
  flattenedRows: GemstatStationMeasurementRow[],
): DateRow[] => {
  if (stationRows.length > 0) {
    return stationRows
      .map((row) => ({
        rowKey: `${row.dateKey}-${row.sampleTime}-${row.snapshotIndex}`,
        stamp: `${row.dateKey} ${row.sampleTime}`,
        sampleDate: row.dateKey,
        sampleTime: row.sampleTime,
        depth: row.depth,
        temperature: row.temperature,
        ph: row.ph,
        parameters: (row.parameters ?? []).filter(
          (parameter) => typeof parameter.value === 'number' && Number.isFinite(parameter.value),
        ),
        valuesByParameter: Object.fromEntries(
          (row.parameters ?? [])
            .filter((parameter) => typeof parameter.value === 'number' && Number.isFinite(parameter.value))
            .map((parameter) => [parameter.parameterCode, parameter.value]),
        ),
      }))
      .sort((a, b) => `${a.sampleDate} ${a.sampleTime}`.localeCompare(`${b.sampleDate} ${b.sampleTime}`))
  }

  const grouped = new Map<string, DateRow>()
  for (const row of flattenedRows) {
    const rowKey = `${row.sampleDate}-${row.sampleTime}`
    const stamp = `${row.sampleDate} ${row.sampleTime}`
    if (!grouped.has(rowKey)) {
      grouped.set(rowKey, {
        rowKey,
        stamp,
        sampleDate: row.sampleDate,
        sampleTime: row.sampleTime,
        depth: row.depth,
        temperature: null,
        ph: null,
        parameters: [],
        valuesByParameter: {},
      })
    }
    const existing = grouped.get(rowKey)
    if (!existing) continue
    existing.valuesByParameter[row.parameterCode] = row.value
    existing.parameters.push({
      parameterCode: row.parameterCode,
      parameterName: null,
      unit: row.unit,
      value: row.value,
    })
  }

  return Array.from(grouped.values()).sort((a, b) =>
    `${a.sampleDate} ${a.sampleTime}`.localeCompare(`${b.sampleDate} ${b.sampleTime}`),
  )
}

const toSampleTimeWithSeconds = (sampleTime: string): string => {
  if (/^\d{2}:\d{2}:\d{2}$/.test(sampleTime)) return sampleTime
  if (/^\d{2}:\d{2}$/.test(sampleTime)) return `${sampleTime}:00`
  return sampleTime
}

function renderProbeValueChips(parameters: DateRow['parameters']): React.JSX.Element {
  const MAX_VISIBLE = 8
  const visible = parameters.filter(
    (p) => typeof p.value === 'number' && Number.isFinite(p.value),
  )

  const shown = visible.slice(0, MAX_VISIBLE)
  const remaining = Math.max(0, visible.length - shown.length)

  if (visible.length === 0) {
    return <span className="text-xs text-muted-foreground">No values</span>
  }

  const normalizeSymbolText = (text: string): string => {
    // Some Electron environments render certain unicode symbols as '?' (or show U+FFFD "replacement char").
    // Normalize them to ASCII so the UI stays readable.
    const normalized = text
      .replaceAll('µ', 'u')
      .replaceAll('μ', 'u')
      .replaceAll('°', 'deg ')
      .replaceAll('�', 'u')

    // Heuristic: if unit looks like micrograms and the leading glyph was corrupted,
    // convert `?g/l` -> `ug/l` (and similar).
    if (normalized.includes('g/l') && normalized.includes('?')) {
      // Common corruption patterns we see in unit prefixes:
      //   ?g/l  -> ug/l
      //   ?g    -> ug
      // We'll do a conservative replacement only when the unit contains both g and l.
      const replaced = normalized.replaceAll('?g/l', 'ug/l').replaceAll('?g', 'ug').replaceAll('?l', 'l')
      return replaced.includes('ug/l') ? replaced : replaced.replaceAll('?', 'u')
    }

    // If the backend/client already contains a literal `?` (common with corrupted unicode),
    // remove it so the UI doesn't show placeholder glyphs.
    return normalized.replaceAll('?', '')
  }

  return (
    <div className="flex max-w-[560px] flex-wrap items-center gap-x-2 gap-y-1.5">
      {shown.map((parameter) => {
        const unitText = parameter.unit?.trim()
        const unit = unitText ? ` ${normalizeSymbolText(unitText)}` : ''
        const label = normalizeSymbolText(parameter.parameterCode ?? parameter.parameterName ?? 'Parameter')
        const valueText = Number.isFinite(parameter.value)
          ? normalizeSymbolText(parameter.value.toString())
          : normalizeSymbolText(String(parameter.value))

        return (
          <span
            key={`${label}-${valueText}-${parameter.unit ?? ''}`}
            className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] leading-tight text-foreground"
            title={`${label}: ${valueText}${unit}`}
          >
            {label}: {valueText}
            {unit}
          </span>
        )
      })}
      {remaining > 0 ? (
        <span className="text-[11px] text-muted-foreground">+{remaining} more</span>
      ) : null}
    </div>
  )
}

export function GemstatMapPanel(): React.JSX.Element {
  const [step, setStep] = useState<Step>('map')
  const [locations, setLocations] = useState<GemstatLocation[] | null>(null)
  const [selectedStation, setSelectedStation] = useState<GemstatLocation | null>(null)
  const [stationRows, setStationRows] = useState<GemstatLocationRow[]>([])
  const [stationMeasurements, setStationMeasurements] = useState<GemstatStationMeasurementRow[]>([])
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null)
  const [measurementName, setMeasurementName] = useState('')
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStation, setIsLoadingStation] = useState(false)
  const [canRenderMap, setCanRenderMap] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      setIsLoading(true)
      try {
        const result = await getGemstatLocations()
        if (cancelled) return
        setLocations(result.locations)
      } catch (e) {
        console.error(e)
        if (cancelled) return
        setError('Failed to load map locations')
        setLocations([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (step !== 'map') return
    if (isLoading || !locations || locations.length === 0) {
      setCanRenderMap(false)
      return
    }

    setCanRenderMap(false)

    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setCanRenderMap(true)
      })
    })

    return () => {
      window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
    }
  }, [step, isLoading, locations])

  const sampleRows = useMemo(
    () => toDateRows(stationRows, stationMeasurements),
    [stationRows, stationMeasurements],
  )

  const loadStationData = async (station: GemstatLocation): Promise<boolean> => {
    setIsLoadingStation(true)
    setError(null)

    try {
      const stationData = await getGemstatStationMeasurements(station.locationId)
      setStationRows(stationData.rows ?? [])
      setStationMeasurements(stationData.measurements)
      setActionMessage(null)
      return true
    } catch (e) {
      console.error(e)
      setError('Failed to load station parameter history')
      return false
    } finally {
      setIsLoadingStation(false)
    }
  }

  const onSelectStation = (station: GemstatLocation): void => {
    // Selection only; station data fetch happens on the button click.
    if (isLoadingStation) return
    setSelectedStation(station)
    setStationRows([])
    setStationMeasurements([])
    setActiveRowKey(null)
    setActionMessage(null)
    setError(null)
  }

  const onContinueFromMap = async (): Promise<void> => {
    if (!selectedStation) return
    const ok = await loadStationData(selectedStation)
    if (!ok) return
    setStep('timestamps')
  }

  const onAskNameForRow = (row: DateRow): void => {
    setActiveRowKey(row.rowKey)
    setActionMessage(null)
    const defaultName = `${selectedStation ? formatStationTitle(selectedStation) : 'Station'} - ${row.stamp}`
    setMeasurementName(defaultName)
  }

  const onSaveRowMeasurement = async (row: DateRow): Promise<void> => {
    setIsSavingMeasurement(true)
    setError(null)
    setActionMessage(null)
    try {
      await createMeasurement({
        name: measurementName.trim() || undefined,
        source: 'gemstat',
        sampleDate: row.sampleDate,
        sampleTime: toSampleTimeWithSeconds(row.sampleTime),
        depth: row.depth ?? undefined,
        temperature: row.temperature ?? 0,
        ph: row.ph ?? 0,
        parameters: row.parameters.map((parameter) => ({
          parameterCode: parameter.parameterCode,
          parameterName: parameter.parameterName ?? undefined,
          unit: parameter.unit ?? undefined,
          value: parameter.value,
        })),
        sampleLocation: selectedStation
          ? {
              station_id: selectedStation.localStationNumber ?? selectedStation.stationIdentifier,
              country: selectedStation.countryName,
              water_type: selectedStation.waterType,
              station_identifier: selectedStation.stationIdentifier,
              latitude: selectedStation.latitude,
              longitude: selectedStation.longitude,
            }
          : undefined,
      })
      setActionMessage(`Added timestamp ${row.stamp} to measurements.`)
      setActiveRowKey(null)
      setMeasurementName('')
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'Failed to add station timestamp as measurement.'
      setError(message)
    } finally {
      setIsSavingMeasurement(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-[6px] border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">GemStat Map</h2>
        <p className="text-sm text-muted-foreground">
          Select a station and list all sample timestamps.
        </p>
      </div>
      {step === 'map' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {isLoading ? (
            <div className="flex items-center gap-2 rounded-[6px] border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading map data...
            </div>
          ) : null}
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="relative min-h-0 h-full overflow-hidden rounded-[6px] border border-border bg-muted">
              {!isLoading && locations && locations.length > 0 ? (
                <>
                  {canRenderMap ? (
                    <Suspense
                      fallback={
                        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Preparing interactive map...
                        </div>
                      }
                    >
                      <OpenStreetMapPointsCard
                        points={locations}
                        selectedLocationId={selectedStation?.locationId ?? null}
                        onSelectPoint={(point) => {
                          void onSelectStation(point)
                        }}
                      />
                    </Suspense>
                  ) : null}
                </>
              ) : !isLoading && locations && locations.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No map points returned by backend for this account.
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Preparing map data...
                </div>
              )}
            </div>
            <div className="rounded-[6px] border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold">Selected station</h3>
              {selectedStation ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="font-medium">{formatStationTitle(selectedStation)}</p>
                  <p className="text-muted-foreground">
                    <span className="mr-1 font-medium text-foreground">Station #:</span>
                    {selectedStation.localStationNumber ?? selectedStation.stationIdentifier ?? 'N/A'}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="mr-1 font-medium text-foreground">Country:</span>
                    {selectedStation.countryName ?? 'Unknown'}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="mr-1 font-medium text-foreground">Water type:</span>
                    {selectedStation.waterType ?? 'Unknown'}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="mr-1 font-medium text-foreground">Coordinates:</span>
                    {selectedStation.latitude.toFixed(4)}, {selectedStation.longitude.toFixed(4)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Click a map point to inspect and select a station.
                </p>
              )}
              <Button
                className="mt-4 w-full"
                disabled={!selectedStation || isLoadingStation}
                onClick={() => void onContinueFromMap()}
              >
                Show station timestamps
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 'timestamps' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">
                {selectedStation ? formatStationTitle(selectedStation) : 'Station'}
              </h3>
              <p className="text-sm text-muted-foreground">
                All timestamps for this station.
              </p>
            </div>
            <Button variant="outline" onClick={() => setStep('map')} disabled={isLoadingStation}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to map
            </Button>
          </div>
          <div className="overflow-x-auto rounded-[6px] border border-border">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Timestamp</th>
                  <th className="px-3 py-2 font-medium">Probe values</th>
                  <th className="px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row) => (
                  <tr key={row.stamp} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{row.stamp}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {renderProbeValueChips(row.parameters)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {activeRowKey === row.rowKey ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            value={measurementName}
                            onChange={(event) => setMeasurementName(event.target.value)}
                            placeholder="Measurement name"
                            className="h-8 w-64 rounded-[6px] border border-input bg-background px-2 text-xs"
                          />
                          <Button
                            size="sm"
                            onClick={() => void onSaveRowMeasurement(row)}
                            disabled={!measurementName.trim() || isSavingMeasurement}
                          >
                            {isSavingMeasurement ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveRowKey(null)
                              setMeasurementName('')
                            }}
                            disabled={isSavingMeasurement}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => onAskNameForRow(row)}>
                          Add to measurement
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {sampleRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-muted-foreground">
                      No timestamps found for this station.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {actionMessage ? <p className="text-sm text-emerald-600">{actionMessage}</p> : null}
    </div>
  )
}
