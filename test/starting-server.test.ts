import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import type { JumpDeps } from '../src/jump.ts'
import { startServer, type Running } from '../src/server.ts'

const SESSION = 'abcd1234-2222-3333-4444-555555555555'
const MINUTE = 60 * 1000
const tmp = mkdtempSync(join(tmpdir(), 'fleet-starting-'))
let server: Running
let time = 1_000_000

const schema = {
  protocol: 16,
  schemas: {
    request: {
      oneOf: ['agent.list', 'agent.focus', 'agent.start', 'workspace.list', 'workspace.create', 'tab.list', 'tab.rename'].map(method => ({
        properties: { method: { const: method } },
      })),
    },
  },
}

const jumpDeps: JumpDeps = {
  schema: async () => schema,
  sockets: () => [{ path: '/default', isDefault: true }],
  connect: () => async method => {
    if (method === 'agent.list') return { agents: [] }
    if (method === 'workspace.list') return { workspaces: [] }
    if (method === 'tab.list') return { tabs: [] }
    if (method === 'workspace.create') return { workspace: { workspace_id: 'w9' }, tab: { tab_id: 'w9:t1' } }
    if (method === 'agent.start') return { agent: { terminal_id: 'term_new', tab_id: 'w9:t1' } }
    return { type: 'ok' }
  },
  liveSessions: async () => [],
  openGhostty: async () => {},
  isDir: path => path === '/repo',
}

before(async () => {
  server = await startServer({
    port: 0,
    env: { CREW_BOARD_ROOT: join(tmp, 'crew'), CREW_FLEET_HOME: join(tmp, 'home') },
    jumpDeps,
    newShipDeps: { uuid: () => SESSION, repoRoot: async path => path },
    clock: () => time,
  })
})
after(() => server.close())

const state = async () => (await fetch(`http://127.0.0.1:${server.port}/api/state`)).json() as Promise<any>
const start = async () =>
  (await fetch(`http://127.0.0.1:${server.port}/api/ships/new`, {
    method: 'POST',
    headers: { 'x-fleet-token': server.token },
    body: JSON.stringify({ fleet: 'alpha', folder: '/repo', task: 'Fix it' }),
  })).json() as Promise<any>

test('a started ship shows in state.starting and survives later reads', async () => {
  assert.deepEqual((await state()).starting, [])
  const result = await start()
  assert.equal(result.status, 'started')
  const expected = [{ ship: result.ship, fleet: 'alpha', sessionId: SESSION, startedAt: time }]
  assert.deepEqual((await state()).starting, expected)
  assert.deepEqual((await state()).starting, expected)
})

test('the entry goes away once a ship with that session ID shows, whatever its name', async () => {
  mkdirSync(join(tmp, 'crew', 'ENG-711'), { recursive: true })
  writeFileSync(
    join(tmp, 'crew', 'ENG-711', 'ship.json'),
    JSON.stringify({ version: 1, ship: 'ENG-711', title: 't', task: null, fleet: 'alpha', created: '2026-10-20T10:00:00Z', session: { id: SESSION.toUpperCase(), updated: 'x' }, mrs: [{ n: 1, repo: '/r', remote: 'x', worktree: '/w', branch: 'b', url: null }] }),
  )
  assert.deepEqual((await state()).starting, [])
})

test('an entry expires after 30 minutes', async () => {
  mkdirSync(join(tmp, 'other'), { recursive: true })
  const lone = await startServer({
    port: 0,
    env: { CREW_BOARD_ROOT: join(tmp, 'other'), CREW_FLEET_HOME: join(tmp, 'home2') },
    jumpDeps,
    newShipDeps: { uuid: () => SESSION, repoRoot: async path => path },
    clock: () => time,
  })
  try {
    await fetch(`http://127.0.0.1:${lone.port}/api/ships/new`, {
      method: 'POST',
      headers: { 'x-fleet-token': lone.token },
      body: JSON.stringify({ fleet: 'alpha', folder: '/repo', task: 'Fix it' }),
    })
    const read = async () => ((await (await fetch(`http://127.0.0.1:${lone.port}/api/state`)).json()) as any).starting
    time += 30 * MINUTE - 1
    assert.equal((await read()).length, 1)
    time += 1
    assert.deepEqual(await read(), [])
  } finally {
    await lone.close()
  }
})
