import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isStatusFile, parseCrewMember, sortChain } from '../src/board.ts'

const at = (role: string, extra = {}) =>
  parseCrewMember(`${role}.json`, JSON.stringify({ role, state: 'running', updated: '2026-10-16T14:00:00Z', ...extra }), 0, Date.parse('2026-10-16T14:00:00Z'))

test('running member silent for over 15 minutes is stale', () => {
  const text = JSON.stringify({ role: 'green', state: 'running', updated: '2026-10-16T14:00:00Z' })
  assert.equal(parseCrewMember('green.json', text, 0, Date.parse('2026-10-16T14:14:00Z')).stale, false)
  assert.equal(parseCrewMember('green.json', text, 0, Date.parse('2026-10-16T14:16:00Z')).stale, true)
})

test('chain order: known roles in flow order, unknown last, order field wins', () => {
  const roles = sortChain(['browser', 'zzz', 'review-spec', 'green', 'red', 'fixer'].map(r => at(r))).map(a => a.role)
  assert.deepEqual(roles, ['red', 'green', 'review-spec', 'fixer', 'browser', 'zzz'])
  assert.equal(sortChain([at('red'), at('zzz', { order: 1 })])[0]?.role, 'zzz')
})

test('bad json becomes an unreadable member', () => {
  assert.deepEqual(parseCrewMember('x.json', '{', 5, 5), { role: 'x', state: 'unreadable', updatedMs: 5, stale: false })
})

test('ship.json is not a status file', () => {
  assert.equal(isStatusFile('ship.json'), false)
  assert.equal(isStatusFile('red.json'), true)
  assert.equal(isStatusFile('notes.md'), false)
})
