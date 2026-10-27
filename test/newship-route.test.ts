import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import type { JumpDeps } from '../src/jump.ts'
import { startServer, type Running } from '../src/server.ts'

const tmp = mkdtempSync(join(tmpdir(), 'fleet-newroute-'))
const calls: string[] = []
let server: Running

const jumpDeps: JumpDeps = {
  schema: async () => {
    throw new Error('no herdr')
  },
  sockets: () => [],
  connect: () => async method => (calls.push(method), {}),
  liveSessions: async () => [],
  openGhostty: async () => void calls.push('ghostty'),
  isDir: path => path === '/repo',
}

before(async () => {
  server = await startServer({
    port: 0,
    env: { CREW_BOARD_ROOT: join(tmp, 'crew'), CREW_FLEET_HOME: join(tmp, 'home') },
    jumpDeps,
    newShipDeps: { uuid: () => 'abcd1234-2222-3333-4444-555555555555', repoRoot: async path => path },
  })
})
after(() => server.close())

const post = (body: string, token?: string) =>
  fetch(`http://127.0.0.1:${server.port}/api/ships/new`, { method: 'POST', headers: token ? { 'x-fleet-token': token } : {}, body })

test('new ship needs the token', async () => {
  assert.equal((await post('{}')).status, 403)
  assert.equal((await post('{}', 'wrong')).status, 403)
})

test('new ship refuses bad json and bad input', async () => {
  assert.equal((await post('{', server.token)).status, 400)
  const res = await post(JSON.stringify({ fleet: 'f', folder: '/repo', task: 'a\nb' }), server.token)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).status, 'error')
  assert.deepEqual(calls, [])
})

test('without herdr the route returns the command and writes no file', async () => {
  const res = await post(JSON.stringify({ fleet: 'f', folder: '/repo', task: 'Fix it' }), server.token)
  const result = await res.json()
  assert.equal(result.status, 'fallback')
  assert.match(result.command, /^cd '\/repo' && claude /)
  assert.deepEqual(calls, [])
})
