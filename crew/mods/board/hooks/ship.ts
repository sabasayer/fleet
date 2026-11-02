import type { Agent } from '../types'
import { isStale } from './board.ts'

export type Run = { t: string; fg?: string; bg?: string }
type Grid = (string | null)[][]

const PLAIN_WIDTH = 22
const MAX_FACES = 8
const FACE_STEP = 6
const SAIL = '#e8e4d8'
const WOOD = '#8b5a2b'
const HULL = '#5c3a1c'
const SEA = '#3b82c4'
const SKIN_PLAIN = '#f2c9a0'
const EYE = '#222222'
const MOUTH = '#6b2d2d'
const GOLD = '#e5c04b'
const BAND = '#3b5fa8'
const SLEEPY = '#9a9a9a'
const CREW_X = [2, 4, 6, 10, 12, 14, 16, 18]
const SKINS = ['#f2c9a0', '#e0ac7e', '#c68642', '#8d5524', '#ffdbac']
const HATS = ['#4f8fd9', '#9b6fd1', '#3fb3a0', '#d96fa8', '#e08a3c', '#8a8a8a']
const STATE_COLOR: Record<string, string> = {
  queued: '#8a8a8a',
  running: '#33c3d6',
  blocked: '#e5c04b',
  done: '#4fbf6f',
  failed: '#e5484d',
}
const HAT_SHAPES: Record<string, { rows: [string, string]; color?: string }> = {
  gate: { rows: ['.XXX.', 'XXGXX'], color: '#e8e4d8' },
  red: { rows: ['....X', 'XXXXX'], color: '#d9534f' },
  pin: { rows: ['....X', 'XXXXX'], color: '#d9534f' },
  green: { rows: ['X.X.X', 'XXXXX'], color: '#4fbf6f' },
  move: { rows: ['X.X.X', 'XXXXX'], color: '#4fbf6f' },
  review: { rows: ['..X..', '.XXX.'] },
  fixer: { rows: ['.XGX.', 'XXXXX'], color: GOLD },
  browser: { rows: ['XXXXX', 'BBBBB'], color: '#e8e4d8' },
}
const MINI_SHAPES: Record<string, [string, string]> = {
  gate: ['.X.', 'XGX'],
  red: ['..X', 'XXX'],
  pin: ['..X', 'XXX'],
  green: ['X.X', 'XXX'],
  move: ['X.X', 'XXX'],
  review: ['.X.', 'XXX'],
  fixer: ['XGX', 'XXX'],
  browser: ['XXX', 'BBB'],
}
const MINI_CAP: [string, string] = ['.XX', 'XXX']
const CAP: { rows: [string, string]; color?: string } = { rows: ['.XXX.', 'XXXXX'] }

const hash = (text: string) => [...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)

export function shipWidth(count: number, characters: boolean) {
  return characters ? Math.max(24, Math.min(count, MAX_FACES) * FACE_STEP) : PLAIN_WIDTH
}

export function hatFor(role: string) {
  const family = Object.keys(HAT_SHAPES).find(name => role === name || role.startsWith(`${name}-`))
  const shape = family ? HAT_SHAPES[family]! : CAP

  return { rows: shape.rows, color: shape.color ?? HATS[hash(role) % HATS.length]! }
}

export function miniHatGrid(role: string): Grid {
  const family = Object.keys(HAT_SHAPES).find(name => role === name || role.startsWith(`${name}-`))
  const rows = family ? MINI_SHAPES[family]! : MINI_CAP
  const { color } = hatFor(role)
  const paint = (ch: string) => (ch === 'X' ? color : ch === 'G' ? GOLD : ch === 'B' ? BAND : null)

  return rows.map(row => [...row].map(paint))
}

function drawFace(put: (x: number, y: number, color: string) => void, x: number, top: number, a: Agent, isLate: boolean) {
  const look = hash(a.role)
  const skin = a.state === 'queued' ? SLEEPY : SKINS[(look >>> 3) % SKINS.length]!
  const hat = hatFor(a.role)
  const paint = (ch: string) => (ch === 'X' ? hat.color : ch === 'G' ? GOLD : ch === 'B' ? BAND : null)

  hat.rows.forEach((row, r) => [...row].forEach((ch, c) => paint(ch) && put(x + c, top + r, paint(ch)!)))
  for (let c = 0; c < 5; c++) {
    put(x + c, top + 2, skin)
    put(x + c, top + 3, skin)
  }
  for (let c = 1; c <= 3; c++) put(x + c, top + 4, skin)
  const eye = a.state === 'failed' ? STATE_COLOR.failed! : EYE
  put(x + 1, top + 2, eye)
  put(x + 3, top + 2, eye)
  if (a.state === 'done') {
    put(x + 1, top + 3, MOUTH)
    put(x + 3, top + 3, MOUTH)
    put(x + 2, top + 4, MOUTH)
  } else if (a.state === 'failed') {
    put(x + 2, top + 3, MOUTH)
    put(x + 1, top + 4, MOUTH)
    put(x + 3, top + 4, MOUTH)
  } else if (a.state === 'blocked') {
    for (let c = 1; c <= 3; c++) put(x + c, top + 3, MOUTH)
  } else if (a.state === 'running') put(x + 2, top + 3, MOUTH)
  for (let c = 1; c <= 3; c++) put(x + c, top + 5, isLate ? STATE_COLOR.failed! : (STATE_COLOR[a.state] ?? '#e5484d'))
}

export function drawShip(agents: Agent[], frame: number, isSailing: boolean, characters = false, now = 0): Grid {
  const width = shipWidth(agents.length, characters)
  const deck = characters ? 11 : 7
  const mast = characters ? Math.floor(width / 2) : 8
  const grid: Grid = Array.from({ length: deck + 3 }, () => Array<string | null>(width).fill(null))
  const dy = isSailing && frame % 2 ? 1 : 0
  const put = (x: number, y: number, color: string) => {
    if (grid[y + dy]?.[x] !== undefined) grid[y + dy]![x] = color
  }
  const allDone = agents.length > 0 && agents.every(a => a.state === 'done')
  const anyFailed = agents.some(a => a.state === 'failed')
  const flag = anyFailed ? STATE_COLOR.failed! : allDone ? STATE_COLOR.done! : '#d9534f'

  for (let y = 0; y < deck; y++) put(mast, y, WOOD)
  put(mast + 1, 0, flag)
  if (isSailing && frame % 2) put(mast + 2, 0, flag)
  for (let y = 1; y <= 4; y++) {
    for (let x = mast - y; x < mast; x++) put(x, y, SAIL)
    for (let x = mast + 1; x <= mast + 1 + y; x++) put(x, y, SAIL)
  }
  for (let x = 0; x < width; x++) put(x, deck, HULL)
  for (let x = 2; x < width - 2; x++) put(x, deck + 1, HULL)

  agents.slice(0, MAX_FACES).forEach((a, i) => {
    const isLate = now > 0 && isStale(a, now)
    const hop = a.state === 'running' && !isLate && (frame + i) % 2 === 1 ? 1 : 0
    if (characters) return drawFace(put, i * FACE_STEP, deck - 6 - hop, a, isLate)
    put(CREW_X[i]!, deck - 2 - hop, SKIN_PLAIN)
    put(CREW_X[i]!, deck - 1 - hop, isLate ? STATE_COLOR.failed! : (STATE_COLOR[a.state] ?? '#e5484d'))
  })

  return grid
}

export function halfBlocks(grid: Grid): Run[][] {
  const lines: Run[][] = []
  for (let y = 0; y < grid.length; y += 2) {
    const runs: Run[] = []
    for (let x = 0; x < (grid[y]?.length ?? 0); x++) {
      const top = grid[y]![x] ?? undefined
      const bottom = grid[y + 1]?.[x] ?? undefined
      const cell: Run = !top && !bottom ? { t: ' ' } : top && bottom ? { t: '▀', fg: top, bg: bottom } : top ? { t: '▀', fg: top } : { t: '▄', fg: bottom }
      const last = runs[runs.length - 1]
      if (last && last.fg === cell.fg && last.bg === cell.bg) last.t += cell.t
      else runs.push(cell)
    }
    lines.push(runs)
  }

  return lines
}

export function water(frame: number, isSailing: boolean, width: number): Run {
  const shift = isSailing ? frame % 4 : 0

  return { t: '≈≈~~'.repeat(Math.ceil(width / 4) + 1).slice(shift, shift + width), fg: SEA }
}

function pixelRects(grid: Grid, px: number) {
  const rects: string[] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const color = row[x]
      if (!color) {
        x++
        continue
      }
      let end = x
      while (row[end + 1] === color) end++
      rects.push(`<rect x="${x * px}" y="${y * px}" width="${(end - x + 1) * px}" height="${px}" fill="${color}"/>`)
      x = end + 1
    }
  })

  return rects
}

const svgOf = (rects: string[], width: number, height: number) => ({
  source: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rects.join('')}</svg>`,
  width,
  height,
})

export function shipSvg(grid: Grid, frame: number, isSailing: boolean, px: number) {
  const rects = pixelRects(grid, px)
  const shift = isSailing ? frame % 4 : 0
  const waveTop = grid.length * px
  const columns = grid[0]?.length ?? 0
  for (let x = 0; x < columns; x++) {
    const high = (x + shift) % 4 < 2
    rects.push(`<rect x="${x * px}" y="${waveTop + (high ? 0 : px / 2)}" width="${px}" height="${px / 2}" fill="${SEA}"/>`)
  }

  return svgOf(rects, columns * px, waveTop + px)
}

export function hatGrid(role: string): Grid {
  const hat = hatFor(role)
  const paint = (ch: string) => (ch === 'X' ? hat.color : ch === 'G' ? GOLD : ch === 'B' ? BAND : null)

  return hat.rows.map(row => [...row].map(paint))
}

export function hatSvg(role: string, px: number) {
  const grid = hatGrid(role)

  return svgOf(pixelRects(grid, px), (grid[0]?.length ?? 0) * px, grid.length * px)
}
