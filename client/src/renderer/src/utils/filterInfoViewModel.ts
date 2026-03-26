import type { FilterInfo } from '@renderer/utils/api/types'

export type NormalizedParam = {
  code: string
  name: string
  value: number
  unit: string
}

export type FilterInfoViewModel = {
  params: NormalizedParam[]
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
  parameterBarData: Array<{ name: string; code: string; value: number; unit: string }>
  parameterRadarData: Array<{ parameter: string; value: number }>
  atomPositions: Array<{ x: number; y: number; z: number; element: string }>
}

const safeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const safeString = (value: unknown, fallback = 'n/a'): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback

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

  const maxParam = params.reduce((acc, p) => Math.max(acc, p.value), 0)
  const parameterRadarData = params.map((p) => ({
    parameter: p.code,
    value: maxParam > 0 ? Math.round((p.value / maxParam) * 100) : 0
  }))
  const parameterBarData = params.map((p) => ({
    name: p.name,
    code: p.code,
    value: Number(p.value.toFixed(4)),
    unit: p.unit
  }))

  const rawAtoms = info?.filterStructure?.atomPositions ?? []
  const atomPositions = rawAtoms.filter(
    (a) =>
      safeNumber(a?.x) !== null &&
      safeNumber(a?.y) !== null &&
      safeNumber(a?.z) !== null &&
      typeof a?.element === 'string'
  )

  return {
    params,
    parameterBarData,
    parameterRadarData,
    atomPositions,
    metrics: {
      materialType: safeString(info?.filterStructure?.materialType ?? info?.summaryMetrics?.materialType),
      poreSize: safeNumber(info?.filterStructure?.poreSize),
      layerThickness: safeNumber(info?.filterStructure?.layerThickness),
      latticeSpacing: safeNumber(info?.filterStructure?.latticeSpacing),
      bindingEnergy: safeNumber(info?.resultPayload?.bindingEnergy ?? info?.summaryMetrics?.bindingEnergy),
      removalEfficiency: safeNumber(
        info?.resultPayload?.removalEfficiency ?? info?.summaryMetrics?.removalEfficiency
      ),
      pollutant: safeString(info?.resultPayload?.pollutant),
      pollutantSymbol: safeString(info?.resultPayload?.pollutantSymbol),
      parameterCount:
        safeNumber(info?.summaryMetrics?.parameter_count) ?? (params.length > 0 ? params.length : 0),
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
