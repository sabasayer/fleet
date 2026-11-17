import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { readState } from '../src/state.ts'

const tmp = mkdtempSync(join(tmpdir(), 'fleet-convoy-'))
const write = (path: string, data: unknown) => {
  mkdirSync(join(tmp, path, '..'), { recursive: true })
  writeFileSync(join(tmp, path), JSON.stringify(data))
}
const ship = (name: string, created: string, convoy?: string) =>
  write(`crew/${name}/ship.json`, { version: 1, ship: name, title: name, task: null, fleet: 'work', created, session: null, mrs: [], ...(convoy ? { convoy } : {}) })
const env = { CREW_BOARD_ROOT: join(tmp, 'crew'), CREW_FLEET_HOME: join(tmp, 'home') }

test('ships of one convoy sit together, in the place of the convoy first ship', () => {
  ship('a', '2026-11-16T10:00:00Z')
  ship('c1-x', '2026-11-16T11:00:00Z', 'c1')
  ship('b', '2026-11-16T12:00:00Z')
  ship('c1-y', '2026-11-16T13:00:00Z', 'c1')
  ship('c', '2026-11-16T14:00:00Z')
  assert.deepEqual(readState(env).fleets[0].ships.map(s => s.ship), ['a', 'c1-x', 'c1-y', 'b', 'c'])
})

test('the admiral of a convoy shows in its fleet with its session, and a bad file is skipped', () => {
  write('crew/c1/admiral.json', { version: 1, convoy: 'c1', fleet: 'work', folder: '/w', created: 'x', session: { id: 'abc', updated: 'y' } })
  write('crew/c2/admiral.json', { convoy: 'c2' })
  write('crew/c3/admiral.json', { version: 1, convoy: 'c3', fleet: 'other', folder: '/o', created: 'x' })
  const fleets = readState(env).fleets
  assert.deepEqual(fleets.find(f => f.id === 'work')!.admirals, [{ convoy: 'c1', folder: '/w', created: 'x', session: { id: 'abc', updated: 'y' } }])
  assert.deepEqual(fleets.find(f => f.id === 'other')!.admirals.map(a => [a.convoy, a.session]), [['c3', null]])
})
