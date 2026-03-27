import type { FilterInfo, FilterLayerRow } from '@renderer/utils/api/types'
import {
  collectAtomPositions,
  collectConnections,
  getAggregateBindingEnergyEv,
  getAggregatePoreSizeNm,
  getAggregateRemovalEfficiencyPercent,
  getFilterLayers,
  getSummaryMetrics
} from '@renderer/utils/normalizeFilterStructure'
import { buildExperimentParameterCharts } from '@renderer/utils/paramChartNormalization'

export type NormalizedParam = {
  code: string
  name: string
  value: number
  unit: string
}

/** Per-pollutant layer row normalized for display (multi-pollutant filters). */
export type NormalizedLayerRow = {
  pollutant: string
  pollutantSymbol: string
  removalEfficiency: number | null
  bindingEnergy: number | null
  poreSize: number | null
  layerThickness: number | null
  materialType: string
  method: string
}

export type FilterInfoViewModel = {
  params: NormalizedParam[]
  layerRows: NormalizedLayerRow[]
  metrics: {
    materialType: string
    poreSize: number | null
    layerThickness: number | null
    latticeSpacing: number | null
    bindingEnergy: number | null
    removalEfficiency: number | null
    pollutant: string
    pollutantSymbol: string
    parameterCount: number
    temperature: number | null
    ph: number | null
  }
  parameterBarData: Array<{ name: string; code: string; value: number; rawValue: number; unit: string }>
  parameterRadarData: Array<{ parameter: string; value: number }>
  parameterDonutData: Array<{ name: string; code: string; value: number; rawValue: number; unit: string }>
  atomPositions: Array<{ id: string; x: number; y: number; z: number; element: string }>
  atomConnections: Array<{ from: string; to: string; order: number }>
}

const safeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const safeString = (value: unknown, fallback = 'n/a'): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback

function normalizeLayerRows(layers: FilterLayerRow[]): NormalizedLayerRow[] {
  return layers.map((row) => ({
    pollutant: safeString(row.pollutant),
    pollutantSymbol: safeString(row.pollutantSymbol),
    removalEfficiency: safeNumber(row.removalEfficiency),
    bindingEnergy: safeNumber(row.bindingEnergy),
    poreSize: safeNumber(row.poreSize),
    layerThickness: safeNumber(row.layerThickness),
    materialType: safeString(row.materialType),
    method: safeString(row.method, '')
  }))
}

/** When top-level geometry is absent, use the first per-pollutant row for membrane labels (consistent with plan). */
function firstLayerGeometry(rows: NormalizedLayerRow[]): {
  poreSize: number | null
  layerThickness: number | null
  materialType: string
} {
  const first = rows[0]
  if (!first) {
    return { poreSize: null, layerThickness: null, materialType: 'n/a' }
  }
  return {
    poreSize: first.poreSize,
    layerThickness: first.layerThickness,
    materialType: first.materialType
  }
}

function multiPollutantLabels(rows: NormalizedLayerRow[]): { pollutant: string; pollutantSymbol: string } {
  if (rows.length === 0) return { pollutant: 'n/a', pollutantSymbol: 'n/a' }
  if (rows.length === 1) {
    return {
      pollutant: rows[0].pollutant !== 'n/a' ? rows[0].pollutant : 'n/a',
      pollutantSymbol: rows[0].pollutantSymbol !== 'n/a' ? rows[0].pollutantSymbol : 'n/a'
    }
  }
  const symbols = rows
    .map((r) => r.pollutantSymbol)
    .filter((s) => s !== 'n/a')
  const unique = [...new Set(symbols)]
  if (unique.length > 0) {
    const symLabel = unique.slice(0, 3).join(', ') + (unique.length > 3 ? '…' : '')
    return {
      pollutant: `${rows[0].pollutant !== 'n/a' ? rows[0].pollutant : unique[0]} +${rows.length - 1} more`,
      pollutantSymbol: symLabel
    }
  }
  return { pollutant: `${rows.length} targets`, pollutantSymbol: `${rows.length} layers` }
}

export const buildFilterInfoViewModel = (info: FilterInfo | null | undefined): FilterInfoViewModel => {
  const rawParams = info?.experimentPayload?.params ?? []
  const params: NormalizedParam[] = rawParams
    .map((p) => {
      const value = safeNumber(p.value)
      if (value === null) return null
      const code = safeString(p.name, 'UNKNOWN')
      return {
        code,
        name: code,
        value,
        unit: p.unit ?? ''
      }
    })
    .filter((p): p is NormalizedParam => p !== null)

  const paramCharts = buildExperimentParameterCharts(params)
  const parameterBarData = paramCharts.bar
  const parameterRadarData = paramCharts.radar
  const parameterDonutData = paramCharts.donut

  const fs = info?.filterStructure
  const rawAtoms = collectAtomPositions(fs)
  const atomPositions = rawAtoms
    .map((a, index) => {
      const x = safeNumber(a?.x)
      const y = safeNumber(a?.y)
      const z = safeNumber(a?.z)
      if (x === null || y === null || z === null || typeof a?.element !== 'string') return null
      return {
        id: String(a.id ?? index),
        x,
        y,
        z,
        element: a.element
      }
    })
    .filter((a): a is { id: string; x: number; y: number; z: number; element: string } => a !== null)
  const atomIdSet = new Set(atomPositions.map((a) => a.id))
  const rawConnections = collectConnections(fs)
  const atomConnections = rawConnections
    .map((connection) => {
      const from = String(connection.from)
      const to = String(connection.to)
      if (!atomIdSet.has(from) || !atomIdSet.has(to) || from === to) return null
      const order = safeNumber(connection.order) ?? 1
      return { from, to, order: Math.max(1, Math.round(order)) }
    })
    .filter((c): c is { from: string; to: string; order: number } => c !== null)

  const layerSource = getFilterLayers(info)
  const layerRows = normalizeLayerRows(layerSource)
  const firstGeom = firstLayerGeometry(layerRows)

  const summaryBlock = getSummaryMetrics(info)
  const summaryBinding = safeNumber(summaryBlock?.bindingEnergy)
  const summaryRemoval = safeNumber(summaryBlock?.removalEfficiency)
  const summaryMaterial = safeString(summaryBlock?.materialType, '')

  const topPore = safeNumber(fs?.poreSize)
  const topThick = safeNumber(fs?.layerThickness)
  const topLattice = safeNumber(fs?.latticeSpacing)
  const topMaterial = safeString(fs?.materialType, '')

  let materialType =
    topMaterial !== 'n/a' ? topMaterial : summaryMaterial !== 'n/a' ? summaryMaterial : firstGeom.materialType

  let poreSize = getAggregatePoreSizeNm(info) ?? topPore ?? firstGeom.poreSize
  let layerThickness = topThick ?? firstGeom.layerThickness
  const latticeSpacing = topLattice

  if (layerRows.length > 1 && topMaterial === 'n/a' && summaryMaterial === 'n/a') {
    const mats = new Set(layerRows.map((r) => r.materialType).filter((m) => m !== 'n/a'))
    if (mats.size > 1) {
      materialType = 'multi'
    }
  }

  const bindingEnergy =
    getAggregateBindingEnergyEv(info) ??
    safeNumber(info?.resultPayload?.bindingEnergy) ??
    summaryBinding ??
    null
  const removalEfficiency =
    getAggregateRemovalEfficiencyPercent(info) ??
    safeNumber(info?.resultPayload?.removalEfficiency) ??
    summaryRemoval ??
    null

  let pollutant = safeString(info?.resultPayload?.pollutant)
  let pollutantSymbol = safeString(info?.resultPayload?.pollutantSymbol)
  if (layerRows.length > 0 && (pollutant === 'n/a' || pollutantSymbol === 'n/a' || layerRows.length > 1)) {
    const labels = multiPollutantLabels(layerRows)
    if (pollutant === 'n/a' || layerRows.length > 1) pollutant = labels.pollutant
    if (pollutantSymbol === 'n/a' || layerRows.length > 1) pollutantSymbol = labels.pollutantSymbol
  }

  return {
    params,
    layerRows,
    parameterBarData,
    parameterRadarData,
    parameterDonutData,
    atomPositions,
    atomConnections,
    metrics: {
      materialType,
      poreSize,
      layerThickness,
      latticeSpacing,
      bindingEnergy,
      removalEfficiency,
      pollutant,
      pollutantSymbol,
      parameterCount:
        safeNumber(summaryBlock?.parameter_count) ?? (params.length > 0 ? params.length : 0),
      temperature: safeNumber(info?.experimentPayload?.temperature),
      ph: safeNumber(info?.experimentPayload?.ph)
    }
  }
}

export const atomPositionsToXyz = (
  atoms: Array<{ x: number; y: number; z: number; element: string }>
): string => {
  const lines = atoms.map((atom) => `${atom.element} ${atom.x} ${atom.y} ${atom.z}`)
  return `${atoms.length}\nGenerated from filterInfo.atomPositions\n${lines.join('\n')}`
}
