import { GOLD, memberColor, STATE } from './art.js'
import { jumpHtml } from './jump.js'
import { startingHtml } from './newship.js'
import { crewOf, currentIndex, focusFleet } from './layout.js'
import { buttonsHtml, harbourOf, lifeState, LIFE_COLOR, LIFE_TAG, seaFleets, ZONE_NAME, ZONES } from './life.js'

const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

export const needsColor = needs => (needs?.kind === 'failed' ? STATE.failed : GOLD)

export function updatedAt(ship) {
  const times = ship.mrs.flatMap(mr => mr.crew.map(m => m.updatedMs)).filter(Number.isFinite)

  return times.length > 0 ? Math.max(...times) : Date.parse(ship.created) || 0
}

const waitingFirst = (a, b) => updatedAt(a) - updatedAt(b)

export const allShips = fleets => fleets.flatMap(fleet => fleet.ships.map(ship => ({ ship, fleet })))

export const waitingShips = fleets => allShips(fleets).filter(e => e.ship.needsCaptain).sort((a, b) => waitingFirst(a.ship, b.ship))

const rank = ship => (ship.needsCaptain ? 0 : lifeState(ship) === 'sailing' ? 1 : ZONES.includes(lifeState(ship)) ? 2 : 3)

export function listedShips(view, fleets) {
  const scope = view.level === 'armada' ? fleets : [focusFleet(view, fleets)].filter(Boolean)

  return allShips(scope).sort((a, b) => rank(a.ship) - rank(b.ship) || waitingFirst(a.ship, b.ship))
}

export const openShipName = view => (view.level === 'armada' ? null : view.cursor)

export function ago(ms, now) {
  const minutes = Math.max(0, Math.floor((now - ms) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`

  return `${Math.floor(minutes / 1440)} d ago`
}

const badge = ship => (ship.needsCaptain ? `<span class="${ship.needsCaptain.kind === 'failed' ? 'fail' : 'needs'}">!</span>` : '')

const reached = ship => (ship.life?.stage === 'done' ? ZONES.length : ZONES.indexOf(ship.life?.stage) + 1)

const bar = (crew, ship) =>
  `<div class="bar">${crew.map(m => `<span title="${escapeHtml(m.role)} ${escapeHtml(m.state)}" style="background:${memberColor(m)}"></span>`).join('')}${ZONES.map((zone, k) => `<span class="zone-step" title="${ZONE_NAME[zone]}" style="opacity:${k < reached(ship) ? 1 : 0.2}"></span>`).join('')}</div>`

const safeUrl = text => (/^https?:\/\//i.test(text ?? '') ? text : null)

function goal(ship) {
  const url = safeUrl(ship.task)
  const link = url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ship.task)}</a>` : escapeHtml(ship.task)

  return `<p>Goal: ${escapeHtml(ship.title)}</p>${ship.task ? `<p class="dim">Task: ${link}</p>` : ''}`
}

function crewTable(crew) {
  if (crew.length === 0) return '<p class="dim">No crew yet.</p>'
  const rows = crew.map(
    m =>
      `<tr><td>${escapeHtml(m.role)}</td><td style="color:${memberColor(m)}">● ${escapeHtml(m.stale ? `${m.state} (stale)` : m.state)}</td><td class="dim">${escapeHtml(m.summary ?? m.phase ?? '')}</td></tr>`,
  )

  return `<table class="crew">${rows.join('')}</table>`
}

const mrStates = ship =>
  ship.mrs.length > 1 && ship.life ? `<p class="dim">${ship.life.mrs.map(m => `MR ${m.n}: ${ZONE_NAME[m.state] ?? m.state}`).join(' · ')}</p>` : ''

function openView(ship, jump) {
  return `<div class="open">
    ${goal(ship)}
    <p class="dim">${ship.mrs.length} ${ship.mrs.length === 1 ? 'MR' : 'MRs'}</p>
    ${mrStates(ship)}
    ${(ship.checks ?? []).map(c => `<p class="dim">MR ${c.n} ${escapeHtml(c.text)} · ${ago(c.at, Date.now())}</p>`).join('')}
    ${crewTable(crewOf(ship))}
    <div class="buttons" data-slot="state-buttons">${buttonsHtml(ship, escapeHtml)}</div>
    ${jumpHtml(ship, jump)}
  </div>`
}

function shipRow({ ship, fleet }, open, now, showFleet, jump) {
  const crew = crewOf(ship)
  const at = crew[currentIndex(crew)]
  const need = ship.needsCaptain
  const life = lifeState(ship)
  const phase = LIFE_TAG[life]
    ? `<span style="color:${LIFE_COLOR[life]}">${LIFE_TAG[life]}</span>`
    : at
      ? `${escapeHtml(at.role)} ${escapeHtml(at.state)}`
      : crew.length > 0
        ? 'crew done'
        : 'no crew'
  const fleetName = showFleet ? ` <span class="dim">· ${escapeHtml(fleet.name)}</span>` : ''

  return `<div class="row${need ? ' hot' : ''}${open ? ' cur' : ''}" data-ship="${escapeHtml(ship.ship)}">
    ${badge(ship)} <b>${escapeHtml(ship.title)}</b> <span class="dim">${escapeHtml(ship.ship)}</span>${fleetName}<br>
    ${need ? `<span style="color:${needsColor(need)}">Waiting for you: ${escapeHtml(need.reason)}</span><br>` : ''}
    <span class="dim">${phase} · ${ago(updatedAt(ship), now)}</span>
    ${bar(crew, ship)}
    ${open ? openView(ship, jump) : ''}
  </div>`
}

function harbourRow({ ship, fleet }, open, now, jump) {
  return `<div class="row${open ? ' cur' : ''}" data-ship="${escapeHtml(ship.ship)}" data-harbour>
    <b>${escapeHtml(ship.title)}</b> <span class="dim">${escapeHtml(ship.ship)} · ${escapeHtml(fleet.name)}</span><br>
    <span class="dim">docked ${ago(ship.life.endedAt, now)} · ${ship.mrs.length} ${ship.mrs.length === 1 ? 'MR' : 'MRs'}</span>
    ${open ? openView(ship, jump) : ''}
  </div>`
}

function harbourSection(fleets, view, now, opened, jump) {
  const scope = view.level === 'armada' ? fleets : fleets.filter(f => f.id === focusFleet(view, fleets)?.id)
  const { docked, hidden } = harbourOf(scope, now)
  const rows = docked.map(entry => harbourRow(entry, entry.ship.ship === opened, now, jump)).join('')

  return `<section class="hud-block harbour-panel"><h3>⚓ harbour (${docked.length})${hidden ? ` <span class="dim">+${hidden} hidden</span>` : ''}</h3>${rows || '<p class="dim">No ships docked.</p>'}</section>`
}

export function panelHtml({ fleets: all, view, now, opened = null, jump, starting = [] }) {
  const startingBlock = startingHtml(starting, all, now)
  if (all.length === 0) return startingBlock
  const fleets = seaFleets(all, now)
  const waiting = waitingShips(fleets)
  const openName = opened ?? openShipName(view)
  const list = listedShips(view, fleets)
  const waitingRows = waiting
    .map(
      ({ ship }) =>
        `<div class="row hot${ship.needsCaptain.kind === 'failed' ? ' failed' : ''}" data-ship="${escapeHtml(ship.ship)}">${badge(ship)} ${escapeHtml(ship.title)} <span class="dim">${escapeHtml(ship.ship)}</span><br><span class="dim">${escapeHtml(ship.needsCaptain.reason)}</span></div>`,
    )
    .join('')
  const shipRows = list.map(entry => shipRow(entry, entry.ship.ship === openName, now, view.level === 'armada', jump)).join('')

  return `${startingBlock}<section class="hud-block needs-panel"><h3>needs captain (${waiting.length})</h3>${waitingRows || '<p class="dim">Nothing waits for you.</p>'}</section>
  <section class="hud-block ships-panel"><h3>ships</h3>${shipRows || '<p class="dim">No ships at sea.</p>'}</section>
  ${harbourSection(all, view, now, opened, jump)}`
}
