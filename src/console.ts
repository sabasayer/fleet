import type { Ship, State } from './state.ts'

const APP = 'http://127.0.0.1:4932/'
const OPEN_STATES = ['sailing', 'in_review', 'testing', 'paused']
const LEVEL: Record<string, 'soon' | 'fyi'> = { sailing: 'soon', in_review: 'fyi', testing: 'soon', paused: 'fyi' }

const base = (ship: Ship) => {
  const url = ship.mrs.find(mr => mr.url)?.url

  return { key: ship.ship, title: ship.title || ship.ship, since: ship.created, ...(url ? { url } : {}) }
}

export function consoleFeed(state: State) {
  const ships = state.fleets.flatMap(f => f.ships)
  const waiting = ships.filter(s => s.needsCaptain)
  const sailing = ships.filter(s => !s.needsCaptain && OPEN_STATES.includes(s.life.state))
  const open = waiting.length + sailing.length

  return {
    version: 1,
    id: 'fleet',
    name: 'Fleet',
    color: '#2368d0',
    size: 'm',
    updatedAt: new Date(state.now).toISOString(),
    app: { url: APP, open: `${APP}?ship={key}` },
    tile: { value: waiting.length, label: 'gates wait on you', detail: `${open} ships sailing`, level: waiting.length ? 'now' : 'calm' },
    groups: [
      {
        title: 'Waiting on you',
        items: waiting.map(s => ({ ...base(s), detail: `${s.needsCaptain!.role}: ${s.needsCaptain!.reason}`, level: 'now', icon: 'gate', badge: { text: 'you', tone: 'red' } })),
      },
      {
        title: 'Sailing',
        items: sailing.map(s => ({ ...base(s), level: LEVEL[s.life.state], icon: 'run', badge: { text: s.life.state.replace('_', ' '), tone: 'mute' } })),
      },
    ].filter(g => g.items.length > 0),
    empty: 'No ships at sea.',
  }
}
