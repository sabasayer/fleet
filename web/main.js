import { focusFleet, initialView, move, reconcile, toArmada, toFleet, toShip, zoomIn, zoomOut } from './layout.js'
import { panelHtml } from './panel.js'
import { createSea } from './sea.js'

const canvas = document.getElementById('sea')
const ui = document.getElementById('ui')
const crumbs = document.getElementById('crumbs')
const side = document.getElementById('side')
const sea = createSea(canvas, ui)
const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

let fleets = []
let now = Date.now()
let view = initialView(fleets)
let frame = 0
let pending = 0
let lastUi = ''
let lastCrumbs = ''
let lastSide = ''
let lastOpen = null

function crumbHtml() {
  if (fleets.length === 0) return 'no ships'
  const fleet = focusFleet(view, fleets)
  const parts = [`<a data-armada>armada</a>`]
  if (view.level !== 'armada' && fleet) parts.push(`<a data-fleet="${escapeHtml(fleet.id)}">${escapeHtml(fleet.name)}</a>`)
  if (view.level === 'ship') parts.push(escapeHtml(fleet.ships.find(s => s.ship === view.cursor)?.title ?? view.cursor))

  return `${parts.join(' › ')} <span class="dim">(↑↓ move · → in · ← out)</span>`
}

function render() {
  pending = 0
  const { html, animating } = sea.draw({ fleets, view, frame })
  if (html !== lastUi) ui.innerHTML = lastUi = html
  const crumb = crumbHtml()
  if (crumb !== lastCrumbs) crumbs.innerHTML = lastCrumbs = crumb
  renderSide()
  if (animating) schedule()
}

function renderSide() {
  const html = panelHtml({ fleets, view, now })
  if (html === lastSide) return
  const scroll = side.scrollTop
  side.innerHTML = lastSide = html
  const open = side.querySelector('.cur')
  const opened = open?.dataset.ship ?? null
  if (opened !== lastOpen) open?.scrollIntoView({ block: 'nearest' })
  else side.scrollTop = scroll
  lastOpen = opened
}

function schedule() {
  if (!pending) pending = requestAnimationFrame(render)
}

function setView(next) {
  view = next
  schedule()
}

canvas.addEventListener('click', event => {
  const box = canvas.getBoundingClientRect()
  const ship = sea.hitAt(event.clientX - box.left, event.clientY - box.top)
  if (ship) setView(toShip(ship))
})

side.addEventListener('click', event => {
  const row = event.target.closest('[data-ship]')
  if (row && !event.target.closest('a')) setView(toShip(row.dataset.ship))
})

document.addEventListener('click', event => {
  const target = event.target.closest?.('[data-fleet], [data-armada]')
  if (!target) return
  if (target.dataset.armada !== undefined) setView(toArmada(view, fleets))
  else setView(toFleet(view, fleets, target.dataset.fleet))
})

document.addEventListener('keydown', event => {
  const act = {
    Escape: () => zoomOut(view, fleets),
    ArrowLeft: () => zoomOut(view, fleets),
    ArrowRight: () => zoomIn(view, fleets),
    Enter: () => zoomIn(view, fleets),
    ArrowUp: () => move(view, fleets, -1),
    ArrowDown: () => move(view, fleets, 1),
  }[event.key]
  if (!act || event.metaKey || event.ctrlKey || event.altKey) return
  event.preventDefault()
  setView(act())
})

addEventListener('resize', schedule)

async function poll() {
  try {
    const state = await (await fetch('/api/state')).json()
    const first = fleets.length === 0
    fleets = state.fleets
    now = state.now
    view = first ? initialView(fleets) : reconcile(view, fleets)
    schedule()
  } catch {
    crumbs.textContent = 'server not reachable'
    lastCrumbs = ''
  }
}

poll()
setInterval(poll, 2000)
setInterval(() => {
  frame++
  schedule()
}, 500)
