import type { FilterInfo } from '@renderer/utils/api/types'

type Vec2 = { x: number; y: number }

export type MoleculeDefinition = {
  code: string
  name: string
  formula: string
  color: string
  concentration: number
  unit: string
  normalized: number
  radiusScale: number
  removalRate: number
  filterable: boolean
}

export type MolecularHoverInfo = {
  code: string
  name: string
  formula: string
  concentration: number
  unit: string
  zone: 'unfiltered' | 'filtered'
}

export type MolecularSceneOptions = {
  definitions: MoleculeDefinition[]
  poreSize?: number
  materialType?: string
  layerThickness?: number
  removalEfficiency: number
}

type MoleculeNode = {
  x: number
  y: number
  anchorX: number
  anchorY: number
  vx: number
  vy: number
  radius: number
  zone: 'unfiltered' | 'filtered'
  molecule: MoleculeDefinition
}

const KNOWN_MOLECULES: Record<string, { name: string; formula: string; color: string; radiusScale: number }> = {
  H2O: { name: 'Water', formula: 'H2O', color: '#3b82f6', radiusScale: 0.8 },
  NO3: { name: 'Nitrate', formula: 'NO3-', color: '#22c55e', radiusScale: 1.15 },
  PO4: { name: 'Phosphate', formula: 'PO4^3-', color: '#f59e0b', radiusScale: 1.25 },
  FE: { name: 'Iron', formula: 'Fe', color: '#ef4444', radiusScale: 1.2 },
  MN: { name: 'Manganese', formula: 'Mn', color: '#a855f7', radiusScale: 1.1 },
  CL: { name: 'Chloride', formula: 'Cl-', color: '#14b8a6', radiusScale: 1.0 },
  TDS: { name: 'Dissolved Solids', formula: 'TDS', color: '#6b7280', radiusScale: 1.3 },
  TURB: { name: 'Turbidity', formula: 'Turb', color: '#78716c', radiusScale: 1.35 },
  HARD: { name: 'Total Hardness', formula: 'Hard', color: '#d97706', radiusScale: 1.3 },
  COND: { name: 'Conductivity', formula: 'Cond', color: '#0ea5e9', radiusScale: 1.0 },
  DO: { name: 'Dissolved Oxygen', formula: 'O2', color: '#06b6d4', radiusScale: 0.95 }
}

const FALLBACK_COLORS = ['#f472b6', '#fb923c', '#facc15', '#4ade80', '#818cf8', '#e879f9']
const NON_MOLECULAR_CODES = new Set(['PH', 'TEMP'])
const CODE_NAME_MAP: Record<string, string> = {
  'CA-DIS': 'Calcium',
  'CL-DIS': 'Chloride',
  'MG-DIS': 'Magnesium',
  'NA-DIS': 'Sodium',
  'K-DIS': 'Potassium',
  'ZN-DIS': 'Zinc',
  'PB-DIS': 'Lead',
  'CU-DIS': 'Copper',
  'NI-DIS': 'Nickel',
  'MN-DIS': 'Manganese',
  'FE-DIS': 'Iron',
  TOLH: 'Toluene'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function drawAtom(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  const glow = ctx.createRadialGradient(x, y, r * 0.25, x, y, r * 1.6)
  glow.addColorStop(0, hexToRgba(color, 0.35))
  glow.addColorStop(1, hexToRgba(color, 0))
  ctx.beginPath()
  ctx.arc(x, y, r * 1.6, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

function drawGenericMolecule(ctx: CanvasRenderingContext2D, node: MoleculeNode): void {
  drawAtom(ctx, node.x, node.y, node.radius, node.molecule.color)
  if (node.molecule.formula.length <= 3 && node.molecule.formula !== 'n/a') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = `bold ${Math.max(8, node.radius)}px ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(node.molecule.formula, node.x, node.y)
  }
}

function drawNO3(ctx: CanvasRenderingContext2D, node: MoleculeNode): void {
  const r = node.radius
  drawAtom(ctx, node.x, node.y, r * 0.75, '#2563eb')
  const orbit = r * 1.45
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 * i) / 3 - Math.PI / 2
    drawAtom(ctx, node.x + Math.cos(angle) * orbit, node.y + Math.sin(angle) * orbit, r * 0.5, '#ef4444')
  }
}

function drawPO4(ctx: CanvasRenderingContext2D, node: MoleculeNode): void {
  const r = node.radius
  drawAtom(ctx, node.x, node.y, r * 0.8, '#f59e0b')
  const offsets: Vec2[] = [
    { x: 0, y: -r * 1.5 },
    { x: r * 1.35, y: 0 },
    { x: -r * 1.35, y: 0 },
    { x: 0, y: r * 1.5 }
  ]
  for (const o of offsets) {
    drawAtom(ctx, node.x + o.x, node.y + o.y, r * 0.45, '#ef4444')
  }
}

function drawH2O(ctx: CanvasRenderingContext2D, node: MoleculeNode): void {
  const r = node.radius
  drawAtom(ctx, node.x, node.y, r * 0.75, '#0ea5e9')
  drawAtom(ctx, node.x - r * 1.15, node.y + r * 0.9, r * 0.35, '#e5e7eb')
  drawAtom(ctx, node.x + r * 1.15, node.y + r * 0.9, r * 0.35, '#e5e7eb')
}

function drawMetal(ctx: CanvasRenderingContext2D, node: MoleculeNode): void {
  drawAtom(ctx, node.x, node.y, node.radius, node.molecule.color)
  ctx.beginPath()
  ctx.arc(node.x, node.y, node.radius * 1.45, 0, Math.PI * 2)
  ctx.strokeStyle = hexToRgba(node.molecule.color, 0.6)
  ctx.lineWidth = 1
  ctx.stroke()
}

export function buildMoleculeDefinitions(info: FilterInfo): MoleculeDefinition[] {
  const params = info.experimentPayload?.params ?? []
  const removalEfficiency = clamp(info.resultPayload?.removalEfficiency ?? 90, 0, 100) / 100
  const maxParam = params.reduce((acc, p) => Math.max(acc, Math.max(0, p.value)), 0)

  const defs: MoleculeDefinition[] = [
    {
      code: 'H2O',
      name: KNOWN_MOLECULES.H2O.name,
      formula: KNOWN_MOLECULES.H2O.formula,
      color: KNOWN_MOLECULES.H2O.color,
      concentration: 1,
      unit: 'rel',
      normalized: 0.45,
      radiusScale: KNOWN_MOLECULES.H2O.radiusScale,
      removalRate: 0,
      filterable: false
    }
  ]

  let fallbackIdx = 0
  for (const p of params) {
    const code = p.name.toUpperCase()
    if (NON_MOLECULAR_CODES.has(code)) continue
    const known = KNOWN_MOLECULES[code]
    const humanName = CODE_NAME_MAP[code] ?? p.name
    const symbolFromCode = code.match(/^([A-Z][A-Z]?)/)?.[1] ?? null
    const inferredFormula = known?.formula ?? (symbolFromCode && symbolFromCode.length <= 2 ? symbolFromCode : 'n/a')
    const normalized = maxParam > 0 ? clamp(p.value / maxParam, 0, 1) : 0
    defs.push({
      code,
      name: known?.name ?? humanName,
      formula: inferredFormula,
      color: known?.color ?? FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length],
      concentration: p.value,
      unit: p.unit ?? 'mg/L',
      normalized,
      radiusScale: known?.radiusScale ?? 1,
      removalRate: removalEfficiency,
      filterable: true
    })
  }

  return defs
}

export class MolecularScene {
  private width = 0
  private height = 0
  private nodes: MoleculeNode[] = []
  private hoverRadiusPad = 6
  private poreSize?: number
  private materialType?: string
  private layerThickness?: number
  private removalEfficiency = 0.9
  private definitions: MoleculeDefinition[] = []

  constructor(options: MolecularSceneOptions) {
    this.poreSize = options.poreSize
    this.materialType = options.materialType
    this.layerThickness = options.layerThickness
    this.removalEfficiency = clamp(options.removalEfficiency / 100, 0, 1)
    this.definitions = options.definitions
  }

  setViewport(width: number, height: number): void {
    this.width = width
    this.height = height
    this.rebuildNodes()
  }

  update(options: MolecularSceneOptions): void {
    this.poreSize = options.poreSize
    this.materialType = options.materialType
    this.layerThickness = options.layerThickness
    this.removalEfficiency = clamp(options.removalEfficiency / 100, 0, 1)
    this.definitions = options.definitions
    this.rebuildNodes()
  }

  private rebuildNodes(): void {
    if (this.width <= 0 || this.height <= 0) return
    this.nodes = []

    const leftMax = this.filterLeft - 18
    const rightMin = this.filterRight + 18
    const areaHeight = this.height - 36
    const poreFactor = this.poreSize != null ? clamp(this.poreSize / 2, 0.3, 2.2) : 1

    for (const molecule of this.definitions) {
      const baseCount = molecule.filterable
        ? Math.round(14 + molecule.normalized * 40)
        : 90

      const filteredCount = molecule.filterable
        ? Math.max(2, Math.round(baseCount * (1 - this.removalEfficiency)))
        : Math.round(baseCount * 0.98)

      const baseRadius = clamp(3.5 + molecule.radiusScale * 2.6 * poreFactor, 3, 9)

      for (let i = 0; i < baseCount; i++) {
        const x = 22 + Math.random() * Math.max(10, leftMax - 28)
        const y = 18 + Math.random() * areaHeight
        this.nodes.push({
          x,
          y,
          anchorX: x,
          anchorY: y,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          radius: baseRadius * (0.82 + Math.random() * 0.35),
          zone: 'unfiltered',
          molecule
        })
      }

      for (let i = 0; i < filteredCount; i++) {
        const x = rightMin + Math.random() * Math.max(10, this.width - rightMin - 12)
        const y = 18 + Math.random() * areaHeight
        this.nodes.push({
          x,
          y,
          anchorX: x,
          anchorY: y,
          vx: (Math.random() - 0.5) * 0.09,
          vy: (Math.random() - 0.5) * 0.09,
          radius: baseRadius * 0.95 * (0.84 + Math.random() * 0.28),
          zone: 'filtered',
          molecule
        })
      }
    }
  }

  get filterLeft(): number {
    return this.width * 0.47 - this.width * 0.06
  }

  get filterRight(): number {
    return this.width * 0.47 + this.width * 0.06
  }

  frame(dtMs: number): void {
    const dt = clamp(dtMs / 16, 0.4, 2)
    for (const n of this.nodes) {
      const spring = 0.01 * dt
      n.vx += (n.anchorX - n.x) * spring + (Math.random() - 0.5) * 0.05 * dt
      n.vy += (n.anchorY - n.y) * spring + (Math.random() - 0.5) * 0.05 * dt
      n.vx *= 0.97
      n.vy *= 0.97
      n.x += n.vx
      n.y += n.vy

      const minX = n.zone === 'unfiltered' ? 8 : this.filterRight + 8
      const maxX = n.zone === 'unfiltered' ? this.filterLeft - 8 : this.width - 8
      if (n.x < minX || n.x > maxX) {
        n.vx *= -0.7
        n.x = clamp(n.x, minX, maxX)
      }
      if (n.y < 8 || n.y > this.height - 8) {
        n.vy *= -0.7
        n.y = clamp(n.y, 8, this.height - 8)
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.width <= 0 || this.height <= 0) return
    const w = this.width
    const h = this.height

    ctx.clearRect(0, 0, w, h)

    const bg = ctx.createLinearGradient(0, 0, w, 0)
    bg.addColorStop(0, '#0b1422')
    bg.addColorStop(this.filterLeft / w, '#0e1b30')
    bg.addColorStop(this.filterRight / w, '#121b2b')
    bg.addColorStop(1, '#0a1726')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    this.drawMembrane(ctx)

    ctx.font = '11px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(148,163,184,0.75)'
    ctx.fillText('UNFILTERED_SAMPLE', w * 0.2, 16)
    ctx.fillText('FILTERED_OUTPUT', w * 0.78, 16)

    for (const n of this.nodes) {
      if (n.molecule.code === 'NO3') drawNO3(ctx, n)
      else if (n.molecule.code === 'PO4') drawPO4(ctx, n)
      else if (n.molecule.code === 'H2O') drawH2O(ctx, n)
      else if (n.molecule.code === 'FE' || n.molecule.code === 'MN') drawMetal(ctx, n)
      else drawGenericMolecule(ctx, n)
    }
  }

  private drawMembrane(ctx: CanvasRenderingContext2D): void {
    const fl = this.filterLeft
    const fr = this.filterRight
    const h = this.height

    const gradient = ctx.createLinearGradient(fl, 0, fr, 0)
    gradient.addColorStop(0, 'rgba(51,65,85,0.75)')
    gradient.addColorStop(0.5, 'rgba(71,85,105,0.9)')
    gradient.addColorStop(1, 'rgba(51,65,85,0.75)')
    ctx.fillStyle = gradient
    ctx.fillRect(fl, 0, fr - fl, h)

    ctx.strokeStyle = 'rgba(148,163,184,0.24)'
    ctx.lineWidth = 0.8
    for (let y = -h; y < h * 2; y += 10) {
      ctx.beginPath()
      ctx.moveTo(fl, y)
      ctx.lineTo(fr, y + (fr - fl))
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(148,163,184,0.35)'
    ctx.lineWidth = 1.2
    ctx.strokeRect(fl, 0, fr - fl, h)

    const label = this.materialType ?? 'FILTER'
    const pore = this.poreSize != null ? `${this.poreSize.toFixed(2)} nm` : 'n/a'
    const layer = this.layerThickness != null ? `${this.layerThickness.toFixed(2)} nm` : 'n/a'

    ctx.save()
    ctx.translate((fl + fr) / 2, h / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(226,232,240,0.78)'
    ctx.textAlign = 'center'
    ctx.fillText(`${label.toUpperCase()} | PORE ${pore} | LAYER ${layer}`, 0, 0)
    ctx.restore()
  }

  pick(x: number, y: number): MolecularHoverInfo | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i]
      const dx = n.x - x
      const dy = n.y - y
      const maxDist = n.radius + this.hoverRadiusPad
      if (dx * dx + dy * dy <= maxDist * maxDist) {
        return {
          code: n.molecule.code,
          name: n.molecule.name,
          formula: n.molecule.formula,
          concentration: n.molecule.concentration,
          unit: n.molecule.unit,
          zone: n.zone
        }
      }
    }
    return null
  }
}
