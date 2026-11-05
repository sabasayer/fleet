import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { startServer, type Running } from '../src/server.ts'

const tmp = mkdtempSync(join(tmpdir(), 'fleet-review-'))
const crew = join(tmp, 'crew')
const home = join(tmp, 'home')
let server: Running

const write = (path: string, data: unknown) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}
const ship = (name: string, url: string | null) => {
  write(join(crew, name, 'ship.json'), {
    version: 1, ship: name, title: name, task: null, fleet: 'f', created: '2026-10-20T10:00:00Z', session: null,
    mrs: [{ n: 1, repo: '/r', remote: 'x', worktree: '/w', branch: 'b', url }],
  })
  write(join(crew, `${name}-mr1`, 'red.json'), { role: 'red', state: 'running', updated: new Date().toISOString() })
}

before(async () => {
  ship('LINK-1', 'https://x/mr/1')
  ship('BARE-1', null)
  server = await startServer({ port: 0, env: { CREW_BOARD_ROOT: crew, CREW_FLEET_HOME: home } })
})
after(() => server.close())

const post = (name: string) =>
  fetch(`http://127.0.0.1:${server.port}/api/ship`, {
    method: 'POST',
    headers: { 'x-fleet-token': server.token },
    body: JSON.stringify({ ship: name, action: 'mark_in_review' }),
  })
const lifeOf = async (name: string) =>
  (await (await fetch(`http://127.0.0.1:${server.port}/api/state`)).json()).fleets.flatMap((f: any) => f.ships).find((s: any) => s.ship === name).life

test('a sailing ship with a link offers the action and moves to in_review', async () => {
  assert.deepEqual((await lifeOf('LINK-1')).actions, ['mark_in_review', 'pause', 'mark_failed'])
  const res = await post('LINK-1')
  assert.equal(res.status, 200)
  assert.equal((await res.json()).life.stage, 'in_review')
  assert.equal((await lifeOf('LINK-1')).stage, 'in_review')
})

test('a ship with no link refuses the action', async () => {
  assert.equal((await post('BARE-1')).status, 409)
  assert.equal((await lifeOf('BARE-1')).stage, 'sailing')
})
