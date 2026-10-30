import assert from 'node:assert/strict'
import { test } from 'node:test'

import { harbourOf } from '../web/life.js'
import { panelHtml } from '../web/panel.js'

const NOW = Date.parse('2026-10-27T10:00:00Z')
const OUTCOME = 'No bug found. The config was stale.'

const scout = (over: object = {}) => ({
  ship: 'SCOUT-1',
  title: 'Look into the login bug',
  created: '2026-10-26T10:00:00Z',
  task: null,
  mrs: [],
  needsCaptain: null,
  kind: 'scout',
  outcome: null,
  life: { stage: 'sailing', state: 'sailing', endedAt: null, mrs: [], actions: ['pause', 'mark_failed'] },
  ...over,
})
const fleets = (ship: object) => [{ id: 'a', name: 'A', color: '#fff', ships: [ship] }]
const view = { level: 'armada', cursor: 'a' }

test('a scout row reads scouting and has no progress bar', () => {
  const html = panelHtml({ fleets: fleets(scout()), view, now: NOW, jump: null })
  assert.match(html, /scouting/)
  assert.doesNotMatch(html, /class="bar"/)
})

test('a plain ship keeps its progress bar', () => {
  const plain = scout({ ship: 'A-1', kind: 'ship', mrs: [{ n: 1, crew: [{ role: 'red', state: 'done', stale: false, updatedMs: NOW }] }] })
  assert.match(panelHtml({ fleets: fleets(plain), view, now: NOW, jump: null }), /class="bar"/)
})

test('a harbour row for a scout shows the outcome in place of the MR count', () => {
  const docked = scout({ outcome: OUTCOME, life: { stage: 'done', state: 'done', endedAt: NOW - 60000, mrs: [], actions: [] } })
  const html = panelHtml({ fleets: fleets(docked), view, now: NOW, jump: null })
  assert.match(html, /No bug found\. The config was stale\./)
  assert.doesNotMatch(html, /0 MRs/)
})

test('a turned-back scout with no docked time yet shows no time', () => {
  const pending = scout({ outcome: OUTCOME, life: { stage: 'done', state: 'done', endedAt: null, mrs: [], actions: [] } })
  const html = panelHtml({ fleets: fleets(pending), view, now: NOW, jump: null })
  assert.match(html, /docked ·/)
  assert.doesNotMatch(html, /docked \d/)
  assert.doesNotMatch(html, /ago/)
})

test('a turned-back scout with no docked time sorts after one that has a time', () => {
  const pending = scout({ outcome: OUTCOME, life: { stage: 'done', state: 'done', endedAt: null, mrs: [], actions: [] } })
  const timed = scout({ ship: 'SCOUT-9', outcome: OUTCOME, life: { stage: 'done', state: 'done', endedAt: NOW - 60000, mrs: [], actions: [] } })
  const { docked } = harbourOf([{ id: 'a', name: 'A', color: '#fff', ships: [pending, timed] }], NOW)
  assert.deepEqual(docked.map(e => e.ship.ship), ['SCOUT-9', 'SCOUT-1'])
})
