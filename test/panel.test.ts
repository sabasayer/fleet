import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ago, listedShips, openShipName, waitingShips } from '../web/panel.js'

const member = (updatedMs: number) => ({ role: 'red', state: 'done', stale: false, updatedMs })
const ship = (name: string, updatedMs: number, needs: 'blocked' | 'failed' | null = null) => ({
  ship: name,
  title: name,
  created: '2026-01-01T00:00:00Z',
  mrs: [{ crew: [member(updatedMs)] }],
  needsCaptain: needs && { role: 'gate', reason: 'r', kind: needs },
})
const fleets = [
  { id: 'a', name: 'A', color: '#fff', ships: [ship('a1', 300), ship('a2', 100, 'blocked')] },
  { id: 'b', name: 'B', color: '#fff', ships: [ship('b1', 200, 'failed'), ship('b2', 50)] },
]
const names = (entries: { ship: { ship: string } }[]) => entries.map(e => e.ship.ship)

test('waiting ships list the longest wait first, across fleets', () => {
  assert.deepEqual(names(waitingShips(fleets)), ['a2', 'b1'])
})

test('ships panel puts waiting ships first, then the oldest', () => {
  assert.deepEqual(names(listedShips({ level: 'armada', cursor: 'a' }, fleets)), ['a2', 'b1', 'b2', 'a1'])
})

test('ships panel shows only the focused fleet once zoomed in', () => {
  assert.deepEqual(names(listedShips({ level: 'fleet', cursor: 'b2' }, fleets)), ['b1', 'b2'])
})

test('open ship follows the cursor except at armada level', () => {
  assert.equal(openShipName({ level: 'armada', cursor: 'a' }), null)
  assert.equal(openShipName({ level: 'ship', cursor: 'a1' }), 'a1')
})

test('ago words', () => {
  assert.equal(ago(0, 30000), 'just now')
  assert.equal(ago(0, 5 * 60000), '5 min ago')
  assert.equal(ago(0, 3 * 3600000), '3 h ago')
})
