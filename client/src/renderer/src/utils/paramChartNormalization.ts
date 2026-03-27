export type ChartParam = { code: string; name: string; value: number; unit: string }

export type ParameterChartBarRow = {
  name: string
  code: string
  value: number
  rawValue: number
  unit: string
}

export type ParameterDonutRow = {
  name: string
  code: string
  value: number
  rawValue: number
  unit: string
}

function canonicalUnit(unitRaw: string): string {
  let s = unitRaw.trim().toLowerCase().replace(/\s+/g, '')
  s = s.replace(/\u03bc/g, 'µ')
  s = s.replace(/^ug\//, 'µg/')
  s = s.replace(/^us\//, 'µs/')
  return s
}

function massMicrogramsPerLiter(value: number, unitRaw: string): number | null {
  if (!Number.isFinite(value) || value < 0) return null
  const u = canonicalUnit(unitRaw)
  if (!u) return null

  if (u === 'mg/l' || u === 'ppm') return value * 1000
  if (u === 'µg/l') return value
  if (u === 'g/l') return value * 1e6
  if (u === 'ng/l') return value / 1000
  if (u === 'pg/l') return value / 1e6

  return null
}

function isConductivityUnit(unitRaw: string): boolean {
  const u = canonicalUnit(unitRaw)
  if (!u) return false
  if (u.includes('s/cm') || u.includes('s/m')) return true
  if (u === 'ec' || u === 'conductivity') return true
  return false
}

type Classified = ChartParam & {
  massUgL: number | null
  kind: 'mass' | 'conductivity' | 'other'
  unitKey: string
}

function classify(p: ChartParam): Classified {
  const ug = massMicrogramsPerLiter(p.value, p.unit)
  if (ug != null) return { ...p, massUgL: ug, kind: 'mass', unitKey: 'mass' }
  if (isConductivityUnit(p.unit)) return { ...p, massUgL: null, kind: 'conductivity', unitKey: 'conductivity' }
  return { ...p, massUgL: null, kind: 'other', unitKey: canonicalUnit(p.unit) || '—' }
}

function safeDivide(n: number, d: number): number {
  if (d <= 0 || !Number.isFinite(d)) return 0
  return Math.min(100, Math.max(0, (n / d) * 100))
}

export function buildExperimentParameterCharts(params: ChartParam[]): {
  bar: ParameterChartBarRow[]
  radar: Array<{ parameter: string; value: number }>
  donut: ParameterDonutRow[]
} {
  if (params.length === 0) {
    return { bar: [], radar: [], donut: [] }
  }

  const rows = params.map(classify)
  const massRows = rows.filter((r) => r.kind === 'mass')
  const condRows = rows.filter((r) => r.kind === 'conductivity')
  const maxMass = massRows.reduce((m, r) => Math.max(m, r.massUgL ?? 0), 0)
  const maxCond = condRows.reduce((m, r) => Math.max(m, r.value), 0)

  const maxByOtherKey = new Map<string, number>()
  for (const r of rows) {
    if (r.kind !== 'other') continue
    const k = r.unitKey
    maxByOtherKey.set(k, Math.max(maxByOtherKey.get(k) ?? 0, r.value))
  }

  const bar: ParameterChartBarRow[] = rows.map((r) => {
    let norm = 0
    if (r.kind === 'mass' && r.massUgL != null) {
      norm = safeDivide(r.massUgL, maxMass)
    } else if (r.kind === 'conductivity') {
      norm = safeDivide(r.value, maxCond)
    } else {
      const mx = maxByOtherKey.get(r.unitKey) ?? r.value
      norm = safeDivide(r.value, mx)
    }
    return {
      name: r.name,
      code: r.code,
      value: Number(norm.toFixed(2)),
      rawValue: r.value,
      unit: r.unit
    }
  })

  const radar = bar.map((b) => ({ parameter: b.code, value: Math.round(b.value) }))

  let donut: ParameterDonutRow[]
  if (massRows.length > 0) {
    const withMass = massRows.filter((r) => (r.massUgL ?? 0) > 0)
    donut =
      withMass.length > 0
        ? withMass.map((r) => ({
            name: r.name,
            code: r.code,
            value: r.massUgL ?? 0,
            rawValue: r.value,
            unit: r.unit
          }))
        : massRows.map((r) => ({
            name: r.name,
            code: r.code,
            value: Math.max(r.value, 1e-9),
            rawValue: r.value,
            unit: r.unit
          }))
  } else {
    const wsum = bar.reduce((s, b) => s + Math.max(b.value, 0.01), 0)
    donut = bar.map((b) => ({
      name: b.name,
      code: b.code,
      value: wsum > 0 ? (Math.max(b.value, 0.01) / wsum) * 100 : 0,
      rawValue: b.rawValue,
      unit: b.unit
    }))
  }

  donut.sort((a, b) => b.value - a.value)
  const topDonut = donut.slice(0, 5)

  return { bar, radar, donut: topDonut }
}
