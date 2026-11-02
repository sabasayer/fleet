import { expect, test } from 'claude-code/testing'

import { age, alerts, bar, inFocus, isStale, isStatusFile, oldRuns, parseAgent, resolveRoot, sortChain } from './board.ts'

const at = (role: string, extra = {}) =>
  parseAgent(`${role}.json`, JSON.stringify({ role, state: 'running', updated: '2026-10-16T14:00:00Z', ...extra }), 0)

test('running agent silent for over 15 minutes is stale', () => {
  const a = at('green')
  expect(isStale(a, a.updatedMs + 14 * 60_000)).toBe(false)
  expect(isStale(a, a.updatedMs + 16 * 60_000)).toBe(true)
  expect(isStale({ ...a, state: 'done' }, a.updatedMs + 16 * 60_000)).toBe(false)
})

test('chain order: known roles in flow order, unknown last, order field wins', () => {
  const roles = sortChain(['browser', 'zzz', 'review-spec', 'green', 'red', 'fixer'].map(r => at(r))).map(a => a.role)
  expect(roles).toEqual(['red', 'green', 'review-spec', 'fixer', 'browser', 'zzz'])
  expect(sortChain([at('red'), at('zzz', { order: 1 })])[0]?.role).toBe('zzz')
})

test('spike sorts before red and summary is read', () => {
  expect(sortChain([at('red'), at('spike')]).map(a => a.role)).toEqual(['spike', 'red'])
  expect(at('red', { summary: 'ok' }).summary).toBe('ok')
  expect(at('red', { summary: '' }).summary).toBeUndefined()
})

test('bad json becomes an unreadable row', () => {
  expect(parseAgent('x.json', '{', 5)).toMatchObject({ role: 'x', state: 'unreadable', updatedMs: 5 })
})

test('bar and age', () => {
  expect(bar(at('r', { done: 12, total: 24 }), 10, 0)).toBe('█████░░░░░')
  expect(bar(at('r'), 10, 3)).toHaveLength(10)
  expect(age(90_000)).toBe('1m')
  expect(age(3_900_000)).toBe('1h5m')
})

test('root: env wins, then option, then ~/.crew; ~ expands', () => {
  expect(resolveRoot(undefined, undefined, '/Users/a')).toBe('/Users/a/.crew')
  expect(resolveRoot('', '/opt/x/', '/Users/a')).toBe('/opt/x')
  expect(resolveRoot('~/runs', '/opt/x', '/Users/a')).toBe('/Users/a/runs')
})

test('old runs are those silent for over 30 days', () => {
  const day = 24 * 3600_000
  const t = (name: string, ageDays: number) => ({ name, agents: [], newestMs: 100 * day - ageDays * day })
  expect(oldRuns([t('a', 29), t('b', 31)], 100 * day).map(x => x.name)).toEqual(['b'])
})

test('alerts fire once when an agent becomes blocked, failed or stale', () => {
  const board = (agents: ReturnType<typeof at>[], now = 0) => ({ tickets: [{ name: 't', agents, newestMs: 0 }], now })
  const old = board([at('gate-spec', { state: 'queued' }), at('red'), at('green', { state: 'queued' })], 1)
  const next = board([at('gate-spec', { state: 'blocked', phase: 'approve the spec' }), at('red'), at('green', { state: 'failed', summary: 'tests red' })], 1)
  expect(alerts(null, next)).toEqual([])
  expect(alerts(old, next).map(a => a.text)).toEqual(['t: gate-spec waits for you - approve the spec', 't: green failed - tests red'])
  expect(alerts(next, next)).toEqual([])
  const late = { ...next, now: at('red').updatedMs + 16 * 60_000 }
  expect(alerts(next, late).map(a => a.kind)).toEqual(['stale'])
})

test('a ticket name shows all its MR run folders', () => {
  expect(inFocus('ENG-2876-mr1', 'eng-2876')).toBe(true)
  expect(inFocus('eng-2876-mr2', 'eng-2876')).toBe(true)
  expect(inFocus('eng-2876', 'eng-2876')).toBe(true)
  expect(inFocus('eng-28760-mr1', 'eng-2876')).toBe(false)
  expect(inFocus('eng-2876-mr1', 'eng-2876-mr2')).toBe(false)
})

test('ship.json is not a status file', () => {
  expect(['ship.json', 'red.json', 'notes.txt'].filter(isStatusFile)).toEqual(['red.json'])
})
