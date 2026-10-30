import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import type { JumpDeps } from '../src/jump.ts'
import { crewPrompt, realNewShipDeps, shipName, startArgv, startCommand, startNewShip, type NewShipDeps } from '../src/newship.ts'

const UUID = 'abcd1234-2222-3333-4444-555555555555'
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
const fleets = [{ id: 'portal', name: 'Patient portal' }]

type Calls = { socket: string; method: string; params: any }[]
function build(over: { schema?: () => Promise<unknown>; down?: boolean; workspaces?: any[]; failStart?: boolean; dirs?: string[] } = {}) {
  const calls: Calls = []
  let ghostty = 0
  const jumpDeps: JumpDeps = {
    schema: over.schema ?? (async () => goodSchema),
    sockets: () => [{ path: '/default', isDefault: true }],
    connect: socket => async (method, params) => {
      calls.push({ socket, method, params })
      if (over.down) throw new Error('unreachable')
      if (method === 'agent.list') return { agents: [] }
      if (method === 'workspace.list') return { workspaces: over.workspaces ?? [] }
      if (method === 'tab.list') return { tabs: [] }
      if (method === 'workspace.create') return { workspace: { workspace_id: 'w9' }, tab: { tab_id: 'w9:t1' } }
      if (method === 'agent.start') {
        if (over.failStart) throw new Error('boom')
        return { agent: { terminal_id: 'term_new', tab_id: params.tab_id ?? 'w1:tNew' } }
      }
      return { type: 'ok' }
    },
    liveSessions: async () => [],
    openGhostty: async () => void ghostty++,
    isDir: path => (over.dirs ?? ['/repo']).includes(path),
  }
  const deps: NewShipDeps = { uuid: () => UUID, repoRoot: async path => path }

  return { jumpDeps, deps, calls, ghostty: () => ghostty }
}
const form = (over: object = {}) => ({ fleet: 'portal', folder: '/repo', task: 'Fix the login bug', ...over })
const only = (calls: Calls, method: string) => calls.filter(c => c.method === method)

test('starts the ship in the fleet workspace with the argv array, focuses and raises Ghostty', async () => {
  const t = build({ workspaces: [{ label: 'Patient portal', workspace_id: 'w1' }] })
  const result: any = await startNewShip(form(), fleets, t.jumpDeps, t.deps)
  assert.equal(result.status, 'started')
  assert.equal(result.sessionId, UUID)
  assert.equal(result.ship, 'fix-the-login-bug-abcd')
  const start = only(t.calls, 'agent.start')[0].params
  assert.deepEqual(start.argv, ['claude', '--session-id', UUID, '-n', 'fix-the-login-bug-abcd', '/crew Fix the login bug fleet: portal'])
  assert.deepEqual([start.cwd, start.workspace_id, start.focus], ['/repo', 'w1', true])
  assert.deepEqual(only(t.calls, 'agent.focus')[0].params, { target: 'term_new' })
  assert.equal(only(t.calls, 'workspace.create').length, 0)
  assert.equal(t.ghostty(), 1)
})

test('creates the workspace when the fleet has none, labelled with the fleet name', async () => {
  const t = build()
  await startNewShip(form(), fleets, t.jumpDeps, t.deps)
  assert.deepEqual(only(t.calls, 'workspace.create')[0].params, { label: 'Patient portal', cwd: '/repo', focus: false })
  assert.equal(only(t.calls, 'agent.start')[0].params.tab_id, 'w9:t1')
})

test('a new fleet name is used as the id and as the workspace label', async () => {
  const t = build()
  const result: any = await startNewShip(form({ fleet: 'brand new' }), fleets, t.jumpDeps, t.deps)
  assert.equal(result.fleet, 'brand new')
  assert.equal(only(t.calls, 'workspace.create')[0].params.label, 'brand new')
  assert.match(only(t.calls, 'agent.start')[0].params.argv[5], /fleet: brand new$/)
})

test('the display name of a known fleet maps to its id for crew', async () => {
  const t = build()
  const result: any = await startNewShip(form({ fleet: 'Patient portal' }), fleets, t.jumpDeps, t.deps)
  assert.equal(result.fleet, 'portal')
  assert.match(only(t.calls, 'agent.start')[0].params.argv[5], /fleet: portal$/)
})

test('nasty input stays one argv item and one quoted word in the copy command', async () => {
  const nasty = `it's "x" $(touch /tmp/pwn) \`id\`; rm -rf ~ && echo 'a'\\'b' | cat > /tmp/x`
  const t = build({ down: true })
  const result: any = await startNewShip(form({ task: nasty }), fleets, t.jumpDeps, t.deps)
  assert.equal(result.status, 'fallback')
  const argv = startArgv(UUID, result.ship, crewPrompt(nasty, 'portal'))
  assert.equal(argv[5], `/crew ${nasty} fleet: portal`)
  assert.equal(result.command, startCommand('/repo', argv))
  const out = execFileSync('/bin/sh', ['-c', `cd /tmp && ${result.command.replace(/^cd '\/repo' && claude/, 'printf "%s\\n" ARG')}`], { encoding: 'utf8' }).split('\n')
  assert.deepEqual(out.slice(1, 6), ['--session-id', UUID, '-n', result.ship, `/crew ${nasty} fleet: portal`])
})

test('a folder with a quote is quoted in the copy command', () => {
  const command = startCommand("/a b/it's", ['claude', 'x'])
  assert.equal(command, `cd '/a b/it'\\''s' && claude 'x'`)
  assert.equal(execFileSync('/bin/sh', ['-c', `printf %s ${command.split('cd ')[1].split(' && ')[0]}`], { encoding: 'utf8' }), "/a b/it's")
})

test('no herdr returns the command to copy', async () => {
  const t = build({ schema: async () => { throw new Error('no herdr') } })
  const result: any = await startNewShip(form(), fleets, t.jumpDeps, t.deps)
  assert.equal(result.status, 'fallback')
  assert.equal(result.command, `cd '/repo' && claude '--session-id' '${UUID}' '-n' 'fix-the-login-bug-abcd' '/crew Fix the login bug fleet: portal'`)
  assert.equal(t.calls.length, 0)
  assert.equal(t.ghostty(), 0)
})

test('a socket that does not answer falls back and starts nothing', async () => {
  const t = build({ down: true })
  assert.equal(((await startNewShip(form(), fleets, t.jumpDeps, t.deps)) as any).status, 'fallback')
  assert.equal(only(t.calls, 'agent.start').length, 0)
})

test('an unsupported herdr version stops with the version message and a command', async () => {
  const t = build({ schema: async () => ({ ...goodSchema, protocol: 3 }) })
  const result: any = await startNewShip(form(), fleets, t.jumpDeps, t.deps)
  assert.equal(result.status, 'unsupported')
  assert.match(result.message, /protocol 3 is not supported/)
  assert.match(result.command, /^cd '\/repo' && claude/)
  assert.equal(t.calls.length, 0)
})

test('a failed agent.start is an error and Ghostty stays closed', async () => {
  const t = build({ failStart: true })
  const result: any = await startNewShip(form(), fleets, t.jumpDeps, t.deps)
  assert.equal(result.status, 'error')
  assert.match(result.message, /boom/)
  assert.equal(t.ghostty(), 0)
})

test('validation refuses bad input before herdr is touched', async () => {
  const t = build()
  const bad: [object, RegExp][] = [
    [{ fleet: '' }, /Fleet is empty/],
    [{ fleet: '   ' }, /Fleet is empty/],
    [{ fleet: undefined }, /Fleet is missing/],
    [{ fleet: 5 }, /Fleet is missing/],
    [{ fleet: 'a'.repeat(61) }, /Fleet is longer/],
    [{ fleet: 'a\nb' }, /control character/],
    [{ task: '' }, /Task is empty/],
    [{ task: 'x'.repeat(501) }, /Task is longer/],
    [{ task: 'line one\nline two' }, /control character/],
    [{ task: 'trailing\n' }, /control character/],
    [{ task: 'a\rb' }, /control character/],
    [{ task: 'a\u0000b' }, /control character/],
    [{ task: 'a\u001b[31mb' }, /control character/],
    [{ folder: 'relative/path' }, /absolute/],
    [{ folder: '~/repo' }, /absolute/],
    [{ folder: '/repo\n/other' }, /control character/],
    [{ folder: '/missing' }, /does not exist/],
  ]
  for (const [over, expected] of bad) {
    const result: any = await startNewShip(form(over), fleets, t.jumpDeps, t.deps)
    assert.equal(result.status, 'error', JSON.stringify(over))
    assert.match(result.message, expected, JSON.stringify(over))
  }
  assert.equal(((await startNewShip(null, fleets, t.jumpDeps, t.deps)) as any).status, 'error')
  assert.equal(t.calls.length, 0)
})

test('a folder that is not a git repo is refused', async () => {
  const t = build()
  const result: any = await startNewShip(form(), fleets, t.jumpDeps, { ...t.deps, repoRoot: async () => null })
  assert.deepEqual([result.status, result.message], ['error', 'Repo folder is not a git repo.'])
  assert.equal(t.calls.length, 0)
})

test('a worktree path is replaced by the main checkout', async () => {
  const t = build({ dirs: ['/repo-wt'], workspaces: [{ label: 'Patient portal', workspace_id: 'w1' }] })
  const result: any = await startNewShip(form({ folder: '/repo-wt' }), fleets, t.jumpDeps, { ...t.deps, repoRoot: async () => '/repo' })
  assert.equal(result.folder, '/repo')
  assert.match(result.message, /main checkout \/repo/)
  assert.equal(only(t.calls, 'agent.start')[0].params.cwd, '/repo')
})

test('the real git check finds the main checkout from a worktree and refuses a plain folder', async () => {
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'fleet-git-')))
  const main = join(tmp, 'main')
  mkdirSync(main)
  const git = (...args: string[]) => execFileSync('git', ['-C', main, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { stdio: 'ignore' })
  git('init', '-q')
  git('commit', '-q', '--allow-empty', '-m', 'x')
  git('worktree', 'add', '-q', join(tmp, 'wt'), '-b', 'b')
  mkdirSync(join(tmp, 'plain'))
  assert.equal(await realNewShipDeps.repoRoot(main), main)
  assert.equal(await realNewShipDeps.repoRoot(join(tmp, 'wt')), main)
  assert.equal(await realNewShipDeps.repoRoot(join(tmp, 'plain')), null)
})

test('ship names: task slug with a short ID, a link uses its last part, nothing usable gives new-<id>', () => {
  assert.equal(shipName('Fix: the Login bug!', UUID), 'fix-the-login-bug-abcd')
  assert.equal(shipName('https://linear.app/x/issue/ENG-1710?a=b', UUID), 'eng-1710-abcd')
  assert.equal(shipName('日本語', UUID), 'new-abcd1234')
  assert.equal(shipName('a'.repeat(200), UUID), `${'a'.repeat(40)}-abcd`)
  assert.equal(shipName('  ', UUID), 'new-abcd1234')
})

test('a scout gets the /scout prompt and a scout- tab name', async () => {
  const t = build({ workspaces: [{ label: 'Patient portal', workspace_id: 'w1' }] })
  const result: any = await startNewShip(form({ scout: true }), fleets, t.jumpDeps, t.deps)
  assert.equal(result.status, 'started')
  const start = only(t.calls, 'agent.start')[0].params
  assert.equal(start.name, 'scout-fix-the-login-bug-abcd')
  assert.deepEqual(start.argv, ['claude', '--session-id', UUID, '-n', 'scout-fix-the-login-bug-abcd', '/scout Fix the login bug fleet: portal'])
})

test('only scout true counts, anything else keeps todays prompt and name', async () => {
  for (const value of [undefined, false, null, 0, 1, 'true', 'on']) {
    const t = build({ workspaces: [{ label: 'Patient portal', workspace_id: 'w1' }] })
    await startNewShip(form({ scout: value }), fleets, t.jumpDeps, t.deps)
    const start = only(t.calls, 'agent.start')[0].params
    assert.equal(start.name, 'fix-the-login-bug-abcd', String(value))
    assert.deepEqual(start.argv, ['claude', '--session-id', UUID, '-n', 'fix-the-login-bug-abcd', '/crew Fix the login bug fleet: portal'], String(value))
  }
})

test('a scout still needs a fleet, a task and a real repo folder', async () => {
  const t = build()
  for (const over of [{ fleet: '' }, { task: '' }, { folder: '/missing' }, { folder: 'relative/path' }]) {
    const result: any = await startNewShip(form({ scout: true, ...over }), fleets, t.jumpDeps, t.deps)
    assert.equal(result.status, 'error', JSON.stringify(over))
  }
  assert.equal(t.calls.length, 0)
})

test('the scout prefix is inside the name cap, not on top of it', () => {
  const plain = shipName('a'.repeat(200), UUID)
  const scout = shipName('a'.repeat(200), UUID, 'scout-')
  assert.equal(scout.length, plain.length)
  assert.equal(scout, `scout-${'a'.repeat(34)}-abcd`)
  assert.equal(shipName('日本語', UUID, 'scout-'), 'scout-new-abcd1234')
})
