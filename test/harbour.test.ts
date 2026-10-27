import assert from 'node:assert/strict'
import { test } from 'node:test'

import { harbourOf, onSea, seaFleets } from '../web/life.js'
import { panelHtml } from '../web/panel.js'
import { shipPlaceX } from '../web/layout.js'

const DAY = 86400000
const NOW = 100 * DAY
const ship = (name: string, stage: string, endedAt: number | null = null, state = stage) => ({
  ship: name, title: name, created: '2026-01-01T00:00:00Z', needsCaptain: null,
  mrs: [{ n: 1, crew: [{ role: 'red', state: 'done', stale: false, updatedMs: 0 }] }],
  life: { stage, state, endedAt, actions: stage === 'done' ? ['undock'] : [], mrs: [{ n: 1, state: stage }] },
})
const fleets = [{ id: 'a', name: 'A', color: '#fff', ships: [
  ship('sea1', 'merged'), ship('new', 'done', NOW - DAY), ship('old', 'done', NOW - 4 * DAY),
  ship('wreck', 'abandoned', NOW - DAY), ship('oldwreck', 'abandoned', NOW - 5 * DAY),
] }]
const names = (list: { ship: { ship: string } }[]) => list.map(e => e.ship.ship)

test('done ships leave the sea and list in the harbour for 3 days', () => {
  assert.deepEqual(seaFleets(fleets, NOW)[0].ships.map(s => s.ship), ['sea1', 'wreck'])
  assert.deepEqual(names(harbourOf(fleets, NOW).docked), ['new'])
})

test('older done and abandoned ships are counted as hidden', () => {
  assert.equal(harbourOf(fleets, NOW).hidden, 2)
  assert.equal(onSea(fleets[0].ships[4], NOW), false)
})

test('a ship without life data counts as sailing', () => {
  assert.equal(onSea({ ship: 'x', mrs: [] }, NOW), true)
})

test('the panel lists the harbour with +N hidden, and buttons for the open ship', () => {
  const html = panelHtml({ fleets, view: { level: 'fleet', cursor: 'sea1' }, now: NOW })
  assert.match(html, /harbour \(1\)/)
  assert.match(html, /\+2 hidden/)
  assert.match(html, /data-harbour/)
  const opened = panelHtml({ fleets, view: { level: 'armada', cursor: 'a' }, now: NOW, opened: 'new' })
  assert.match(opened, /data-action="undock"/)
})

test('after-crew zones hold the ship in order', () => {
  const crew = [{ state: 'done' }]
  const x = (stage: string) => shipPlaceX({ life: { stage } }, crew, 100, 600)
  assert.ok(x('in_review') < x('merged') && x('merged') < x('released') && x('released') < x('testing'))
  assert.ok(x('sailing') < x('in_review'))
})
