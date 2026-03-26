import type { FilterInfo } from '@renderer/utils/api/types'

export type MoleculeType = {
  code: string
  name: string
  color: string
  radius: number
  filterable: boolean
  captureStage: number | null
  spawnWeight: number
}

export type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  type: MoleculeType
  captured: boolean
  captureX: number
  captureY: number
  passed: boolean
  opacity: number
}

export type SimulationStats = {
  totalSpawned: number
  totalPassed: number
  totalContaminantsSpawned: number
  capturedByType: Record<string, number>
}

export type SimulationConfig = {
  moleculeTypes: MoleculeType[]
  waterRatio: number
  removalEfficiency: number
  poreSize?: number
  materialType?: string
  temperature?: number
  ph?: number
  pollutant?: string
  bindingEnergy?: number
}

const SPAWN_RATE = 3
const BASE_SPEED = 1.8
const BROWNIAN_STRENGTH = 0.4
const FILTER_WIDTH_RATIO = 0.08
const FILTER_CENTER_RATIO = 0.48
const MAX_PARTICLES = 600

const KNOWN_MOLECULES: Record<string, { name: string; color: string; radius: number }> = {
  NO3: { name: 'Nitrate', color: '#22c55e', radius: 5 },
  PO4: { name: 'Phosphate', color: '#f59e0b', radius: 5.5 },
  FE: { name: 'Iron', color: '#ef4444', radius: 6 },
  MN: { name: 'Manganese', color: '#a855f7', radius: 5 },
  CL: { name: 'Chloride', color: '#14b8a6', radius: 4.5 },
  TDS: { name: 'Dissolved Solids', color: '#6b7280', radius: 7 },
  TURB: { name: 'Turbidity', color: '#78716c', radius: 6.5 },
  HARD: { name: 'Total Hardness', color: '#d97706', radius: 6 },
  COND: { name: 'Conductivity', color: '#0ea5e9', radius: 5 },
  DO: { name: 'Dissolved Oxygen', color: '#06b6d4', radius: 4 }
}

const FALLBACK_COLORS = ['#f472b6', '#fb923c', '#facc15', '#4ade80', '#818cf8', '#e879f9']
const NON_MOLECULAR_CODES = new Set(['PH', 'TEMP'])

const WATER_TYPE: MoleculeType = {
  code: 'H2O',
  name: 'Water',
  color: '#3b82f6',
  radius: 3,
  filterable: false,
  captureStage: null,
  spawnWeight: 1
}

export const DEFAULT_MOLECULE_TYPES: MoleculeType[] = [
  { ...WATER_TYPE },
  { code: 'NO3', name: 'Nitrate', color: '#22c55e', radius: 5, filterable: true, captureStage: 3, spawnWeight: 1 },
  { code: 'PO4', name: 'Phosphate', color: '#f59e0b', radius: 5.5, filterable: true, captureStage: 3, spawnWeight: 1 },
  { code: 'FE', name: 'Iron', color: '#ef4444', radius: 6, filterable: true, captureStage: 2, spawnWeight: 1 },
  { code: 'MN', name: 'Manganese', color: '#a855f7', radius: 5, filterable: true, captureStage: 2, spawnWeight: 1 },
  { code: 'CL', name: 'Chloride', color: '#14b8a6', radius: 4.5, filterable: true, captureStage: 4, spawnWeight: 1 },
  { code: 'TDS', name: 'Dissolved Solids', color: '#6b7280', radius: 7, filterable: true, captureStage: 1, spawnWeight: 1 }
]

export const DEFAULT_CONFIG: SimulationConfig = {
  moleculeTypes: DEFAULT_MOLECULE_TYPES,
  waterRatio: 0.55,
  removalEfficiency: 100,
  materialType: 'Filter'
}

export function buildSimulationConfig(info: FilterInfo): SimulationConfig {
  const params = info.experimentPayload?.params ?? []
  const efficiency = info.resultPayload?.removalEfficiency ?? 90

  const contaminants: MoleculeType[] = []
  let fallbackIdx = 0

  for (const p of params) {
    const code = p.name.toUpperCase()
    if (NON_MOLECULAR_CODES.has(code)) continue
    const known = KNOWN_MOLECULES[code]
    const color = known?.color ?? FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length]
    const radius = known?.radius ?? 5
    const name = known?.name ?? p.name

    contaminants.push({
      code,
      name,
      color,
      radius,
      filterable: true,
      captureStage: null,
      spawnWeight: Math.max(0.01, p.value)
    })
  }

  const allTypes: MoleculeType[] = [{ ...WATER_TYPE }, ...contaminants]

  const totalContaminantWeight = contaminants.reduce((s, c) => s + c.spawnWeight, 0)
  const waterRatio = totalContaminantWeight > 0
    ? Math.max(0.3, Math.min(0.8, 1 - totalContaminantWeight / (totalContaminantWeight + 50)))
    : 0.55

  return {
    moleculeTypes: allTypes,
    waterRatio,
    removalEfficiency: efficiency,
    poreSize: info.filterStructure?.poreSize,
    materialType: info.filterStructure?.materialType ?? info.summaryMetrics?.materialType,
    temperature: info.experimentPayload?.temperature,
    ph: info.experimentPayload?.ph,
    pollutant: info.resultPayload?.pollutant,
    bindingEnergy: info.resultPayload?.bindingEnergy
  }
}

export class SimulationEngine {
  particles: Particle[] = []
  stats: SimulationStats = { totalSpawned: 0, totalPassed: 0, totalContaminantsSpawned: 0, capturedByType: {} }
  speed = 1
  paused = false
  config: SimulationConfig

  private width = 0
  private height = 0
  private spawnAccumulator = 0
  private contaminantCdf: { type: MoleculeType; cumWeight: number }[] = []
  private totalContaminantWeight = 0

  constructor(config?: SimulationConfig) {
    this.config = config ?? DEFAULT_CONFIG
    this.rebuildCdf()
  }

  private rebuildCdf(): void {
    const contaminants = this.config.moleculeTypes.filter((m) => m.filterable)
    let cumWeight = 0
    this.contaminantCdf = contaminants.map((m) => {
      cumWeight += m.spawnWeight
      return { type: m, cumWeight }
    })
    this.totalContaminantWeight = cumWeight
  }

  get filterLeft(): number {
    return this.width * FILTER_CENTER_RATIO - (this.width * FILTER_WIDTH_RATIO) / 2
  }

  get filterRight(): number {
    return this.width * FILTER_CENTER_RATIO + (this.width * FILTER_WIDTH_RATIO) / 2
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  reset(): void {
    this.particles = []
    this.stats = { totalSpawned: 0, totalPassed: 0, totalContaminantsSpawned: 0, capturedByType: {} }
    this.spawnAccumulator = 0
  }

  setSpeed(multiplier: number): void {
    this.speed = multiplier
  }

  tick(dt: number): void {
    if (this.paused || this.width === 0) return

    const scaledDt = dt * this.speed

    this.spawnAccumulator += scaledDt
    const toSpawn = Math.floor(this.spawnAccumulator * SPAWN_RATE)
    this.spawnAccumulator -= toSpawn / SPAWN_RATE

    for (let i = 0; i < toSpawn; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      this.spawn()
    }

    const captureProb = this.config.removalEfficiency / 100

    for (const p of this.particles) {
      if (p.captured) continue

      p.vy += (Math.random() - 0.5) * BROWNIAN_STRENGTH * scaledDt
      p.vy *= 0.96
      p.x += p.vx * scaledDt
      p.y += p.vy * scaledDt

      if (p.y < p.type.radius) {
        p.y = p.type.radius
        p.vy = Math.abs(p.vy) * 0.5
      }
      if (p.y > this.height - p.type.radius) {
        p.y = this.height - p.type.radius
        p.vy = -Math.abs(p.vy) * 0.5
      }

      if (!p.passed && p.x + p.type.radius >= this.filterLeft && p.x - p.type.radius <= this.filterRight) {
        if (p.type.filterable) {
          if (Math.random() < captureProb) {
            p.captured = true
            p.captureX = this.filterLeft + Math.random() * (this.filterRight - this.filterLeft)
            p.captureY = p.y
            p.vx = 0
            p.vy = 0
            this.stats.capturedByType[p.type.code] = (this.stats.capturedByType[p.type.code] ?? 0) + 1
          } else {
            p.passed = true
          }
        } else {
          p.passed = true
        }
      }
    }

    this.particles = this.particles.filter((p) => {
      if (p.captured) return true
      if (p.x > this.width + 20) {
        if (p.passed || !p.type.filterable) {
          this.stats.totalPassed++
        }
        return false
      }
      return p.x > -20
    })
  }

  private spawn(): void {
    const type = this.pickType()
    if (type.filterable) {
      this.stats.totalContaminantsSpawned++
    }
    const particle: Particle = {
      x: -type.radius,
      y: type.radius + Math.random() * (this.height - type.radius * 2),
      vx: BASE_SPEED + Math.random() * 0.8,
      vy: (Math.random() - 0.5) * 0.6,
      type,
      captured: false,
      captureX: 0,
      captureY: 0,
      passed: false,
      opacity: 1
    }
    this.particles.push(particle)
    this.stats.totalSpawned++
  }

  private pickType(): MoleculeType {
    if (Math.random() < this.config.waterRatio) {
      return this.config.moleculeTypes[0]
    }
    if (this.contaminantCdf.length === 0) {
      return this.config.moleculeTypes[0]
    }
    const roll = Math.random() * this.totalContaminantWeight
    for (const entry of this.contaminantCdf) {
      if (roll <= entry.cumWeight) return entry.type
    }
    return this.contaminantCdf[this.contaminantCdf.length - 1].type
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const w = this.width
    const h = this.height
    if (w === 0 || h === 0) return

    ctx.clearRect(0, 0, w, h)

    const bg = ctx.createLinearGradient(0, 0, w, 0)
    bg.addColorStop(0, '#0c1222')
    bg.addColorStop(FILTER_CENTER_RATIO - 0.05, '#0f172a')
    bg.addColorStop(FILTER_CENTER_RATIO + 0.05, '#0f172a')
    bg.addColorStop(1, '#091018')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    this.drawFilter(ctx)

    ctx.font = '11px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(148,163,184,0.5)'
    ctx.fillText('UNFILTERED', w * 0.2, 20)
    ctx.fillText('FILTERED', w * 0.78, 20)

    for (const p of this.particles) {
      this.drawParticle(ctx, p)
    }
  }

  private drawFilter(ctx: CanvasRenderingContext2D): void {
    const fl = this.filterLeft
    const fr = this.filterRight
    const h = this.height

    const gradient = ctx.createLinearGradient(fl, 0, fr, 0)
    gradient.addColorStop(0, 'rgba(51,65,85,0.7)')
    gradient.addColorStop(0.5, 'rgba(71,85,105,0.85)')
    gradient.addColorStop(1, 'rgba(51,65,85,0.7)')
    ctx.fillStyle = gradient
    ctx.fillRect(fl, 0, fr - fl, h)

    ctx.strokeStyle = 'rgba(100,116,139,0.35)'
    ctx.lineWidth = 0.5
    const gap = 8
    for (let y = 0; y < h; y += gap) {
      ctx.beginPath()
      ctx.moveTo(fl, y)
      ctx.lineTo(fr, y)
      ctx.stroke()
    }
    for (let x = fl; x <= fr; x += gap) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(148,163,184,0.3)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(fl, 0, fr - fl, h)

    const label = this.config.materialType ?? 'F I L T E R'
    ctx.save()
    ctx.translate((fl + fr) / 2, h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(148,163,184,0.6)'
    ctx.fillText(label.toUpperCase(), 0, 0)
    ctx.restore()
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const x = p.captured ? p.captureX : p.x
    const y = p.captured ? p.captureY : p.y
    const r = p.type.radius
    const alpha = p.captured ? 0.7 : p.opacity

    const glowGrad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r + 3)
    glowGrad.addColorStop(0, this.hexToRgba(p.type.color, alpha * 0.4))
    glowGrad.addColorStop(1, this.hexToRgba(p.type.color, 0))
    ctx.beginPath()
    ctx.arc(x, y, r + 2, 0, Math.PI * 2)
    ctx.fillStyle = glowGrad
    ctx.fill()

    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = this.hexToRgba(p.type.color, alpha)
    ctx.fill()

    if (r >= 5) {
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`
      ctx.font = `bold ${Math.max(7, r - 1)}px ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(p.type.code, x, y)
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
}
