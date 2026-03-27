/**
 * Client-only JSON import flow: treat uploaded API-shaped JSON like a saved filter without persisting.
 * Route id {@link IMPORTED_FILTER_ROUTE_ID} + location state / sessionStorage backup.
 */
import type { Location as RouterLocation } from 'react-router-dom'
import type {
  FilterDetailsSuccessResponse,
  FilterInfo,
  FilterLayerRow
} from '@renderer/utils/api/types'
import {
  collectAtomPositions,
  collectConnections,
  filterToPollutantLayerRows
} from '@renderer/utils/normalizeFilterStructure'

export const IMPORTED_FILTER_ROUTE_ID = 'imported' as const

const SESSION_KEY = 'thegreatfilter:imported-filter-json-v1'

export type ImportedFilterLocationState = {
  importedFilterJson: unknown
  importedFileName?: string
}

export function writeImportedFilterSession(state: ImportedFilterLocationState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch {
    // ignore quota / private mode
  }
}

export function readImportedFilterSession(
  location: Pick<RouterLocation, 'state'>
): ImportedFilterLocationState | null {
  const st = location.state as ImportedFilterLocationState | null
  if (st?.importedFilterJson !== undefined) return st
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ImportedFilterLocationState
  } catch {
    return null
  }
}

export function isImportedFilterRouteId(id: string | undefined): boolean {
  return id === IMPORTED_FILTER_ROUTE_ID
}

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const toFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined

const normalizeAtomPositions = (
  value: unknown,
): Array<{ id?: string | number; x: number; y: number; z: number; element: string }> | undefined => {
  if (!Array.isArray(value)) return undefined
  const atoms: Array<{ id?: string | number; x: number; y: number; z: number; element: string }> = []
  for (const entry of value) {
    const item = toRecord(entry)
    if (!item) continue
    const x = toFiniteNumber(item.x)
    const y = toFiniteNumber(item.y)
    const z = toFiniteNumber(item.z)
    const element = toStringOrUndefined(item.element)
    if (x == null || y == null || z == null || !element) continue
    atoms.push({
      id: typeof item.id === 'string' || typeof item.id === 'number' ? item.id : undefined,
      x,
      y,
      z,
      element,
    })
  }
  return atoms
}

const normalizeConnections = (
  value: unknown,
): Array<{ from: string | number; to: string | number; order?: number }> | undefined => {
  if (!Array.isArray(value)) return undefined
  const connections: Array<{ from: string | number; to: string | number; order?: number }> = []
  for (const entry of value) {
    const item = toRecord(entry)
    if (!item) continue
    const from = item.from
    const to = item.to
    if ((typeof from !== 'string' && typeof from !== 'number') || (typeof to !== 'string' && typeof to !== 'number')) {
      continue
    }
    const order = toFiniteNumber(item.order)
    connections.push({ from, to, order })
  }
  return connections
}

/** Normalize various JSON export shapes into `FilterInfo` for visualization / analysis / simulation. */
export function normalizeImportedFilterInfo(payload: unknown): FilterInfo {
  const parsed = toRecord(payload)
  if (!parsed) throw new Error('JSON root must be an object.')

  const rawFilterInfo = toRecord(parsed.filterInfo) ?? parsed
  const nestedFilterStructure = toRecord(rawFilterInfo.filterStructure)
  const nestedResultPayload = toRecord(rawFilterInfo.resultPayload)
  const nestedExperimentPayload = toRecord(rawFilterInfo.experimentPayload)
  const nestedSummaryMetrics =
    toRecord(rawFilterInfo.summaryMetrics) ?? toRecord(nestedFilterStructure?.summaryMetrics)

  const filterStructureDraft: FilterInfo['filterStructure'] = {
    ...(nestedFilterStructure as FilterInfo['filterStructure']),
    poreSize: toFiniteNumber(nestedFilterStructure?.poreSize) ?? toFiniteNumber(rawFilterInfo.poreSize),
    layerThickness:
      toFiniteNumber(nestedFilterStructure?.layerThickness) ?? toFiniteNumber(rawFilterInfo.layerThickness),
    latticeSpacing:
      toFiniteNumber(nestedFilterStructure?.latticeSpacing) ?? toFiniteNumber(rawFilterInfo.latticeSpacing),
    materialType:
      toStringOrUndefined(nestedFilterStructure?.materialType) ?? toStringOrUndefined(rawFilterInfo.materialType),
    atomPositions: normalizeAtomPositions(nestedFilterStructure?.atomPositions ?? rawFilterInfo.atomPositions),
    connections: normalizeConnections(nestedFilterStructure?.connections ?? rawFilterInfo.connections),
  }

  const collectedAtoms = collectAtomPositions(filterStructureDraft)
  const collectedConns = collectConnections(filterStructureDraft)
  const fallbackAtoms = filterStructureDraft.atomPositions
  const fallbackConns = filterStructureDraft.connections
  const filterStructure: FilterInfo['filterStructure'] = {
    ...filterStructureDraft,
    atomPositions:
      collectedAtoms.length > 0 ? collectedAtoms : fallbackAtoms && fallbackAtoms.length > 0 ? fallbackAtoms : [],
    connections:
      collectedConns.length > 0 ? collectedConns : fallbackConns && fallbackConns.length > 0 ? fallbackConns : [],
  }

  const importedLayersMerged = filterToPollutantLayerRows(
    rawFilterInfo.layers ?? nestedFilterStructure?.layers,
  )
  const importedLayers: FilterLayerRow[] | undefined =
    importedLayersMerged.length > 0 ? importedLayersMerged : undefined

  const resultPayload = {
    ...(nestedResultPayload ?? {}),
    bindingEnergy:
      toFiniteNumber(nestedResultPayload?.bindingEnergy) ?? toFiniteNumber(rawFilterInfo.bindingEnergy),
    removalEfficiency:
      toFiniteNumber(nestedResultPayload?.removalEfficiency) ?? toFiniteNumber(rawFilterInfo.removalEfficiency),
    pollutant: toStringOrUndefined(nestedResultPayload?.pollutant) ?? toStringOrUndefined(rawFilterInfo.pollutant),
    pollutantSymbol:
      toStringOrUndefined(nestedResultPayload?.pollutantSymbol) ??
      toStringOrUndefined(rawFilterInfo.pollutantSymbol),
  }

  const normalized: FilterInfo = {
    filterStructure,
    resultPayload,
    experimentPayload: nestedExperimentPayload ?? undefined,
    summaryMetrics: nestedSummaryMetrics ?? undefined,
    layers: importedLayers,
  }

  const hasCoordinates =
    Array.isArray(filterStructure.atomPositions) && filterStructure.atomPositions.length > 0
  const hasBondGraph =
    Array.isArray(filterStructure.connections) && filterStructure.connections.length > 0
  const hasAnyMetric =
    typeof filterStructure.materialType === 'string' ||
    typeof filterStructure.poreSize === 'number' ||
    typeof resultPayload.bindingEnergy === 'number' ||
    typeof resultPayload.removalEfficiency === 'number'
  const hasSummaryMetrics =
    nestedSummaryMetrics != null &&
    typeof nestedSummaryMetrics === 'object' &&
    Object.keys(nestedSummaryMetrics).length > 0
  const hasPerPollutantLayers = importedLayers != null && importedLayers.length > 0

  if (!hasCoordinates && !hasAnyMetric && !hasBondGraph && !hasPerPollutantLayers && !hasSummaryMetrics) {
    throw new Error('JSON does not contain recognizable filter visualization fields.')
  }

  return normalized
}

export function buildFilterDetailsFromImportedJson(
  payload: unknown,
  _fileName?: string,
): FilterDetailsSuccessResponse {
  const parsed = toRecord(payload)
  if (!parsed) throw new Error('JSON root must be an object.')
  const filterInfo = normalizeImportedFilterInfo(payload)

  const rootFilterId = typeof parsed.filterId === 'string' ? parsed.filterId : undefined
  const filterId = rootFilterId ?? IMPORTED_FILTER_ROUTE_ID
  const studyId = typeof parsed.studyId === 'string' ? parsed.studyId : ''
  const measurementId = typeof parsed.measurementId === 'string' ? parsed.measurementId : ''

  return {
    filterId,
    studyId,
    studyName: typeof parsed.studyName === 'string' ? parsed.studyName : undefined,
    measurementId,
    measurementName: typeof parsed.measurementName === 'string' ? parsed.measurementName : undefined,
    status: 'Success',
    usedQuantumComputer: typeof parsed.usedQuantumComputer === 'boolean' ? parsed.usedQuantumComputer : undefined,
    filterInfo,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
  }
}
