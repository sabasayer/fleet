export const WOOD = '#8b5a2b'
const HULL = '#5c3a1c'
const DECK = '#a87a4a'
const SAIL = '#e8e4d8'
const EYE = '#222'
const MOUTH = '#6b2d2d'
export const GOLD = '#e5c04b'
const BAND = '#3b5fa8'
const SLEEPY = '#9a9a9a'
export const CALM = ['#1e4a72', '#204e78']
export const WAVE = '#2a5c88'
export const STONE_LINE = '#3d6f9e'
export const BACKDROP = '#0d1b2a'
const SKINS = ['#f2c9a0', '#e0ac7e', '#c68642', '#8d5524', '#ffdbac']
const HATS = ['#4f8fd9', '#9b6fd1', '#3fb3a0', '#d96fa8', '#e08a3c', '#8a8a8a']
export const STATE = { queued: '#8a8a8a', running: '#33c3d6', blocked: '#e5c04b', done: '#4fbf6f', failed: '#e5484d' }
const HAT_SHAPES = {
  gate: { rows: ['.XXX.', 'XXGXX'], color: '#e8e4d8' },
  red: { rows: ['....X', 'XXXXX'], color: '#d9534f' },
  pin: { rows: ['....X', 'XXXXX'], color: '#d9534f' },
  green: { rows: ['X.X.X', 'XXXXX'], color: '#4fbf6f' },
  move: { rows: ['X.X.X', 'XXXXX'], color: '#4fbf6f' },
  review: { rows: ['..X..', '.XXX.'] },
  fixer: { rows: ['.XGX.', 'XXXXX'], color: GOLD },
  browser: { rows: ['XXXXX', 'BBBBB'], color: '#e8e4d8' },
}

export const hash = text => [...text].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7)

export function hatFor(role) {
  const family = Object.keys(HAT_SHAPES).find(name => role === name || role.startsWith(`${name}-`))
  const shape = family ? HAT_SHAPES[family] : { rows: ['.XXX.', 'XXXXX'] }

  return { rows: shape.rows, color: shape.color ?? HATS[hash(role) % HATS.length] }
}

export const memberColor = member => (member.stale ? STATE.failed : (STATE[member.state] ?? STATE.queued))
const skinFor = member => (member.state === 'queued' ? SLEEPY : SKINS[(hash(member.role) >>> 3) % SKINS.length])

function face(put, x, top, member) {
  const hat = hatFor(member.role)
  const paint = ch => (ch === 'X' ? hat.color : ch === 'G' ? GOLD : ch === 'B' ? BAND : null)
  const skin = skinFor(member)

  hat.rows.forEach((row, r) => [...row].forEach((ch, c) => paint(ch) && put(x + c, top + r, paint(ch))))
  for (let i = 0; i < 5; i++) {
    put(x + i, top + 2, skin)
    put(x + i, top + 3, skin)
  }
  for (let i = 1; i <= 3; i++) put(x + i, top + 4, skin)
  const eye = member.state === 'failed' ? STATE.failed : EYE
  put(x + 1, top + 2, eye)
  put(x + 3, top + 2, eye)
  if (member.state === 'done') {
    put(x + 1, top + 3, MOUTH)
    put(x + 3, top + 3, MOUTH)
    put(x + 2, top + 4, MOUTH)
  } else if (member.state === 'failed') {
    put(x + 2, top + 3, MOUTH)
    put(x + 1, top + 4, MOUTH)
    put(x + 3, top + 4, MOUTH)
  } else if (member.state === 'blocked') {
    for (let i = 1; i <= 3; i++) put(x + i, top + 3, MOUTH)
  } else if (member.state === 'running') put(x + 2, top + 3, MOUTH)
  for (let i = 1; i <= 3; i++) put(x + i, top + 5, memberColor(member))
}

export function flagColor(ship, fleetColor) {
  if (ship.life?.state === 'failed') return STATE.failed
  if (ship.needsCaptain) return ship.needsCaptain.kind === 'failed' ? STATE.failed : GOLD

  return fleetColor
}

export function shipGrid(crew, flag, frame, detail, life = 'sailing') {
  const sailing = life === 'sailing'
  const faces = detail === 'faces'
  const step = faces ? 6 : 4
  const width = crew.length * step + 10
  const deckTop = faces ? 9 : 6
  const height = deckTop + 7
  const grid = Array.from({ length: height }, () => Array(width).fill(null))
  const put = (x, y, color) => {
    if (grid[y]?.[x] !== undefined) grid[y][x] = color
  }

  for (let y = deckTop; y < height - 1; y++) {
    const inset = Math.abs(y - (deckTop + 2.5)) > 2 ? 1 : 0
    const bow = y === deckTop + 2 || y === deckTop + 3 ? 2 : 0
    for (let x = 1 + inset; x < width - 3 + bow; x++) put(x, y, y === height - 2 ? HULL : DECK)
  }
  for (let x = 2; x < width - 3; x++) {
    put(x, height - 1, HULL)
    put(x, deckTop, HULL)
  }
  for (let y = 0; y < deckTop + 2; y++) put(3, y, WOOD)
  const flagRow = sailing ? 0 : 3
  put(4, flagRow, flag)
  put(5, flagRow, flag)
  if (sailing && frame % 2) put(6, flagRow, flag)
  else put(5, flagRow + 1, flag)
  if (sailing) for (let y = 2; y < deckTop; y++) for (let x = Math.max(0, 4 - y); x <= 2; x++) put(x, y, SAIL)
  else for (let x = 0; x <= 2; x++) put(x, deckTop - 1, SAIL)

  crew.forEach((member, i) => {
    const hop = sailing && member.state === 'running' && !member.stale && (frame + i) % 2 ? 1 : 0
    const x = 6 + i * step
    if (faces) return face(put, x, deckTop - 4 - hop, member)
    const hat = hatFor(member.role)
    for (let k = 0; k < 3; k++) put(x + k, deckTop - 1 - hop, hat.color)
    put(x + 1, deckTop - hop, skinFor(member))
    put(x + 1, deckTop + 1, memberColor(member))
  })

  return life === 'abandoned' ? wreck(grid, deckTop) : grid
}

function wreck(grid, deckTop) {
  const grey = color => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
    const v = Math.round((r * 0.3 + g * 0.59 + b * 0.11) * 0.6 + 40)
    const hex = v.toString(16).padStart(2, '0')

    return `#${hex}${hex}${hex}`
  }
  for (let y = 0; y < deckTop - 2; y++) grid[y].fill(null)

  return grid.map(row => row.map(color => (color?.startsWith('#') ? grey(color) : color)))
}

export const ANCHOR = ['..X..', '.XXX.', '..X..', 'X.X.X', '.XXX.'].map(row => [...row].map(ch => (ch === 'X' ? '#c9d6e3' : null)))

export const BANG = ['.XXX.', 'XX.XX', 'XX.XX', 'XX.XX', 'XXXXX', 'XX.XX', '.XXX.'].map(row =>
  [...row].map(ch => (ch === 'X' ? 'beacon' : ch === '.' ? '#2a1d00' : null)),
)

export const beaconGrid = color => BANG.map(row => row.map(cell => (cell === 'beacon' ? color : cell)))

export const snap = (scale, dpr) => Math.max(1, Math.round(scale * dpr)) / dpr

export function blit(ctx, grid, x, y, scale, dpr) {
  const px = Math.max(1, Math.round(scale * dpr))
  const ox = Math.round(x * dpr)
  const oy = Math.round(y * dpr)

  grid.forEach((row, r) => {
    let i = 0
    while (i < row.length) {
      const color = row[i]
      if (!color) {
        i++
        continue
      }
      let end = i
      while (row[end + 1] === color) end++
      ctx.fillStyle = color
      ctx.fillRect(ox + i * px, oy + r * px, (end - i + 1) * px, px)
      i = end + 1
    }
  })

  return px / dpr
}
