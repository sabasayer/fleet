import assert from 'node:assert/strict'
import { test } from 'node:test'

import { applyAction, emptyStored, isShipName, lifeOf, normalizeStored, shipStage, type MrInput, type Stored } from '../src/life.ts'

const done = [{ state: 'done' }, { state: 'done' }]
const mr = (n: number, crew = done, url: string | null = `https://x/mr/${n}`): MrInput => ({ n, url, crew })
const stored = (mrs: Stored['mrs'] = {}, extra: Partial<Stored> = {}): Stored => ({ ...emptyStored(), mrs, ...extra })
const at = (state: Stored['mrs'][string]['state']) => ({ state, sha: null, changed: '2026-10-20T10:00:00Z' })
const NOW = '2026-10-26T10:00:00Z'

test('sailing until every crew member is done and the MR has a link', () => {
  assert.equal(shipStage([mr(1, [{ state: 'done' }, { state: 'running' }])], stored()), 'sailing')
  assert.equal(shipStage([mr(1, done, null)], stored()), 'sailing')
  assert.equal(shipStage([mr(1, [])], stored()), 'sailing')
  assert.equal(shipStage([], stored()), 'sailing')
  assert.equal(shipStage([mr(1)], stored()), 'in_review')
})

test('stored MR state moves the ship on', () => {
  for (const state of ['merged', 'released', 'testing', 'done'] as const) {
    assert.equal(shipStage([mr(1)], stored({ 1: at(state) })), state)
  }
})

test('several MRs: the ship takes the least advanced MR', () => {
  assert.equal(shipStage([mr(1), mr(2)], stored({ 1: at('released'), 2: at('merged') })), 'merged')
  assert.equal(shipStage([mr(1), mr(2)], stored({ 1: at('testing') })), 'in_review')
  assert.equal(shipStage([mr(1), mr(2, [{ state: 'running' }])], stored({ 1: at('testing') })), 'sailing')
})

test('done only when every MR is done', () => {
  assert.equal(shipStage([mr(1), mr(2)], stored({ 1: at('done'), 2: at('testing') })), 'testing')
  assert.equal(shipStage([mr(1), mr(2)], stored({ 1: at('done'), 2: at('done') })), 'done')
})

test('a new MR sends a testing ship back to sailing', () => {
  const kept = stored({ 1: at('testing') })
  assert.equal(shipStage([mr(1)], kept), 'testing')
  const next = lifeOf([mr(1), mr(2, [{ state: 'running' }], null)], kept)
  assert.equal(next.stage, 'sailing')
  assert.equal(next.mrs[0].state, 'testing')
})

test('bug found sends the ship back to sailing until a new MR exists', () => {
  const testing = stored({ 1: at('testing') })
  const back = applyAction([mr(1)], testing, 'bug_found', NOW)
  assert.equal(lifeOf([mr(1)], back).state, 'sailing')
  assert.equal(lifeOf([mr(1)], back).mrs[0].state, 'testing')
  assert.equal(lifeOf([mr(1), mr(2)], back).stage, 'in_review')
})

test('a new MR on a done ship sends it back to sailing', () => {
  const docked = stored({ 1: at('done') }, { docked: NOW })
  assert.equal(lifeOf([mr(1), mr(2, [{ state: 'running' }])], docked).state, 'sailing')
})

test('abandoned MRs do not hold the ship back, and all abandoned means abandoned', () => {
  assert.equal(shipStage([mr(1), mr(2)], stored({ 1: at('abandoned'), 2: at('merged') })), 'merged')
  assert.equal(shipStage([mr(1)], stored({ 1: at('abandoned') })), 'abandoned')
  assert.deepEqual(lifeOf([mr(1)], stored({ 1: at('abandoned') })).actions, [])
})

test('paused and failed flags show as the ship state, the stage stays', () => {
  const paused = lifeOf([mr(1)], stored({ 1: at('merged') }, { paused: true }))
  assert.equal(paused.state, 'paused')
  assert.equal(paused.stage, 'merged')
  const failed = lifeOf([mr(1)], stored({}, { paused: true, failed: true }))
  assert.equal(failed.state, 'failed')
})

test('a failed crew member does not fail the ship', () => {
  assert.equal(lifeOf([mr(1, [{ state: 'failed' }, { state: 'done' }])], stored()).state, 'sailing')
})

test('buttons show only where they apply', () => {
  const actions = (s: Stored, mrs = [mr(1)]) => lifeOf(mrs, s).actions
  assert.deepEqual(actions(stored()), ['mark_merged', 'pause', 'mark_failed'])
  assert.deepEqual(actions(stored({ 1: at('merged') })), ['mark_released', 'pause', 'mark_failed'])
  assert.deepEqual(actions(stored({ 1: at('released') })), ['start_testing', 'pause', 'mark_failed'])
  assert.deepEqual(actions(stored({ 1: at('testing') })), ['done', 'bug_found', 'pause', 'mark_failed'])
  assert.deepEqual(actions(stored({ 1: at('done') })), ['undock'])
  assert.deepEqual(actions(stored({}, { paused: true })), ['resume', 'mark_failed'])
  assert.deepEqual(actions(stored({}, { failed: true })), ['resume'])
  assert.deepEqual(actions(stored(), [mr(1, [{ state: 'running' }])]), ['pause', 'mark_failed'])
})

test('walking a ship from in_review to done and back out', () => {
  let s = emptyStored()
  const mrs = [mr(1)]
  const step = (action: Parameters<typeof applyAction>[2]) => (s = applyAction(mrs, s, action, NOW))
  assert.equal(lifeOf(mrs, step('mark_merged')).state, 'merged')
  assert.equal(lifeOf(mrs, step('mark_released')).state, 'released')
  assert.equal(lifeOf(mrs, step('start_testing')).state, 'testing')
  assert.equal(s.docked, null)
  const docked = lifeOf(mrs, step('done'))
  assert.equal(docked.state, 'done')
  assert.equal(docked.endedAt, Date.parse(NOW))
  const back = lifeOf(mrs, step('undock'))
  assert.equal(back.state, 'testing')
  assert.equal(s.docked, null)
})

test('an action moves only the MRs at the ship stage', () => {
  const mrs = [mr(1), mr(2)]
  const s = applyAction(mrs, stored({ 1: at('released') }), 'mark_merged', NOW)
  assert.equal(s.mrs[1].state, 'released')
  assert.equal(s.mrs[2].state, 'merged')
})

test('pause, mark failed and resume change only the flags', () => {
  const base = stored({ 1: at('merged') })
  const paused = applyAction([mr(1)], base, 'pause', NOW)
  assert.deepEqual([paused.paused, paused.failed, paused.mrs], [true, false, base.mrs])
  const failed = applyAction([mr(1)], paused, 'mark_failed', NOW)
  assert.deepEqual([failed.paused, failed.failed], [false, true])
  const resumed = applyAction([mr(1)], failed, 'resume', NOW)
  assert.deepEqual([resumed.paused, resumed.failed], [false, false])
})

test('an action that does not apply throws', () => {
  assert.throws(() => applyAction([mr(1)], stored(), 'mark_released', NOW), /does not apply/)
  assert.throws(() => applyAction([mr(1)], stored({}, { paused: true }), 'mark_merged', NOW), /does not apply/)
})

test('bad stored data falls back to safe values', () => {
  assert.deepEqual(normalizeStored('nope'), emptyStored())
  assert.deepEqual(normalizeStored({ mrs: { 1: { state: 'bogus' } }, paused: 'yes' }), emptyStored())
})

test('ship names reject path tricks', () => {
  for (const bad of ['', '../x', 'a/b', '.hidden', 'a b', 5, null]) assert.equal(isShipName(bad), false)
  for (const good of ['ENG-1', 'PORTAL-101', 'a.b_c']) assert.equal(isShipName(good), true)
})
