import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { applyAction, readStored, writeStored } from '../src/life.ts'
import { readState } from '../src/state.ts'
import { hostArgs, realDeps, startWatcher, type CheckOptions, type CheckResult, type CliResult, type Deps } from '../src/watch.ts'

const write = (path: string, data: unknown) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}

function setup(fleets: unknown = { f: { release_check: 'true' } }, ships = ['A-1']) {
  const tmp = mkdtempSync(join(tmpdir(), 'fleet-watch-'))
  const env = { CREW_BOARD_ROOT: join(tmp, 'crew'), CREW_FLEET_HOME: join(tmp, 'home') }
  write(join(tmp, 'home', 'fleets.json'), fleets)
  for (const ship of ships) {
    write(join(tmp, 'crew', ship, 'ship.json'), {
      version: 1, ship, title: 't', task: null, fleet: 'f', created: '2026-10-20T10:00:00Z', session: null,
      mrs: [{ n: 1, repo: '/r', remote: 'git@gitlab.com:a/b.git', worktree: join(tmp, 'wt'), branch: 'feat/x', url: `https://gitlab.com/a/b/-/merge_requests/${ship}` }],
    })
    write(join(tmp, 'crew', `${ship}-mr1`, 'red.json'), { role: 'red', state: 'done', updated: new Date().toISOString() })
  }

  return { env, tmp }
}

const fakes = (over: Partial<Deps> = {}) => {
  const calls: { file: string; args: string[] }[] = []
  const checks: { command: string; options: CheckOptions }[] = []
  const deps: Deps = {
    cli: async (file, args): Promise<CliResult> => (calls.push({ file, args }), { ok: true, stdout: '{"state":"opened"}' }),
    check: async (command, options): Promise<CheckResult> => (checks.push({ command, options }), { code: 1, timedOut: false }),
    now: () => 1_000_000,
    ...over,
  }

  return { deps, calls, checks }
}

const stage = (env: NodeJS.ProcessEnv, ship = 'A-1') => readState(env).fleets[0].ships.find(s => s.ship === ship)!.life.mrs[0]

test('merged on glab stores the merge SHA', async () => {
  const { env } = setup()
  const { deps, calls } = fakes({ cli: async () => ({ ok: true, stdout: '{"state":"merged","merge_commit_sha":"abc123"}' }) })
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  assert.deepEqual([stage(env).state, stage(env).sha], ['merged', 'abc123'])
  assert.equal(calls.length, 0)
})

test('gh is used for github urls with state and mergeCommit', async () => {
  const { env, tmp } = setup()
  write(join(tmp, 'crew', 'A-1', 'ship.json'), {
    version: 1, ship: 'A-1', title: 't', task: null, fleet: 'f', created: 'x', session: null,
    mrs: [{ n: 1, repo: '/r', remote: 'o', worktree: '/w', branch: 'b', url: 'https://github.com/a/b/pull/3' }],
  })
  const { deps, calls } = fakes({ cli: async (file, args) => (calls.push({ file, args }), { ok: true, stdout: '{"state":"MERGED","mergeCommit":{"oid":"def456"}}' }) })
  await startWatcher({ env, deps, auto: false }).tick()
  assert.equal(calls[0].file, 'gh')
  assert.deepEqual(calls[0].args, ['pr', 'view', 'https://github.com/a/b/pull/3', '--json', 'state,mergeCommit'])
  assert.equal(stage(env).sha, 'def456')
})

test('closed without merge becomes abandoned', async () => {
  const { env } = setup()
  const { deps } = fakes({ cli: async () => ({ ok: true, stdout: '{"state":"closed"}' }) })
  await startWatcher({ env, deps, auto: false }).tick()
  assert.equal(stage(env).state, 'abandoned')
})

test('open MR stays in_review and shows the result', async () => {
  const { env } = setup()
  const { deps } = fakes()
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  assert.equal(stage(env).state, 'in_review')
  assert.match(w.seen('A-1')[0].text, /still open/)
})

test('no CLI leaves the state and reports it', async () => {
  const { env } = setup()
  const { deps } = fakes({ cli: async () => ({ ok: false, missing: true, message: 'glab not found' }) })
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  assert.equal(stage(env).state, 'in_review')
  assert.equal(w.seen('A-1')[0].text, 'glab not found')
})

test('release check exit 0 releases, with the FLEET variables', async () => {
  const { env, tmp } = setup()
  mkdirSync(join(tmp, 'wt'))
  const { deps, checks } = fakes({
    cli: async () => ({ ok: true, stdout: '{"state":"merged","merge_commit_sha":"abc"}' }),
    check: async (command, options) => (checks.push({ command, options }), { code: 0, timedOut: false }),
  })
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  await w.tick()
  assert.equal(stage(env).state, 'released')
  assert.equal(stage(env).sha, 'abc')
  assert.equal(checks[0].command, 'true')
  assert.equal(checks[0].options.cwd, join(tmp, 'wt'))
  assert.deepEqual(checks[0].options.env, {
    FLEET_SHA: 'abc', FLEET_REPO: '/r', FLEET_REMOTE: 'git@gitlab.com:a/b.git', FLEET_BRANCH: 'feat/x', FLEET_MR_URL: 'https://gitlab.com/a/b/-/merge_requests/A-1',
  })
})

test('release check non-zero keeps merged and reports not yet', async () => {
  const { env } = setup()
  const { deps } = fakes({ cli: async () => ({ ok: true, stdout: '{"state":"merged","merge_commit_sha":"abc"}' }) })
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  await w.tick()
  assert.equal(stage(env).state, 'merged')
  assert.equal(w.seen('A-1')[0].text, 'release check: not yet')
})

test('no release_check means no run', async () => {
  const { env } = setup({})
  const { deps, checks } = fakes({ cli: async () => ({ ok: true, stdout: '{"state":"merged","merge_commit_sha":"abc"}' }) })
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  await w.tick()
  assert.equal(checks.length, 0)
  assert.equal(stage(env).state, 'merged')
})

test('polling stops after the state moves', async () => {
  const { env } = setup()
  const { deps, calls } = fakes({ cli: async (file, args) => (calls.push({ file, args }), { ok: true, stdout: '{"state":"closed"}' }) })
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  await w.tick()
  assert.equal(calls.length, 1)
})

test('a captain mark made during a poll is not overwritten', async () => {
  const { env } = setup()
  const { deps } = fakes({
    cli: async () => {
      const { applyAction, readStored: read, writeStored } = await import('../src/life.ts')
      const ship = readState(env).fleets[0].ships[0]
      writeStored(env.CREW_FLEET_HOME!, 'A-1', applyAction(ship.mrs, read(env.CREW_FLEET_HOME!, 'A-1'), 'mark_merged', '2026-10-21T00:00:00Z'))

      return { ok: true, stdout: '{"state":"closed"}' }
    },
  })
  await startWatcher({ env, deps, auto: false }).tick()
  assert.equal(readStored(env.CREW_FLEET_HOME!, 'A-1').mrs['1'].state, 'merged')
})

test('a hung check does not block other ships and is not started twice', async () => {
  const { env } = setup({ f: { release_check: 'x' } }, ['A-1', 'B-2'])
  let started = 0
  const { deps } = fakes({
    cli: async () => ({ ok: true, stdout: '{"state":"merged","merge_commit_sha":"abc"}' }),
    check: async (_c, o) => {
      started++
      return o.env.FLEET_MR_URL.endsWith('A-1') ? new Promise(() => {}) : { code: 0, timedOut: false }
    },
  })
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  const hung = w.tick()
  const race = await Promise.race([hung.then(() => 'done'), new Promise(r => setTimeout(() => r('blocked'), 200))])
  assert.equal(race, 'blocked')
  assert.equal(stage(env, 'B-2').state, 'released')
  assert.equal(started, 2)
})

test('real runner kills a hung check at the limit, including its children', async () => {
  const begin = Date.now()
  const result = await realDeps.check('sleep 30 & wait', { env: {}, cwd: tmpdir(), timeoutMs: 300 })
  assert.equal(result.timedOut, true)
  assert.ok(Date.now() - begin < 5000)
})

test('real runner passes data only through env and returns the exit code', async () => {
  const ok = await realDeps.check('test "$FLEET_SHA" = "a; b"', { env: { FLEET_SHA: 'a; b' }, cwd: tmpdir(), timeoutMs: 5000 })
  const bad = await realDeps.check('exit 3', { env: {}, cwd: tmpdir(), timeoutMs: 5000 })
  assert.equal(ok.code, 0)
  assert.equal(bad.code, 3)
})

test('glab gets the MR number and the project URL, since it cannot take an MR URL', () => {
  assert.deepEqual(hostArgs('glab', 'https://gitlab.com/group/sub/repo/-/merge_requests/22'), ['mr', 'view', '22', '-R', 'https://gitlab.com/group/sub/repo', '--output', 'json'])
})

const handMark = (env: NodeJS.ProcessEnv, ship = 'A-1') => {
  const home = env.CREW_FLEET_HOME!
  const entry = readState(env).fleets[0].ships.find(s => s.ship === ship)!
  writeStored(home, ship, applyAction(entry.mrs, readStored(home, ship), 'mark_merged', '2026-10-21T10:00:00Z'))
}

test('backfill after a hand mark stores the SHA from the host', async () => {
  const { env } = setup()
  handMark(env)
  assert.equal(stage(env).sha, null)
  const { deps, calls } = fakes({ cli: async (file, args) => (calls.push({ file, args }), { ok: true, stdout: '{"state":"merged","merge_commit_sha":"abc123"}' }) })
  const w = startWatcher({ env, deps, auto: false })
  await w.backfill('A-1')
  assert.deepEqual([stage(env).state, stage(env).sha], ['merged', 'abc123'])
  assert.equal(calls.length, 1)
  assert.equal(calls[0].file, 'glab')
})

test('the SHA is asked for once per MR, even when the CLI fails', async () => {
  const { env } = setup()
  handMark(env)
  const { deps, calls } = fakes({ cli: async (file, args) => (calls.push({ file, args }), { ok: false, missing: false, message: 'glab failed' }) })
  const w = startWatcher({ env, deps, auto: false })
  await w.backfill('A-1')
  await w.backfill('A-1')
  await w.tick()
  assert.equal(calls.length, 1)
  assert.equal(stage(env).sha, null)
  assert.equal(stage(env).state, 'merged')
})

test('a tick fills a missing SHA before the release check runs', async () => {
  const { env, tmp } = setup()
  mkdirSync(join(tmp, 'wt'))
  handMark(env)
  const { deps, checks } = fakes({ cli: async () => ({ ok: true, stdout: '{"state":"merged","merge_commit_sha":"late1"}' }) })
  await startWatcher({ env, deps, auto: false }).tick()
  assert.equal(stage(env).sha, 'late1')
  assert.equal(checks[0].options.env.FLEET_SHA, 'late1')
})

test('a tick fills a missing SHA when the fleet has no release check', async () => {
  const { env } = setup({ f: {} })
  handMark(env)
  const { deps } = fakes({ cli: async () => ({ ok: true, stdout: '{"state":"merged","merge_commit_sha":"nochk"}' }) })
  await startWatcher({ env, deps, auto: false }).tick()
  assert.equal(stage(env).sha, 'nochk')
})

test('backfill skips an MR that already has a SHA', async () => {
  const { env } = setup()
  handMark(env)
  const home = env.CREW_FLEET_HOME!
  writeStored(home, 'A-1', { ...readStored(home, 'A-1'), mrs: { '1': { ...readStored(home, 'A-1').mrs['1'], sha: 'have' } } })
  const { deps, calls } = fakes()
  await startWatcher({ env, deps, auto: false }).backfill('A-1')
  assert.equal(calls.length, 0)
  assert.equal(stage(env).sha, 'have')
})
