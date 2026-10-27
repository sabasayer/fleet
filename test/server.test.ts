import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { startServer, type Running } from '../src/server.ts'

const tmp = mkdtempSync(join(tmpdir(), 'fleet-'))
const crew = join(tmp, 'crew')
const home = join(tmp, 'fleet-home')
let server: Running

const write = (path: string, data: unknown) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}
const ship = (name: string, fleet: string, extra = {}) => ({
  version: 1, ship: name, title: `title ${name}`, task: null, fleet, created: '2026-10-20T10:00:00Z', session: null,
  mrs: [{ n: 1, repo: '/r', remote: 'gitlab.com/g/p', worktree: '/w', branch: 'b', url: null }], ...extra,
})
const status = (role: string, state: string, extra = {}) => ({ role, state, updated: new Date().toISOString(), ...extra })

before(async () => {
  write(join(crew, 'ENG-1', 'ship.json'), ship('ENG-1', 'alpha'))
  write(join(crew, 'ENG-1-mr1', 'red.json'), status('red', 'done', { order: 10 }))
  write(join(crew, 'ENG-1-mr1', 'gate-spec.json'), status('gate-spec', 'blocked', { order: 5, summary: 'approve the spec' }))
  write(join(crew, 'ENG-2', 'ship.json'), ship('ENG-2', 'beta'))
  write(join(crew, 'ENG-3', 'spec', 'notes.json'), {})
  write(join(crew, 'ENG-3-mr1', 'red.json'), status('red', 'running'))
  write(join(home, 'fleets.json'), { alpha: { name: 'Alpha Team', color: '#123456' } })
  server = await startServer({ port: 0, env: { CREW_BOARD_ROOT: crew, CREW_FLEET_HOME: home } })
})
after(() => server.close())

const call = (method: string, path: string, headers: Record<string, string> = {}) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: server.port, method, path, headers }, res => {
      let body = ''
      res.on('data', c => (body += c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
    })
    req.on('error', reject)
    req.end()
  })

test('state groups ships by fleet, skips folders without ship.json', async () => {
  const { status, body } = await call('GET', '/api/state')
  assert.equal(status, 200)
  const state = JSON.parse(body)
  assert.deepEqual(state.fleets.map((f: any) => [f.name, f.color, f.ships.map((s: any) => s.ship)]), [
    ['Alpha Team', '#123456', ['ENG-1']],
    ['beta', state.fleets[1].color, ['ENG-2']],
  ])
  assert.match(state.fleets[1].color, /^hsl\(/)
})

test('crew is in chain order and the blocked member gives the reason', async () => {
  const state = JSON.parse((await call('GET', '/api/state')).body)
  const s = state.fleets[0].ships[0]
  assert.deepEqual(s.mrs[0].crew.map((c: any) => c.role), ['gate-spec', 'red'])
  assert.deepEqual(s.needsCaptain, { role: 'gate-spec', reason: 'approve the spec', kind: 'blocked' })
  assert.equal(state.fleets[1].ships[0].needsCaptain, null)
})

test('page holds the token', async () => {
  const { status, body } = await call('GET', '/')
  assert.equal(status, 200)
  assert.ok(body.includes(server.token))
})

test('wrong Origin or Host gets 403', async () => {
  assert.equal((await call('GET', '/api/state', { origin: 'http://evil.example' })).status, 403)
  assert.equal((await call('GET', '/', { host: 'evil.example' })).status, 403)
  assert.equal((await call('GET', '/api/state', { host: `127.0.0.1:${server.port}`, origin: `http://127.0.0.1:${server.port}` })).status, 200)
})

test('POST without the token gets 403, with it gets 200', async () => {
  assert.equal((await call('POST', '/api/ping')).status, 403)
  assert.equal((await call('POST', '/api/ping', { 'x-fleet-token': 'nope' })).status, 403)
  assert.equal((await call('POST', '/api/ping', { 'x-fleet-token': server.token })).status, 200)
})

test('POST with the token but a wrong Origin gets 403', async () => {
  assert.equal((await call('POST', '/api/ping', { 'x-fleet-token': server.token, origin: 'http://evil.example' })).status, 403)
})
