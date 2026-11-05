import { lifeStage, lifeState } from './life.js'

const hasStale = ship => ship.mrs.some(mr => mr.crew.some(member => member.stale))

export const CHIPS = [
  { id: 'all', label: 'all', test: () => true },
  { id: 'needs', label: 'needs you', test: ship => Boolean(ship.needsCaptain) },
  { id: 'running', label: 'running', test: ship => lifeState(ship) === 'sailing' && !ship.needsCaptain },
  { id: 'stale', label: 'stale', test: hasStale },
  { id: 'review', label: 'in review', test: ship => lifeStage(ship) === 'in_review' },
  { id: 'merged', label: 'merged', test: ship => ['merged', 'released'].includes(lifeStage(ship)) },
  { id: 'testing', label: 'testing', test: ship => lifeStage(ship) === 'testing' },
  { id: 'done', label: 'done', test: ship => lifeStage(ship) === 'done' },
  { id: 'stopped', label: 'paused/failed', test: ship => ['paused', 'failed', 'abandoned'].includes(lifeState(ship)) },
]

const fields = ship => [ship.ship, ship.title, ship.task, ...ship.mrs.flatMap(mr => [String(mr.n), `!${mr.n}`, mr.url, mr.branch])]

export function matches(ship, text) {
  const needle = text.trim().toLowerCase()

  return needle === '' || fields(ship).some(field => typeof field === 'string' && field.toLowerCase().includes(needle))
}

const chipOf = id => CHIPS.find(chip => chip.id === id) ?? CHIPS[0]

export const isActive = ({ text, chip }) => text.trim() !== '' || chip !== 'all'

export const matching = (ships, { text, chip }) => ships.filter(ship => matches(ship, text) && chipOf(chip).test(ship))

export const shownFleets = (fleets, search) =>
  isActive(search) ? fleets.map(fleet => ({ ...fleet, ships: matching(fleet.ships, search) })).filter(fleet => fleet.ships.length > 0) : fleets

export const chipCounts = (ships, text) => {
  const found = ships.filter(ship => matches(ship, text))

  return CHIPS.map(({ id, label, test }) => ({ id, label, count: found.filter(test).length }))
}

export const filterCount = ({ chip }) => (chip === 'all' ? 0 : 1)

export const filterLabel = search => (filterCount(search) > 0 ? `filter (${filterCount(search)})` : 'filter')

export const chipsHtml = (ships, { text, chip }) =>
  chipCounts(ships, text)
    .map(({ id, label, count }) => `<span class="chip${id === chip ? ' on' : ''}" role="button" data-chip="${id}">${label} (${count})</span>`)
    .join('')

export function searchKey(key) {
  return { Escape: 'clear', ArrowDown: 'next', ArrowUp: 'prev', Enter: 'open' }[key] ?? null
}

export const pickedName = (names, pick) => (names.includes(pick) ? pick : (names[0] ?? null))

export function movePick(names, pick, step) {
  if (names.length === 0) return null
  const at = names.indexOf(pickedName(names, pick))

  return names[Math.min(names.length - 1, Math.max(0, at + step))]
}
