import { focusFleet, initialView, move, reconcile, showScoutBand, toArmada, toFleet, toShip, zoomIn, zoomOut } from './layout.js'
import { requestJump } from './jump.js'
import { sendAction } from './actions.js'
import { onSea, seaFleets, shipPhase } from './life.js'
import { newShipFormHtml, requestNewShip, repoChoices, preselectedRepo, optionsHtml } from './newship.js'
import { panelHtml } from './panel.js'
import { createSea } from './sea.js'

const canvas = document.getElementById('sea')
const ui = document.getElementById('ui')
const crumbs = document.getElementById('crumbs')
const side = document.getElementById('side')
const modal = document.getElementById('modal')
const sea = createSea(canvas, ui)
const token = document.querySelector('meta[name="fleet-token"]')?.content ?? ''
const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

let allFleets = []
let fleets = []
let harbourOpen = null
let now = Date.now()
let view = initialView(fleets)
let frame = 0
let pending = 0
let lastUi = ''
let lastCrumbs = ''
let lastSide = ''
let lastOpen = null
let jump = null
let starting = []
let newShip = null
let manual

const anyScout = () => fleets.some(fleet => fleet.ships.some(ship => shipPhase(ship) === 'scouting'))

function crumbHtml() {
  if (fleets.length === 0) return 'no ships'
  const fleet = focusFleet(view, fleets)
  const parts = [`<a data-armada>armada</a>`]
  if (view.level !== 'armada' && fleet) parts.push(`<a data-fleet="${escapeHtml(fleet.id)}">${escapeHtml(fleet.name)}</a>`)
  if (view.level === 'ship') parts.push(escapeHtml(fleet.ships.find(s => s.ship === view.cursor)?.title ?? view.cursor))

  return `${parts.join(' › ')} <span class="dim">(↑↓ move · → in · ← out · s scouting)</span>`
}

function render() {
  pending = 0
  const band = showScoutBand(manual, anyScout())
  const { html, animating } = sea.draw({ fleets, view, frame, band })
  if (html !== lastUi) ui.innerHTML = lastUi = html
  const crumb = crumbHtml()
  if (crumb !== lastCrumbs) crumbs.innerHTML = lastCrumbs = crumb
  renderSide()
  if (animating) schedule()
}

function renderSide() {
  const html = panelHtml({ fleets: allFleets, view, now, opened: harbourOpen, jump, starting })
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
  harbourOpen = null
  view = next
  schedule()
}

canvas.addEventListener('click', event => {
  const box = canvas.getBoundingClientRect()
  const ship = sea.hitAt(event.clientX - box.left, event.clientY - box.top)
  if (ship) setView(toShip(ship))
})

async function startJump(ship) {
  if (jump?.busy) return
  jump = { ship, busy: true }
  renderSide()
  jump = { ship, busy: false, result: await requestJump(ship, token) }
  renderSide()
}

function renderModal() {
  modal.innerHTML = newShip ? newShipFormHtml({ fleets: allFleets, form: newShip.form, busy: newShip.busy, result: newShip.result }) : ''
}

function openNewShip() {
  const fleet = focusFleet(view, fleets)
  const fleetName = fleet?.name ?? ''
  const autoFolder = preselectedRepo(allFleets, fleetName)
  newShip = { autoFolder, form: { fleet: fleetName, folder: autoFolder, task: '', scout: false, copied: false }, busy: false, result: null }
  renderModal()
  modal.querySelector('input[name="fleet"]')?.focus()
}

function closeNewShip() {
  newShip = null
  renderModal()
}

async function submitNewShip() {
  if (!newShip || newShip.busy) return
  newShip.busy = true
  renderModal()
  const form = newShip.form
  const result = await requestNewShip(form, token)
  if (!newShip) return
  newShip = { form, busy: false, result }
  if (result.status === 'started') {
    closeNewShip()
    poll()

    return
  }
  renderModal()
}

document.getElementById('newship-open').addEventListener('click', openNewShip)

modal.addEventListener('input', event => {
  if (!newShip || !event.target.name) return
  newShip.form[event.target.name] = event.target.type === 'checkbox' ? event.target.checked : event.target.value
  if (event.target.name !== 'fleet') return
  modal.querySelector('#newship-repos').innerHTML = optionsHtml(repoChoices(allFleets, newShip.form.fleet))
  if (newShip.form.folder !== '' && newShip.form.folder !== newShip.autoFolder) return
  newShip.autoFolder = preselectedRepo(allFleets, newShip.form.fleet)
  newShip.form.folder = newShip.autoFolder
  modal.querySelector('[name=folder]').value = newShip.autoFolder
})

modal.addEventListener('submit', event => {
  event.preventDefault()
  void submitNewShip()
})

modal.addEventListener('click', async event => {
  if (event.target === modal || event.target.closest('[data-newship-close]')) return closeNewShip()
  const copy = event.target.closest('[data-copy-new]')
  if (!copy) return
  try {
    await navigator.clipboard.writeText(copy.dataset.copyNew)
    newShip.form.copied = true
    renderModal()
  } catch {}
})

async function copyCommand(text) {
  try {
    await navigator.clipboard.writeText(text)
    jump = { ...jump, copied: true }
    renderSide()
  } catch {}
}

side.addEventListener('click', async event => {
  const jumpButton = event.target.closest('[data-jump]')
  if (jumpButton) return void startJump(jumpButton.dataset.jump)
  const copyButton = event.target.closest('[data-copy]')
  if (copyButton) return void copyCommand(copyButton.dataset.copy)
  const button = event.target.closest('button[data-action]')
  if (button) {
    button.disabled = true
    await sendAction(button.dataset.ship, button.dataset.action)
    poll()

    return
  }
  const harbour = event.target.closest('[data-harbour]')
  if (harbour) {
    harbourOpen = harbourOpen === harbour.dataset.ship ? null : harbour.dataset.ship
    schedule()

    return
  }
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
  if (newShip) {
    if (event.key === 'Escape') closeNewShip()

    return
  }
  if (event.key === 's' && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault()
    manual = !showScoutBand(manual, anyScout())
    schedule()

    return
  }
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
    const wasOnSea = view.level !== 'armada' ? view.cursor : null
    allFleets = state.fleets
    now = state.now
    fleets = seaFleets(allFleets, now)
    const docked = wasOnSea && !fleets.some(f => f.ships.some(s => s.ship === wasOnSea)) ? allFleets.find(f => f.ships.some(s => s.ship === wasOnSea)) : null
    if (docked) {
      harbourOpen = wasOnSea
      view = fleets.some(f => f.id === docked.id) ? toFleet(initialView(fleets), fleets, docked.id) : initialView(fleets)
    } else view = first ? initialView(fleets) : reconcile(view, fleets)
    const opened = allFleets.flatMap(f => f.ships).find(s => s.ship === harbourOpen)
    if (opened && onSea(opened, now)) {
      view = toShip(opened.ship)
      harbourOpen = null
    } else if (!opened) harbourOpen = null
    starting = state.starting ?? []
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
