import assert from 'node:assert/strict'
import { test } from 'node:test'

import { jump, resumeCommand, type JumpDeps, type JumpShip, type LiveSession } from '../src/jump.ts'

const ID = '11111111-2222-3333-4444-555555555555'
const OTHER = '99999999-2222-3333-4444-555555555555'
const ship: JumpShip = { name: 'ENG-1', fleetName: 'Alpha', sessionId: ID, worktrees: ['/old', '/work'] }
const goodSchema = {
  protocol: 16,
  schemas: {
    request: {
      oneOf: ['agent.list', 'agent.focus', 'agent.start', 'workspace.list', 'workspace.create', 'tab.list', 'tab.rename'].map(method => ({
        properties: { method: { const: method } },
      })),
    },
  },
}

type Calls = { socket: string; method: string; params: any }[]
type Setup = {
  schema?: () => Promise<unknown>
  panes?: Record<string, { session: string; terminal: string }[] | 'down'>
  live?: LiveSession[] | null
  workspaces?: { label: string; workspace_id: string }[]
  tabs?: { label: string; tab_id: string }[]
  dirs?: string[]
  failStart?: boolean
}

function build(setup: Setup = {}) {
  const calls: Calls = []
  let ghostty = 0
  const panes = setup.panes ?? { '/default': [] }
  const deps: JumpDeps = {
    schema: setup.schema ?? (async () => goodSchema),
    sockets: () => Object.keys(panes).map(path => ({ path, isDefault: path === '/default' })),
    connect: socket => async (method, params) => {
      calls.push({ socket, method, params })
      if (panes[socket] === 'down') throw new Error('unreachable')
      if (method === 'agent.list') {
        return { agents: (panes[socket] as any[]).map(p => ({ agent_session: { value: p.session }, terminal_id: p.terminal })) }
      }
      if (method === 'workspace.list') return { workspaces: setup.workspaces ?? [] }
      if (method === 'tab.list') return { tabs: setup.tabs ?? [] }
      if (method === 'workspace.create') return { workspace: { workspace_id: 'w9' }, tab: { tab_id: 'w9:t1' } }
      if (method === 'agent.start') {
        if (setup.failStart) throw new Error('boom')
        return { agent: { terminal_id: 'term_new', tab_id: params.tab_id ?? 'w1:tNew' } }
      }
      return { type: 'ok' }
    },
    liveSessions: async () => (setup.live === undefined ? [] : setup.live),
    openGhostty: async () => void ghostty++,
    isDir: path => (setup.dirs ?? ['/work']).includes(path),
  }

  return { deps, calls, ghostty: () => ghostty, methods: () => calls.map(c => c.method) }
}

const started = (calls: Calls) => calls.filter(c => c.method === 'agent.start')

test('focuses the pane found by session ID and raises Ghostty', async () => {
  const t = build({ panes: { '/default': [{ session: OTHER, terminal: 't0' }, { session: ID, terminal: 't1' }] } })
  const result = await jump(ship, t.deps)
  assert.equal(result.status, 'focused')
  assert.deepEqual(t.calls.at(-1), { socket: '/default', method: 'agent.focus', params: { target: 't1' } })
  assert.equal(t.ghostty(), 1)
  assert.equal(started(t.calls).length, 0)
})

test('finds the pane in a named session socket and skips a dead socket', async () => {
  const t = build({ panes: { '/default': 'down', '/sessions/x': [{ session: ID, terminal: 't7' }] } })
  assert.equal((await jump(ship, t.deps)).status, 'focused')
  assert.deepEqual(t.calls.at(-1), { socket: '/sessions/x', method: 'agent.focus', params: { target: 't7' } })
})

test('matches the session ID without regard to case', async () => {
  const t = build({ panes: { '/default': [{ session: ID.toUpperCase(), terminal: 't1' }] } })
  assert.equal((await jump(ship, t.deps)).status, 'focused')
})

test('alive outside herdr: reports folder and PID, never resumes', async () => {
  const t = build({ live: [{ sessionId: ID, cwd: '/somewhere', pid: 4242, kind: 'interactive' }] })
  const result = await jump(ship, t.deps)
  assert.deepEqual(result, { status: 'outside_herdr', message: result.message, cwd: '/somewhere', pid: 4242 })
  assert.equal(started(t.calls).length, 0)
  assert.equal(t.ghostty(), 0)
})

test('never resumes when claude agents lists the session and herdr is down', async () => {
  const t = build({ panes: { '/default': 'down' }, live: [{ sessionId: ID, cwd: '/somewhere', pid: 1 }] })
  assert.equal((await jump(ship, t.deps)).status, 'outside_herdr')
  assert.equal(started(t.calls).length, 0)
})

test('never resumes when claude agents lists the session and herdr is not installed', async () => {
  const t = build({ schema: async () => { throw new Error('ENOENT') }, live: [{ sessionId: ID, cwd: '/somewhere', pid: 1 }] })
  const result = await jump(ship, t.deps)
  assert.equal(result.status, 'outside_herdr')
  assert.equal(started(t.calls).length, 0)
})

test('never resumes, and gives no command, when herdr is unsupported but the session is alive', async () => {
  const t = build({ schema: async () => ({ protocol: 3, schemas: {} }), live: [{ sessionId: ID, cwd: '/somewhere' }] })
  const result = await jump(ship, t.deps)
  assert.equal(result.status, 'unsupported')
  assert.equal((result as any).command, null)
  assert.equal(t.calls.length, 0)
})

test('does not resume when the live list cannot be read', async () => {
  const t = build({ live: null })
  const result = await jump(ship, t.deps)
  assert.equal(result.status, 'fallback')
  assert.equal((result as any).reason, 'cannot_verify')
  assert.equal(started(t.calls).length, 0)
})

test('gone: creates the fleet workspace, starts claude --resume with argv, focuses, raises Ghostty', async () => {
  const t = build()
  const result = await jump(ship, t.deps)
  assert.equal(result.status, 'resumed')
  assert.deepEqual(t.methods(), ['agent.list', 'workspace.list', 'workspace.create', 'agent.start', 'tab.rename', 'agent.focus'])
  assert.deepEqual(t.calls.find(c => c.method === 'workspace.create')!.params, { label: 'Alpha', cwd: '/work', focus: false })
  assert.deepEqual(started(t.calls)[0].params, {
    name: 'ENG-1',
    argv: ['claude', '--resume', ID],
    cwd: '/work',
    workspace_id: 'w9',
    tab_id: 'w9:t1',
    focus: true,
  })
  assert.deepEqual(t.calls.find(c => c.method === 'tab.rename')!.params, { tab_id: 'w9:t1', label: 'ENG-1' })
  assert.equal(t.ghostty(), 1)
})

test('gone: reuses the fleet workspace and adds a tab named after the ship', async () => {
  const t = build({ workspaces: [{ label: 'Alpha', workspace_id: 'w2' }] })
  assert.equal((await jump(ship, t.deps)).status, 'resumed')
  assert.equal(t.methods().includes('workspace.create'), false)
  assert.equal(started(t.calls)[0].params.workspace_id, 'w2')
  assert.equal('tab_id' in started(t.calls)[0].params, false)
  assert.deepEqual(t.calls.find(c => c.method === 'tab.rename')!.params, { tab_id: 'w1:tNew', label: 'ENG-1' })
})

test('gone: reuses the ship tab when it exists, without renaming', async () => {
  const t = build({ workspaces: [{ label: 'Alpha', workspace_id: 'w2' }], tabs: [{ label: 'ENG-1', tab_id: 'w2:t5' }] })
  assert.equal((await jump(ship, t.deps)).status, 'resumed')
  assert.equal(started(t.calls)[0].params.tab_id, 'w2:t5')
  assert.equal(t.methods().includes('tab.rename'), false)
})

test('gone, herdr stopped: copy command, no start', async () => {
  const t = build({ panes: { '/default': 'down' } })
  const result = await jump(ship, t.deps)
  assert.deepEqual(result, { status: 'fallback', reason: 'herdr_down', message: (result as any).message, command: `cd '/work' && claude --resume ${ID}` })
  assert.equal(t.ghostty(), 0)
})

test('gone, herdr not installed: copy command', async () => {
  const t = build({ schema: async () => { throw new Error('ENOENT') } })
  assert.equal(((await jump(ship, t.deps)) as any).reason, 'herdr_down')
})

test('a dead named socket does not block resuming a gone session', async () => {
  const t = build({ panes: { '/default': [], '/sessions/old': 'down' } })
  assert.equal((await jump(ship, t.deps)).status, 'resumed')
})

test('unsupported herdr version: clear message with the command when the session is gone', async () => {
  const t = build({ schema: async () => ({ protocol: 3, schemas: {} }) })
  const result = await jump(ship, t.deps)
  assert.equal(result.status, 'unsupported')
  assert.match((result as any).message, /protocol 3/)
  assert.equal((result as any).command, `cd '/work' && claude --resume ${ID}`)
  assert.equal(t.calls.length, 0)
})

test('a failed start is an error, not a success', async () => {
  const t = build({ failStart: true })
  const result = await jump(ship, t.deps)
  assert.equal(result.status, 'error')
  assert.equal(t.ghostty(), 0)
})

test('rejects a session ID that is not a UUID', async () => {
  for (const sessionId of [null, '', 'abc', `${ID} --dangerous`, `$(touch x)`]) {
    const t = build()
    assert.equal((await jump({ ...ship, sessionId }, t.deps)).status, 'error')
    assert.equal(t.calls.length, 0)
  }
})

test('uses only an existing absolute folder and the newest MR first', async () => {
  const t = build({ dirs: ['/old'] })
  await jump({ ...ship, worktrees: ['/old', '/gone'] }, t.deps)
  assert.equal(started(t.calls)[0].params.cwd, '/old')

  const none = build({ dirs: [] })
  assert.equal((await jump({ ...ship, worktrees: ['relative/dir', '/gone'] }, none.deps)).status, 'error')
  assert.equal(started(none.calls).length, 0)
})

test('resume command quotes the folder', () => {
  assert.equal(resumeCommand("/a b/it's", ID), `cd '/a b/it'\\''s' && claude --resume ${ID}`)
})
