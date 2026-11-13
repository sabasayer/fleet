import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { JumpDeps } from '../src/jump.ts'
import { readShip, sendToShip } from '../src/relay.ts'

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e'
const goodSchema = {
  protocol: 16,
  schemas: { request: { oneOf: ['agent.list', 'agent.focus', 'agent.start', 'workspace.list', 'workspace.create', 'tab.list', 'tab.rename'].map(method => ({ properties: { method: { const: method } } })) } },
}

function build(agents: object[]) {
  const calls: { method: string; params: any }[] = []
  const deps: JumpDeps = {
    schema: async () => goodSchema,
    sockets: () => [{ path: '/default', isDefault: true }],
    connect: () => async (method, params) => {
      calls.push({ method, params })
      if (method === 'agent.list') return { agents }
      if (method === 'pane.read') return { read: { text: 'Approve the spec?' } }
      return { type: 'ok' }
    },
    liveSessions: async () => [],
    openGhostty: async () => undefined,
    isDir: () => true,
  }

  return { deps, calls }
}

const live = [{ agent: 'claude', agent_session: { value: ID }, terminal_id: 't1', pane_id: 'w1:p1', cwd: '/elsewhere' }]
const ship = { sessionId: ID, worktrees: ['/work'] }

test('send types the text into the ship pane and presses Enter', async () => {
  const t = build(live)
  assert.deepEqual(await sendToShip(ship, 'Captain (via admiral): yes', t.deps), { status: 'sent' })
  assert.deepEqual(t.calls.find(c => c.method === 'pane.send_input')!.params, { pane_id: 'w1:p1', text: 'Captain (via admiral): yes', keys: ['Enter'] })
})

test('send never starts a session when no pane runs the ship', async () => {
  const t = build([])
  assert.equal((await sendToShip(ship, 'yes', t.deps)).status, 'not_found')
  assert.ok(!t.calls.some(c => c.method === 'agent.start' || c.method === 'pane.send_input'))
})

test('send refuses empty, too long and control-character text before herdr is touched', async () => {
  for (const text of ['', '  ', 'a'.repeat(4001), 'a\u0007b', 42]) {
    const t = build(live)
    assert.equal((await sendToShip(ship, text, t.deps)).status, 'error', JSON.stringify(text))
    assert.equal(t.calls.length, 0)
  }
})

test('send keeps line breaks', async () => {
  const t = build(live)
  await sendToShip(ship, 'line one\nline two', t.deps)
  assert.equal(t.calls.find(c => c.method === 'pane.send_input')!.params.text, 'line one\nline two')
})

test('read returns the recent pane text, with a capped line count', async () => {
  const t = build(live)
  assert.deepEqual(await readShip(ship, 9999, t.deps), { status: 'read', text: 'Approve the spec?' })
  assert.deepEqual(t.calls.find(c => c.method === 'pane.read')!.params, { pane_id: 'w1:p1', source: 'recent', lines: 400 })
})

test('a ship with no session ID is not found', async () => {
  const t = build(live)
  assert.equal((await readShip({ sessionId: null, worktrees: [] }, 10, t.deps)).status, 'not_found')
})
