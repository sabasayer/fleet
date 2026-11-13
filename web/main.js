import './embed.js'
import { afterDock, focusFleet, initialView, move, reconcile, showScoutBand, toArmada, toFleet, toShip, zoomIn, zoomOut } from './layout.js'
import { requestJump } from './jump.js'
import { isTyping, keyAction, keysHtml, pressAction } from './keys.js'
import { sendAction } from './actions.js'
import { onSea, seaFleets, shipPhase } from './life.js'
import { chipsHtml, filterCount, filterLabel, isActive, movePick, pickedName, searchKey, shownFleets } from './search.js'
import { newShipFormHtml, requestNewShip, repoChoices, preselectedRepo, optionsHtml, startHint } from './newship.js'
import { allShips, openShipName, panelHtml, resultShips } from './panel.js'
import { createSea } from './sea.js'
import { applyTheme, cssVars, DARK, LIGHT } from './theme.js'

const params = new URLSearchParams(location.search)
const themeName = ['light', 'dark'].includes(params.get('theme')) ? params.get('theme') : null
const forced = themeName && { light: LIGHT, dark: DARK }[themeName]
const lightQuery = matchMedia('(prefers-color-scheme: light)')
const applySystemTheme = () => applyTheme(forced ?? (lightQuery.matches ? LIGHT : DARK))
applySystemTheme()
if (forced) document.documentElement.style.cssText = `color-scheme: ${themeName}; ${cssVars(forced)}`

const canvas = document.getElementById('sea')
const ui = document.getElementById('ui')
const crumbs = document.getElementById('crumbs')
const side = document.getElementById('side')
const right = document.getElementById('right')
const searchInput = document.getElementById('search-text')
const chipsBox = document.getElementById('chips')
const filterButton = document.getElementById('filter-toggle')
const searchBox = document.getElementById('search-box')
const shortQuery = matchMedia('(max-width: 759px) and (max-height: 639px)')
const modal = document.getElementById('modal')
const sea = createSea(canvas, ui, document.getElementById('scroll'), document.getElementById('world'))
const token = document.querySelector('meta[name="fleet-token"]')?.content ?? ''
const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

let allFleets = []
let seaBase = []
let fleets = []
let harbourOpen = params.get('ship')
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
let helpOpen = false
let confirm = null
let search = { text: '', chip: 'all', pick: null }
let lastChips = ''
let confirmTimer = 0
let manual

const anyScout = () => fleets.some(fleet => fleet.ships.some(ship => shipPhase(ship) === 'scouting'))

function crumbHtml() {
  if (fleets.length === 0) return 'no ships'
  const fleet = focusFleet(view, fleets)
  const parts = [`<a data-armada>armada</a>`]
  if (view.level !== 'armada' && fleet) parts.push(`<a data-fleet="${escapeHtml(fleet.id)}">${escapeHtml(fleet.name)}</a>`)
  if (view.level === 'ship') parts.push(`<span class="crumb-title">${escapeHtml(fleet.ships.find(s => s.ship === view.cursor)?.title ?? view.cursor)}</span>`)

  return `${parts.join(' › ')} <span class="dim keys">(↑↓ move · → in · ← out · o scouting · / search · ? keys)</span>`
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

function showFleets() {
  fleets = shownFleets(seaBase, search)
  view = reconcile(view, fleets)
}

const resultNames = () => resultShips(allFleets, search).map(entry => entry.ship.ship)

function renderChips() {
  const html = chipsHtml(allShips(allFleets).map(entry => entry.ship), search)
  if (html !== lastChips) chipsBox.innerHTML = lastChips = html
  filterButton.textContent = filterLabel(search)
  searchBox.classList.toggle('filtered', filterCount(search) > 0)
}

function renderSide() {
  const html = panelHtml({ fleets: allFleets, view, now, opened: harbourOpen, jump, starting, confirm, search, split: shortQuery.matches })
  right.classList.toggle('empty', allFleets.length === 0 && html === '')
  renderChips()
  if (html === lastSide) return
  const scroll = side.scrollTop
  side.innerHTML = lastSide = html
  const open = side.querySelector(shortQuery.matches ? '.open-panel' : '.cur')
  const opened = open?.dataset.ship ?? open?.dataset.open ?? null
  if (opened !== lastOpen) open?.scrollIntoView({ block: 'nearest' })
  else side.scrollTop = scroll
  lastOpen = opened
}

function schedule() {
  if (!pending) pending = requestAnimationFrame(render)
}

lightQuery.addEventListener('change', () => {
  applySystemTheme()
  lastUi = ''
  lastSide = ''
  schedule()
})

function setConfirm(next) {
  clearTimeout(confirmTimer)
  confirm = next
  if (next) confirmTimer = setTimeout(() => setConfirm(null), 4000)
  renderSide()
}

function setView(next) {
  if (confirm) setConfirm(null)
  harbourOpen = null
  view = next
  schedule()
}

canvas.addEventListener('click', event => {
  const box = canvas.getBoundingClientRect()
  const ship = sea.hitAt(event.clientX - box.left, event.clientY - box.top)
  if (ship) setView(toShip(ship))
})

function activate(name) {
  const ship = allShips(allFleets).find(entry => entry.ship.ship === name)?.ship
  if (ship && !onSea(ship, now)) {
    harbourOpen = harbourOpen === name ? null : name
    schedule()

    return
  }
  setView(toShip(name))
}

function setSearch(next) {
  search = { ...search, pick: null, ...next }
  showFleets()
  schedule()
}

searchInput.addEventListener('input', () => setSearch({ text: searchInput.value }))

filterButton.addEventListener('click', () => {
  const shown = searchBox.classList.toggle('chips-open')
  filterButton.setAttribute('aria-expanded', String(shown))
})

shortQuery.addEventListener('change', () => {
  lastSide = ''
  schedule()
})

chipsBox.addEventListener('click', event => {
  const chip = event.target.closest('[data-chip]')
  if (chip) setSearch({ chip: chip.dataset.chip })
})

function pressSearchKey(event) {
  const action = searchKey(event.key)
  if (!action) return
  event.preventDefault()
  if (action === 'clear') {
    searchInput.value = ''
    searchInput.blur()
    setSearch({ text: '' })
  } else if (action === 'open') {
    const name = pickedName(resultNames(), search.pick)
    if (!isActive(search) || !name) return
    searchInput.blur()
    activate(name)
  } else setSearch({ pick: movePick(resultNames(), search.pick, action === 'next' ? 1 : -1) })
}

async function startJump(ship) {
  if (jump?.busy) return
  jump = { ship, busy: true }
  renderSide()
  jump = { ship, busy: false, result: await requestJump(ship, token) }
  renderSide()
}

function renderModal() {
  modal.innerHTML = newShip ? newShipFormHtml({ fleets: allFleets, form: newShip.form, busy: newShip.busy, result: newShip.result }) : helpOpen ? keysHtml() : ''
}

function openNewShip() {
  const fleet = focusFleet(view, fleets)
  const fleetName = fleet?.name ?? ''
  const autoFolder = preselectedRepo(allFleets, fleetName)
  newShip = { autoFolder, form: { fleet: fleetName, folder: autoFolder, task: '', start: 'crew', copied: false }, busy: false, result: null }
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
  if (event.target.name === 'start') return void (modal.querySelector('#newship-hint').textContent = startHint(newShip.form.start))
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
  if (helpOpen) return toggleHelp()
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

function toggleHelp() {
  helpOpen = !helpOpen
  renderModal()
}

const shipUnderCursor = () => {
  const name = harbourOpen ?? openShipName(view)

  return allFleets.flatMap(f => f.ships).find(s => s.ship === name) ?? null
}

function pressKey(event) {
  const ship = shipUnderCursor()
  const action = keyAction({ key: event.key, ship, typing: isTyping(event.target) })
  if (!action) return false
  event.preventDefault()
  if (action === 'help') toggleHelp()
  else if (action === 'new') openNewShip()
  else if (action === 'search') searchInput.focus()
  else if (action === 'jump') void startJump(ship.ship)
  else {
    const press = pressAction(confirm, ship.ship, action)
    setConfirm(press.confirm)
    if (press.fire) sendAction(ship.ship, action).then(poll)
  }

  return true
}

document.addEventListener('keydown', event => {
  if (newShip) {
    if (event.key === 'Escape') closeNewShip()

    return
  }
  if (helpOpen) {
    if (event.key === 'Escape' || event.key === '?') toggleHelp()

    return
  }
  if (event.target === searchInput) {
    pressSearchKey(event)

    return
  }
  const plain = !event.metaKey && !event.ctrlKey && !event.altKey
  if (plain && pressKey(event)) return
  if (confirm) setConfirm(null)
  if (event.key === 'o' && !event.metaKey && !event.ctrlKey && !event.altKey) {
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
    const first = seaBase.length === 0
    const wasOnSea = view.level !== 'armada' ? view.cursor : null
    allFleets = state.fleets
    now = state.now
    seaBase = seaFleets(allFleets, now)
    fleets = shownFleets(seaBase, search)
    const docked = wasOnSea && !seaBase.some(f => f.ships.some(s => s.ship === wasOnSea)) ? allFleets.find(f => f.ships.some(s => s.ship === wasOnSea)) : null
    if (docked) {
      view = afterDock(docked.id, fleets)
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
