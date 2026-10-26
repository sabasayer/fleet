import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { startServer, type Running } from '../src/server.ts'

const tmp = mkdtempSync(join(tmpdir(), 'fleet-life-'))
const crew = join(tmp, 'crew')
const home = join(tmp, 'home')
let server: Running

const write = (path: string, data: unknown) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}
const member = (role: string) => ({ role, state: 'done', updated: new Date().toISOString() })

before(async () => {
  write(join(crew, 'LIFE-1', 'ship.json'), {
    version: 1, ship: 'LIFE-1', title: 'life', task: null, fleet: 'f', created: '2026-10-20T10:00:00Z', session: null,
    mrs: [{ n: 1, repo: '/r', remote: 'x', worktree: '/w', branch: 'b', url: 'https://x/mr/1' }],
  })
  write(join(crew, 'LIFE-1-mr1', 'red.json'), member('red'))
  server = await startServer({ port: 0, env: { CREW_BOARD_ROOT: crew, CREW_FLEET_HOME: home } })
})
after(() => server.close())

const post = (body: unknown, token: string | null = server.token) =>
  fetch(`http://127.0.0.1:${server.port}/api/ship`, {
    method: 'POST',
    headers: token ? { 'x-fleet-token': token } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
const life = async () => (await (await fetch(`http://127.0.0.1:${server.port}/api/state`)).json()).fleets[0].ships[0].life

test('state shows in_review for a ship with finished crew and an MR link', async () => {
  const l = await life()
  assert.equal(l.state, 'in_review')
  assert.deepEqual(l.actions, ['mark_merged', 'pause', 'mark_failed'])
})

test('actions need the token', async () => {
  assert.equal((await post({ ship: 'LIFE-1', action: 'pause' }, null)).status, 403)
  assert.equal((await post({ ship: 'LIFE-1', action: 'pause' }, 'nope')).status, 403)
  assert.equal(existsSync(join(home, 'ships')), false)
})

test('bad input is refused before anything is written', async () => {
  assert.equal((await post('{')).status, 400)
  assert.equal((await post({ ship: '../evil', action: 'pause' })).status, 400)
  assert.equal((await post({ ship: 'LIFE-1', action: 'rm -rf' })).status, 400)
  assert.equal((await post({ ship: 'NOPE-9', action: 'pause' })).status, 404)
  assert.equal((await post({ ship: 'LIFE-1', action: 'mark_released' })).status, 409)
  assert.equal((await post('x'.repeat(5000))).status, 400)
  assert.equal(existsSync(join(home, 'ships')), false)
})

test('the captain walks a ship to the harbour and the file is written', async () => {
  for (const [action, state] of [['mark_merged', 'merged'], ['mark_released', 'released'], ['start_testing', 'testing'], ['done', 'done']]) {
    const res = await post({ ship: 'LIFE-1', action })
    assert.equal(res.status, 200)
    assert.equal((await res.json()).life.state, state)
    assert.equal((await life()).state, state)
  }
  const file = JSON.parse(readFileSync(join(home, 'ships', 'LIFE-1.json'), 'utf8'))
  assert.equal(file.mrs['1'].state, 'done')
  assert.ok(file.docked)
  assert.deepEqual(readdirSync(join(home, 'ships')), ['LIFE-1.json'])
  assert.equal((await life()).endedAt, Date.parse(file.docked))
})

test('undock puts the ship back at testing', async () => {
  assert.equal((await post({ ship: 'LIFE-1', action: 'undock' })).status, 200)
  assert.equal((await life()).state, 'testing')
})
