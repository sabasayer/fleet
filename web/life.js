export const ZONES = ['in_review', 'merged', 'released', 'testing']
export const ZONE_NAME = { in_review: 'in review', merged: 'merged', released: 'released', testing: 'testing' }
export const KEEP_DAYS = 3
export const CREW_SHARE = 0.6

const DAY = 86400000

export const LIFE_TAG = {
  in_review: 'in review · waiting on reviewers',
  merged: 'merged · waiting for release',
  released: 'released · ready for you to test',
  testing: 'testing',
  paused: 'paused by you',
  failed: 'failed · marked by you',
  abandoned: 'abandoned · MR closed',
}
export const LIFE_SHORT = { in_review: 'in review', merged: 'merged', released: 'released · test it', testing: 'testing', paused: 'paused', failed: 'failed', abandoned: 'abandoned' }
export const LIFE_COLOR = { in_review: '#9fc3e6', merged: '#9fc3e6', released: '#c9a6ff', testing: '#c9a6ff', paused: '#8a8a8a', failed: '#e5484d', abandoned: '#6b6b6b' }

export const ACTION_LABEL = {
  mark_merged: 'mark merged',
  mark_released: 'mark released',
  start_testing: 'start testing',
  done: 'done → harbour',
  bug_found: 'bug found → back to sea',
  pause: 'pause',
  resume: 'resume',
  mark_failed: 'mark failed',
  undock: 'undock',
}

export function shipPhase(ship) {
  if (ship.kind !== 'scout' || ship.mrs.length > 0) return 'ship'

  return ship.outcome ? 'turned_back' : 'scouting'
}

export const lifeState = ship => ship.life?.state ?? 'sailing'
export const lifeStage = ship => ship.life?.stage ?? 'sailing'

const ended = ship => ship.life?.stage === 'done' || ship.life?.stage === 'abandoned'
export const isOld = (ship, now) => ended(ship) && ship.life.endedAt !== null && now - ship.life.endedAt > KEEP_DAYS * DAY
export const inHarbour = (ship, now) => ship.life?.stage === 'done' && !isOld(ship, now)
export const onSea = (ship, now) => ship.life?.stage !== 'done' && !isOld(ship, now)

export const seaFleets = (fleets, now) =>
  fleets.map(fleet => ({ ...fleet, ships: fleet.ships.filter(ship => onSea(ship, now)) })).filter(fleet => fleet.ships.length > 0)

function newestFirst(a, b) {
  if (a === null) return b === null ? 0 : 1
  if (b === null) return -1

  return b - a
}

export function harbourOf(fleets, now) {
  const ships = fleets.flatMap(fleet => fleet.ships.map(ship => ({ ship, fleet })))

  return {
    docked: ships.filter(e => inHarbour(e.ship, now)).sort((a, b) => newestFirst(a.ship.life.endedAt, b.ship.life.endedAt)),
    hidden: ships.filter(e => isOld(e.ship, now)).length,
  }
}

export const buttonsHtml = (ship, escapeHtml) =>
  (ship.life?.actions ?? [])
    .map(action => `<button data-action="${action}" data-ship="${escapeHtml(ship.ship)}">${ACTION_LABEL[action]}</button>`)
    .join(' ')
