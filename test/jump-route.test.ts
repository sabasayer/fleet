import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import type { JumpDeps } from '../src/jump.ts'
import { startServer, type Running } from '../src/server.ts'

const ID = '11111111-2222-3333-4444-555555555555'
const tmp = mkdtempSync(join(tmpdir(), 'fleet-route-'))
let server: Running

const deps: JumpDeps = {
  schema: async () => {
    throw new Error('no herdr')
  },
  sockets: () => [],
  connect: () => async () => ({}),
  liveSessions: async () => [{ sessionId: ID, cwd: '/elsewhere', pid: 77 }],
  openGhostty: async () => {},
  isDir: () => true,
}

before(async () => {
  mkdirSync(join(tmp, 'crew', 'ENG-1'), { recursive: true })
  writeFileSync(
    join(tmp, 'crew', 'ENG-1', 'ship.json'),
    JSON.stringify({ version: 1, ship: 'ENG-1', title: 't', task: null, fleet: 'alpha', created: '2026-10-20T10:00:00Z', session: { id: ID, updated: 'x' }, mrs: [{ n: 1, repo: '/r', remote: 'x', worktree: '/w', branch: 'b', url: null }] }),
  )
  server = await startServer({ port: 0, env: { CREW_BOARD_ROOT: join(tmp, 'crew'), CREW_FLEET_HOME: join(tmp, 'home') }, jumpDeps: deps })
})
after(() => server.close())

const post = (path: string, token?: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const headers: Record<string, string> = token ? { 'x-fleet-token': token } : {}
    const req = request({ host: '127.0.0.1', port: server.port, method: 'POST', path, headers }, res => {
      let body = ''
      res.on('data', c => (body += c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
    })
    req.on('error', reject)
    req.end()
  })

test('jump needs the token', async () => {
  assert.equal((await post('/api/ships/ENG-1/jump')).status, 403)
  assert.equal((await post('/api/ships/ENG-1/jump', 'wrong')).status, 403)
})

test('jump reports a session that runs outside herdr', async () => {
  const { status, body } = await post('/api/ships/ENG-1/jump', server.token)
  assert.equal(status, 200)
  const result = JSON.parse(body)
  assert.deepEqual([result.status, result.cwd, result.pid], ['outside_herdr', '/elsewhere', 77])
})

test('jump for an unknown ship or a bad name is 404', async () => {
  assert.equal((await post('/api/ships/NOPE/jump', server.token)).status, 404)
  assert.equal((await post('/api/ships/%E0/jump', server.token)).status, 404)
  assert.equal((await post('/api/ships/..%2F..%2Fetc/jump', server.token)).status, 404)
})
