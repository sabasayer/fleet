import assert from 'node:assert/strict'
import { test } from 'node:test'

import { chipCounts, chipsHtml, CHIPS, isActive, matches, matching, movePick, pickedName, searchKey, shownFleets } from '../web/search.js'
import { keyAction } from '../web/keys.js'
import { panelHtml, resultShips } from '../web/panel.js'

const crew = (stale = false) => [{ role: 'green', state: 'running', stale, updatedMs: 1 }]
const ship = (name: string, extra: Record<string, unknown> = {}, stage = 'sailing', state = stage) => ({
  ship: name,
  title: `Title of ${name}`,
  task: null,
  created: '2026-01-01T00:00:00Z',
  mrs: [{ n: 1, url: null, branch: `feat/${name}`, crew: crew() }],
  needsCaptain: null,
  life: { stage, state, endedAt: null, mrs: [], actions: [] },
  ...extra,
})
const linear = ship('fix-a', { task: 'https://linear.app/acme/issue/ENG-3067', mrs: [{ n: 561, url: 'https://gitlab.com/x/y/-/merge_requests/561', branch: 'feat/slow-search', crew: crew() }] })
const needs = ship('n-1', { needsCaptain: { role: 'gate', reason: 'r', kind: 'blocked' } })
const stale = ship('s-1', { mrs: [{ n: 1, url: null, branch: 'b', crew: crew(true) }] })
const ships = [
  linear,
  needs,
  stale,
  ship('rev', {}, 'in_review'),
  ship('mer', {}, 'merged'),
  ship('rel', {}, 'released'),
  ship('tes', {}, 'testing'),
  ship('don', {}, 'done'),
  ship('pau', {}, 'sailing', 'paused'),
  ship('fai', {}, 'testing', 'failed'),
  ship('aba', {}, 'abandoned'),
]
const names = (list: { ship: string }[]) => list.map(s => s.ship)
const ids = (chip: string, text = '') => names(matching(ships, { text, chip }))

test('match by ship name, title, case ignored', () => {
  assert.ok(matches(linear, 'FIX-A'))
  assert.ok(matches(linear, 'title of'))
})

test('match a Linear ID in the task link', () => {
  assert.ok(matches(linear, 'eng-3067'))
})

test('match an MR number with or without the bang, and the MR url', () => {
  assert.ok(matches(linear, '561'))
  assert.ok(matches(linear, '!561'))
  assert.ok(matches(linear, 'merge_requests/561'))
})

test('match an MR branch', () => {
  assert.ok(matches(linear, 'slow-search'))
})

test('no match, and empty text matches everything', () => {
  assert.equal(matches(linear, 'zzz'), false)
  assert.equal(matches(linear, '!562'), false)
  assert.ok(matches(linear, '  '))
})

test('a ship with no task and no url still matches without errors', () => {
  assert.equal(matches(ship('x'), 'http'), false)
})

test('chip rules', () => {
  assert.deepEqual(ids('needs'), ['n-1'])
  assert.deepEqual(ids('running'), ['fix-a', 's-1'])
  assert.deepEqual(ids('stale'), ['s-1'])
  assert.deepEqual(ids('review'), ['rev'])
  assert.deepEqual(ids('merged'), ['mer', 'rel'])
  assert.deepEqual(ids('testing'), ['tes', 'fai'])
  assert.deepEqual(ids('done'), ['don'])
  assert.deepEqual(ids('stopped'), ['pau', 'fai', 'aba'])
  assert.equal(ids('all').length, ships.length)
})

test('a scout that is still scouting counts as running', () => {
  const scout = ship('sc', { kind: 'scout', mrs: [] })
  assert.ok(CHIPS.find(c => c.id === 'running')!.test(scout))
})

test('search and chip work together', () => {
  assert.deepEqual(ids('running', 'eng-3067'), ['fix-a'])
  assert.deepEqual(ids('needs', 'eng-3067'), [])
})

test('counts follow the search text', () => {
  const all = Object.fromEntries(chipCounts(ships, '').map(c => [c.id, c.count]))
  assert.equal(all.all, 11)
  assert.equal(all.merged, 2)
  const narrowed = Object.fromEntries(chipCounts(ships, 'eng-3067').map(c => [c.id, c.count]))
  assert.equal(narrowed.all, 1)
  assert.equal(narrowed.running, 1)
  assert.equal(narrowed.merged, 0)
})

test('chips show counts and mark the one that is on', () => {
  const html = chipsHtml(ships, { text: '', chip: 'merged' })
  assert.match(html, /<span class="chip on" role="button" data-chip="merged">merged \(2\)<\/span>/)
  assert.match(html, /data-chip="stopped">paused\/failed \(3\)/)
  assert.equal((html.match(/chip on/g) ?? []).length, 1)
})

test('search is active with text or a chip', () => {
  assert.equal(isActive({ text: '', chip: 'all' }), false)
  assert.equal(isActive({ text: ' ', chip: 'all' }), false)
  assert.equal(isActive({ text: 'a', chip: 'all' }), true)
  assert.equal(isActive({ text: '', chip: 'stale' }), true)
})

test('search keys: Esc clears, arrows and Enter pick', () => {
  assert.equal(searchKey('Escape'), 'clear')
  assert.equal(searchKey('Enter'), 'open')
  assert.equal(searchKey('ArrowDown'), 'next')
  assert.equal(searchKey('ArrowUp'), 'prev')
  assert.equal(searchKey('o'), null)
  assert.equal(searchKey('ArrowLeft'), null)
})

test('the pick starts on the first result and stays inside the list', () => {
  const list = ['a', 'b', 'c']
  assert.equal(pickedName(list, null), 'a')
  assert.equal(pickedName(list, 'gone'), 'a')
  assert.equal(movePick(list, null, 1), 'b')
  assert.equal(movePick(list, 'c', 1), 'c')
  assert.equal(movePick(list, 'a', -1), 'a')
  assert.equal(movePick([], null, 1), null)
})

test('/ focuses the search box, but not while typing', () => {
  assert.equal(keyAction({ key: '/', ship: null, typing: false }), 'search')
  assert.equal(keyAction({ key: '/', ship: null, typing: true }), null)
})

const NOW = Date.parse('2026-06-01T00:00:00Z')
const fleet = (list: object[]) => [{ id: 'f', name: 'Fleet', color: '#fff', ships: list }]
const view = { level: 'armada', cursor: 'f' }
const panel = (list: object[], search: object) => panelHtml({ fleets: fleet(list), view, now: NOW, search } as any)
const rowsIn = (html: string) => [...html.matchAll(/data-ship="([^"]+)"/g)].map(m => m[1])

test('without search the panel keeps its normal blocks', () => {
  const html = panel(ships, { text: '', chip: 'all', pick: null })
  assert.match(html, /needs captain/)
  assert.doesNotMatch(html, /results/)
})

test('search text narrows the list to one result block', () => {
  const html = panel(ships, { text: 'eng-3067', chip: 'all', pick: null })
  assert.deepEqual(rowsIn(html), ['fix-a'])
  assert.match(html, /results \(1\)/)
  assert.doesNotMatch(html, /needs captain|harbour/)
})

test('a chip narrows the list, and both together narrow it more', () => {
  assert.deepEqual(rowsIn(panel(ships, { text: '', chip: 'merged', pick: null })).sort(), ['mer', 'rel'])
  assert.deepEqual(rowsIn(panel(ships, { text: 'rel', chip: 'merged', pick: null })), ['rel'])
  assert.deepEqual(rowsIn(panel(ships, { text: 'mer', chip: 'testing', pick: null })), [])
  assert.match(panel(ships, { text: 'mer', chip: 'testing', pick: null }), /No ships match/)
})

test('clearing the text and the chip brings the normal panel back', () => {
  const html = panel(ships, { text: '', chip: 'all', pick: null })
  assert.doesNotMatch(html, /results/)
})

test('results include harbour ships that the harbour hides', () => {
  const oldDone = ship('old-done', {}, 'done')
  oldDone.life.endedAt = NOW - 10 * 86400000
  const html = panel([oldDone], { text: 'old-done', chip: 'all', pick: null })
  assert.match(html, /data-ship="old-done" data-harbour/)
  assert.equal(resultShips(fleet([oldDone]), { text: 'old', chip: 'all' }).length, 1)
})

test('the picked row is marked, the first one by default', () => {
  const two = [ship('a-1'), ship('a-2')]
  assert.match(panel(two, { text: 'a-', chip: 'all', pick: null }), /class="row pick" data-ship="a-1"/)
  assert.match(panel(two, { text: 'a-', chip: 'all', pick: 'a-2' }), /class="row pick" data-ship="a-2"/)
})

test('shownFleets returns the fleets as they are when no search is on', () => {
  const fleets = [{ id: 'f', ships }]
  assert.equal(shownFleets(fleets, { text: '', chip: 'all' }), fleets)
})

test('shownFleets keeps only matching ships and drops empty fleets', () => {
  const fleets = [{ id: 'f1', name: 'one', ships }, { id: 'f2', name: 'two', ships: [needs] }, { id: 'f3', name: 'three', ships: [linear] }]
  const shown = shownFleets(fleets, { text: '', chip: 'needs' })
  assert.deepEqual(shown.map(f => [f.id, f.ships.map(s => s.ship)]), [['f1', ['n-1']], ['f2', ['n-1']]])
  assert.equal(shown[0].name, 'one')
  assert.deepEqual(shownFleets(fleets, { text: 'zzz-none', chip: 'all' }), [])
})
