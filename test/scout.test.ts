import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { applyAction, emptyStored, lifeOf, readStored, shipStage, type MrInput, type Stored } from '../src/life.ts'
import { startServer } from '../src/server.ts'
import { readState } from '../src/state.ts'
import { startWatcher, type Deps } from '../src/watch.ts'
import { shipPhase } from '../web/life.js'

const DOCKED = '2026-10-26T10:00:00Z'
const OUTCOME = 'No bug found. The config was stale.'
const mr = (n: number): MrInput => ({ n, url: `https://x/mr/${n}`, crew: [{ state: 'done' }] })
const stored = (extra: Partial<Stored> = {}): Stored => ({ ...emptyStored(), ...extra })

const write = (path: string, data: unknown) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}

function setup(ships: Record<string, object>) {
  const tmp = mkdtempSync(join(tmpdir(), 'fleet-scout-'))
  const env = { CREW_BOARD_ROOT: join(tmp, 'crew'), CREW_FLEET_HOME: join(tmp, 'home') }
  write(join(tmp, 'home', 'fleets.json'), { f: {} })
  for (const [name, extra] of Object.entries(ships)) {
    write(join(tmp, 'crew', name, 'ship.json'), {
      version: 1, ship: name, title: 't', task: null, fleet: 'f', created: '2026-10-20T10:00:00Z', session: null, mrs: [], ...extra,
    })
  }

  return { env }
}

const deps = (now: () => number): Deps => ({
  cli: async () => ({ ok: true, stdout: '{}' }),
  check: async () => ({ code: 1, timedOut: false }),
  now,
})

const shipOf = (env: NodeJS.ProcessEnv, name: string) => readState(env).fleets.flatMap(f => f.ships).find(s => s.ship === name)!

test('readShip reads kind and outcome', () => {
  const { env } = setup({ 'SCOUT-1': { kind: 'scout', outcome: OUTCOME } })
  const ship = shipOf(env, 'SCOUT-1')
  assert.equal(ship.kind, 'scout')
  assert.equal(ship.outcome, OUTCOME)
})

test('a ship file with no kind and no outcome reads as a ship with no outcome', () => {
  const { env } = setup({ 'OLD-1': {} })
  const ship = shipOf(env, 'OLD-1')
  assert.equal(ship.kind, 'ship')
  assert.equal(ship.outcome, null)
})

test('a turned-back scout is done, with its docked time and no buttons', () => {
  const life = lifeOf([], stored({ docked: DOCKED }), true)
  assert.equal(life.stage, 'done')
  assert.equal(life.endedAt, Date.parse(DOCKED))
  assert.deepEqual(life.actions, [])
})

test('a turned-back scout is done whatever the MR list says', () => {
  assert.equal(shipStage([], stored(), true), 'done')
  assert.equal(shipStage([mr(1)], stored(), true), 'done')
})

test('a ship that is not a turned-back scout keeps todays stage', () => {
  assert.equal(shipStage([], stored(), false), 'sailing')
  assert.equal(shipStage([mr(1)], stored(), false), 'in_review')
  assert.deepEqual(lifeOf([mr(1)], stored(), false).actions, ['mark_merged', 'pause', 'mark_failed'])
})

test('readShip passes the turned-back fact on, so the scout docks', () => {
  const { env } = setup({ 'SCOUT-2': { kind: 'scout', outcome: OUTCOME } })
  const ship = shipOf(env, 'SCOUT-2')
  assert.equal(ship.life.stage, 'done')
  assert.deepEqual(ship.life.actions, [])
})

test('a scout that gained MR 1 stays a normal ship', () => {
  const { env } = setup({
    'SCOUT-3': {
      kind: 'scout',
      outcome: null,
      mrs: [{ n: 1, repo: '/r', remote: 'o', worktree: '/w', branch: 'b', url: 'https://x/mr/1' }],
    },
  })
  const ship = shipOf(env, 'SCOUT-3')
  assert.equal(ship.kind, 'scout')
  assert.equal(ship.life.stage, 'sailing')
  assert.deepEqual(ship.life.actions, ['pause', 'mark_failed'])
})

test('a tick docks a turned-back scout with the time it ran', async () => {
  const { env } = setup({ 'SCOUT-4': { kind: 'scout', outcome: OUTCOME } })
  const home = env.CREW_FLEET_HOME!
  await startWatcher({ env, deps: deps(() => 1_000_000), auto: false }).tick()
  assert.equal(readStored(home, 'SCOUT-4').docked, new Date(1_000_000).toISOString())
  assert.equal(shipOf(env, 'SCOUT-4').life.endedAt, 1_000_000)
})

test('a second tick does not write the docked time again', async () => {
  const { env } = setup({ 'SCOUT-5': { kind: 'scout', outcome: OUTCOME } })
  const home = env.CREW_FLEET_HOME!
  let now = 1_000_000
  const watcher = startWatcher({ env, deps: deps(() => now), auto: false })
  await watcher.tick()
  now = 9_000_000
  await watcher.tick()
  assert.equal(readStored(home, 'SCOUT-5').docked, new Date(1_000_000).toISOString())
})

test('a tick docks neither a scouting scout nor a plain ship', async () => {
  const { env } = setup({ 'SCOUT-6': { kind: 'scout', outcome: null }, 'OLD-2': {} })
  const home = env.CREW_FLEET_HOME!
  await startWatcher({ env, deps: deps(() => 1_000_000), auto: false }).tick()
  assert.equal(readStored(home, 'SCOUT-6').docked, null)
  assert.equal(readStored(home, 'OLD-2').docked, null)
})

test('an empty outcome leaves the scout scouting on both sides', () => {
  const { env } = setup({ 'SCOUT-7': { kind: 'scout', outcome: '' } })
  const ship = shipOf(env, 'SCOUT-7')
  assert.equal(ship.life.stage, 'sailing')
  assert.equal(shipPhase(ship), 'scouting')
})

test('applyAction refuses every action on a turned-back scout', () => {
  assert.throws(() => applyAction([], stored(), 'pause', DOCKED, true), /does not apply/)
  assert.throws(() => applyAction([], stored(), 'mark_failed', DOCKED, true), /does not apply/)
})

test('the server refuses an action on a turned-back scout', async () => {
  const { env } = setup({ 'SCOUT-8': { kind: 'scout', outcome: OUTCOME } })
  const server = await startServer({ port: 0, env })
  try {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/ship`, {
      method: 'POST',
      headers: { 'x-fleet-token': server.token },
      body: JSON.stringify({ ship: 'SCOUT-8', action: 'pause' }),
    })
    assert.equal(res.status, 409)
    assert.equal(readStored(env.CREW_FLEET_HOME!, 'SCOUT-8').paused, false)
  } finally {
    server.close()
  }
})
