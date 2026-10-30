import { CREW_SHARE, lifeStage, shipPhase, ZONES } from './life.js'

export const LEVEL_SCALE = { armada: 2, fleet: 4, ship: 8 }
export const TWEEN_MS = 450
export const LABEL_COLUMN = 170
export const RIGHT_MARGIN = 70
export const FLEET_HEAD = 28
export const TOP = 64
export const EDGE = 16

const DECK_ROWS = 13
const FACE_ROWS = 16

export const detailFor = scale => (scale >= 6 ? 'faces' : 'deck')
export const spriteRows = detail => (detail === 'faces' ? FACE_ROWS : DECK_ROWS)

export const WATER_GAP = 4
export const waterLineY = (rowY, detail, scale) => rowY + spriteRows(detail) * scale + WATER_GAP
export const floatTop = (lineY, rows, rowPx) => lineY - WATER_GAP - rows * rowPx

export const crewOf = ship => [...ship.mrs].reverse().find(mr => mr.crew.length > 0)?.crew ?? []
export const currentIndex = crew => crew.findIndex(member => member.state !== 'done')

export const stoneX = (index, count, left, right) => left + ((index + 1) / (count + 1)) * (right - left)

export function shipX(crew, left, right) {
  if (crew.length === 0) return left + 24
  const at = currentIndex(crew)

  return at < 0 ? right + 46 : stoneX(at, crew.length, left, right)
}

export const crewRight = (left, right) => left + (right - left) * CREW_SHARE

export const SCOUT_SHARE = 0.15

export const scoutRight = (left, right) => left + (right - left) * SCOUT_SHARE

export const crewLeft = (left, right, band) => (band ? scoutRight(left, right) : left)

export const showScoutBand = (manual, anyScout) => manual ?? anyScout

export function laneHeadText(ships) {
  const scouts = ships.filter(ship => shipPhase(ship) === 'scouting').length

  return `${ships.length - scouts} ships${scouts ? ` · ${scouts} scout${scouts === 1 ? '' : 's'}` : ''}`
}

export const zoneEdge = (index, left, right) => crewRight(left, right) + (index / ZONES.length) * (right - crewRight(left, right))

export function shipPlaceX(ship, crew, left, right, band = false) {
  const zone = ZONES.indexOf(lifeStage(ship))
  if (zone >= 0) return (zoneEdge(zone, left, right) + zoneEdge(zone + 1, left, right)) / 2
  const start = crewLeft(left, right, band)
  const stop = crewRight(left, right)
  if (crew.length > 0 && currentIndex(crew) < 0) return stoneX(crew.length - 1, crew.length, start, stop)

  return shipX(crew, start, stop)
}

export const scoutX = (left, right) => (left + scoutRight(left, right)) / 2

export const placeX = (ship, crew, left, right, band = false) =>
  band && shipPhase(ship) === 'scouting' ? scoutX(left, right) : shipPlaceX(ship, crew, left, right, band)

export const initialView = fleets => ({ level: 'armada', cursor: fleets[0]?.id ?? null })

export const fleetOfShip = (fleets, name) => fleets.find(f => f.ships.some(s => s.ship === name))

export function focusFleet(view, fleets) {
  return view.level === 'armada' ? fleets.find(f => f.id === view.cursor) : fleetOfShip(fleets, view.cursor)
}

export const toArmada = (view, fleets) => ({ level: 'armada', cursor: focusFleet(view, fleets)?.id ?? fleets[0]?.id ?? null })

export function toFleet(view, fleets, fleetId) {
  const fleet = fleets.find(f => f.id === fleetId)
  if (!fleet) return view
  const keep = view.level !== 'armada' && fleet.ships.some(s => s.ship === view.cursor)

  return { level: 'fleet', cursor: keep ? view.cursor : fleet.ships[0].ship }
}

export const toShip = name => ({ level: 'ship', cursor: name })

export function zoomIn(view, fleets) {
  if (view.level === 'armada') return toFleet(view, fleets, view.cursor)
  if (view.level === 'fleet') return toShip(view.cursor)

  return view
}

export function zoomOut(view, fleets) {
  if (view.level === 'ship') return { level: 'fleet', cursor: view.cursor }
  if (view.level === 'fleet') return toArmada(view, fleets)

  return view
}

export function move(view, fleets, step) {
  const ids = view.level === 'armada' ? fleets.map(f => f.id) : (focusFleet(view, fleets)?.ships.map(s => s.ship) ?? [])
  if (ids.length === 0) return view
  const at = ids.indexOf(view.cursor)
  const next = ids[(at + step + ids.length) % ids.length]

  return { level: view.level, cursor: next }
}

export function reconcile(view, fleets) {
  if (view.level === 'armada') {
    return fleets.some(f => f.id === view.cursor) ? view : { level: 'armada', cursor: fleets[0]?.id ?? null }
  }

  return fleetOfShip(fleets, view.cursor) ? view : { level: 'armada', cursor: fleets[0]?.id ?? null }
}

export const shapeKey = fleets => fleets.map(f => `${f.id}:${f.ships.map(s => s.ship).join(',')}`).join('|')

export function layoutFor(view, fleets, size) {
  const scale = LEVEL_SCALE[view.level]
  const detail = detailFor(scale)
  const focus = focusFleet(view, fleets)
  const focusIndex = fleets.indexOf(focus)
  const rowHeight = spriteRows(detail) * scale + (view.level === 'armada' ? 22 : 40)
  const out = { scale, lanes: {}, ships: {} }
  const shiftable = { lanes: [], ships: [] }
  let target = null
  let y = TOP

  fleets.forEach((fleet, index) => {
    if (view.level !== 'armada' && fleet !== focus) {
      const hiddenY = index < focusIndex ? -260 : size.h + 60
      out.lanes[fleet.id] = { y: hiddenY, h: FLEET_HEAD + fleet.ships.length * rowHeight, a: 0 }
      fleet.ships.forEach((ship, i) => {
        out.ships[ship.ship] = { y: hiddenY + FLEET_HEAD + i * rowHeight, a: 0 }
      })

      return
    }
    const shown = fleet.ships.filter(s => view.level !== 'ship' || s.ship === view.cursor)
    const laneHeight = FLEET_HEAD + shown.length * rowHeight + 8
    out.lanes[fleet.id] = { y, h: laneHeight, a: 1 }
    shiftable.lanes.push(fleet.id)
    shiftable.ships.push(...fleet.ships.map(s => s.ship))
    fleet.ships.forEach(ship => {
      const k = shown.indexOf(ship)
      out.ships[ship.ship] = k < 0 ? { y: y + FLEET_HEAD, a: 0 } : { y: y + FLEET_HEAD + k * rowHeight, a: 1 }
    })
    if (view.level === 'armada' && fleet.id === view.cursor) target = { top: y, bottom: y + laneHeight }
    if (view.level !== 'armada' && out.ships[view.cursor]?.a === 1) {
      const top = out.ships[view.cursor].y - 4
      target = { top, bottom: top + spriteRows(detail) * scale + (scale >= 3 ? 34 : 16) }
    }
    y += laneHeight + 8
  })

  const shift = target ? scrollShift(target, size.h) : 0
  if (shift !== 0) {
    shiftable.lanes.forEach(id => (out.lanes[id].y -= shift))
    shiftable.ships.forEach(name => (out.ships[name].y -= shift))
  }

  return { ...out, rowHeight, cursorBox: target && { top: target.top - shift, height: target.bottom - target.top } }
}

export function scrollShift(target, height) {
  let shift = Math.max(0, target.bottom - (height - EDGE))
  if (target.top - shift < TOP - 8) shift = target.top - (TOP - 8)

  return Math.max(0, shift)
}

export const lerp = (a, b, t) => a + (b - a) * t

const mixEntries = (from, to, t) =>
  Object.fromEntries(
    Object.entries(to).map(([key, value]) => {
      const start = from[key] ?? value

      return [key, Object.fromEntries(Object.keys(value).map(k => [k, lerp(start[k], value[k], t)]))]
    }),
  )

export const mixLayout = (from, to, t) => ({
  ...to,
  scale: lerp(from.scale, to.scale, t),
  lanes: mixEntries(from.lanes, to.lanes, t),
  ships: mixEntries(from.ships, to.ships, t),
})

export const easeOut = t => 1 - (1 - t) ** 3
