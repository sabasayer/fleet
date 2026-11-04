import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { normalizeStored, readStored } from '../src/life.ts'
import { readState } from '../src/state.ts'
import { SEARCH_WAIT_MS, parseRemote, startWatcher, type CliResult, type Deps } from '../src/watch.ts'

const write = (path: string, data: unknown) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}

function setup({ remote = 'git@gitlab.com:a/b.git', branch = 'feat/x', crew = 'done', release = false }: { remote?: string; branch?: string; crew?: string; release?: boolean } = {}) {
  const tmp = mkdtempSync(join(tmpdir(), 'fleet-find-'))
  const env = { CREW_BOARD_ROOT: join(tmp, 'crew'), CREW_FLEET_HOME: join(tmp, 'home') }
  write(join(tmp, 'home', 'fleets.json'), { f: release ? { release_check: 'true' } : {} })
  write(join(tmp, 'crew', 'A-1', 'ship.json'), {
    version: 1, ship: 'A-1', title: 't', task: null, fleet: 'f', created: '2026-10-20T10:00:00Z', session: null,
    mrs: [{ n: 1, repo: '/r', remote, worktree: join(tmp, 'wt'), branch, url: null }],
  })
  write(join(tmp, 'crew', 'A-1-mr1', 'red.json'), { role: 'red', state: crew, updated: new Date().toISOString() })

  return { env, tmp }
}

const fakes = (stdout: string, clock = { t: 1_000_000 }) => {
  const calls: { file: string; args: string[] }[] = []
  const deps: Deps = {
    cli: async (file, args): Promise<CliResult> => (calls.push({ file, args }), { ok: true, stdout }),
    check: async () => ({ code: 1, timedOut: false }),
    now: () => clock.t,
  }

  return { deps, calls, clock }
}

const mr = (env: NodeJS.ProcessEnv) => readState(env).fleets[0].ships[0].mrs[0]
const life = (env: NodeJS.ProcessEnv) => readState(env).fleets[0].ships[0].life.mrs[0]

const GL = (items: unknown[]) => JSON.stringify(items)
const glab = (iid: number, state: string, extra: object = {}) => ({ iid, state, web_url: `https://gitlab.com/a/b/-/merge_requests/${iid}`, ...extra })
const ghpr = (number: number, state: string, extra: object = {}) => ({ number, state, url: `https://github.com/o/r/pull/${number}`, ...extra })

test('glab search uses the source branch and project path', async () => {
  const { env } = setup()
  const { deps, calls } = fakes('[]')
  await startWatcher({ env, deps, auto: false }).tick()
  assert.deepEqual(calls, [{ file: 'glab', args: ['mr', 'list', '-R', 'a/b', '--source-branch', 'feat/x', '--all', '--output', 'json'] }])
})

test('gh search uses the head branch and owner/repo', async () => {
  const { env } = setup({ remote: 'github.com/o/r' })
  const { deps, calls } = fakes('[]')
  await startWatcher({ env, deps, auto: false }).tick()
  assert.deepEqual(calls, [{ file: 'gh', args: ['pr', 'list', '-R', 'o/r', '--head', 'feat/x', '--state', 'all', '--json', 'number,state,url,mergeCommit'] }])
})

test('a remote without a host means gitlab.com', async () => {
  assert.deepEqual(parseRemote('acme/apps/web-base'), { host: 'gitlab.com', path: 'acme/apps/web-base' })
  assert.deepEqual(parseRemote('git@gitlab.com:a/b.git'), { host: 'gitlab.com', path: 'a/b' })
  assert.deepEqual(parseRemote('https://github.com/o/r.git'), { host: 'github.com', path: 'o/r' })
  const { env } = setup({ remote: 'acme/apps/web-base' })
  const { deps, calls } = fakes('[]')
  await startWatcher({ env, deps, auto: false }).tick()
  assert.equal(calls[0].file, 'glab')
  assert.equal(calls[0].args[3], 'acme/apps/web-base')
})

test('the default branch is skipped', async () => {
  for (const branch of ['main', 'master']) {
    const { env } = setup({ branch })
    const { deps, calls } = fakes('[]')
    await startWatcher({ env, deps, auto: false }).tick()
    assert.equal(calls.length, 0)
  }
})

test('the newest of several matches wins', async () => {
  const { env } = setup()
  const { deps } = fakes(GL([glab(4, 'closed'), glab(9, 'opened'), glab(7, 'merged', { merge_commit_sha: 'old' })]))
  await startWatcher({ env, deps, auto: false }).tick()
  assert.equal(mr(env).url, 'https://gitlab.com/a/b/-/merge_requests/9')
  assert.equal(life(env).state, 'in_review')
})

test('a merged match is merged with its SHA even when crew is not done', async () => {
  const { env } = setup({ crew: 'running' })
  const { deps } = fakes(GL([glab(5, 'merged', { merge_commit_sha: 'abc' })]))
  await startWatcher({ env, deps, auto: false }).tick()
  assert.deepEqual([life(env).state, life(env).sha, mr(env).url], ['merged', 'abc', 'https://gitlab.com/a/b/-/merge_requests/5'])
})

test('a merged gh match keeps the merge commit', async () => {
  const { env } = setup({ remote: 'github.com/o/r', crew: 'running' })
  const { deps } = fakes(JSON.stringify([ghpr(2, 'MERGED', { mergeCommit: { oid: 'def' } })]))
  await startWatcher({ env, deps, auto: false }).tick()
  assert.deepEqual([life(env).state, life(env).sha], ['merged', 'def'])
})

test('an open match is in_review only when the crew is done', async () => {
  const done = setup()
  await startWatcher({ env: done.env, deps: fakes(GL([glab(3, 'opened')])).deps, auto: false }).tick()
  assert.equal(life(done.env).state, 'in_review')
  const busy = setup({ crew: 'running' })
  await startWatcher({ env: busy.env, deps: fakes(GL([glab(3, 'opened')])).deps, auto: false }).tick()
  assert.equal(life(busy.env).state, 'sailing')
  assert.equal(mr(busy.env).url, 'https://gitlab.com/a/b/-/merge_requests/3')
})

test('a closed match becomes abandoned', async () => {
  const { env } = setup()
  await startWatcher({ env, deps: fakes(GL([glab(3, 'closed')])).deps, auto: false }).tick()
  assert.equal(life(env).state, 'abandoned')
})

test('an open found MR is watched for its merge even while crew is not done', async () => {
  const { env } = setup({ crew: 'running' })
  const first = fakes(GL([glab(3, 'opened')]))
  const w = startWatcher({ env, deps: first.deps, auto: false })
  await w.tick()
  const second = fakes('{"state":"merged","merge_commit_sha":"zzz"}', first.clock)
  await startWatcher({ env, deps: second.deps, auto: false }).tick()
  assert.equal(second.calls[0].args[0], 'mr')
  assert.equal(second.calls[0].args[1], 'view')
  assert.deepEqual([life(env).state, life(env).sha], ['merged', 'zzz'])
})

test('the release check gets the found link', async () => {
  const { env } = setup({ release: true })
  const seen: string[] = []
  const { deps } = fakes(GL([glab(5, 'merged', { merge_commit_sha: 'abc' })]))
  deps.check = async (_c, o) => (seen.push(o.env.FLEET_MR_URL), { code: 1, timedOut: false })
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  await w.tick()
  assert.deepEqual(seen, ['https://gitlab.com/a/b/-/merge_requests/5'])
})

test('empty searches wait 10 minutes, then try again', async () => {
  const { env } = setup()
  const { deps, calls, clock } = fakes('[]')
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  clock.t += SEARCH_WAIT_MS - 1
  await w.tick()
  assert.equal(calls.length, 1)
  clock.t += 1
  await w.tick()
  assert.equal(calls.length, 2)
})

test('a failing or missing CLI changes nothing and also waits', async () => {
  const { env } = setup()
  const calls: string[] = []
  const deps: Deps = { cli: async file => (calls.push(file), { ok: false, missing: true, message: 'x' }), check: async () => ({ code: 1, timedOut: false }), now: () => 5 }
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  await w.tick()
  assert.equal(calls.length, 1)
  assert.equal(mr(env).url, null)
  assert.equal(life(env).state, 'sailing')
})

test('once found, the search stops', async () => {
  const { env } = setup({ crew: 'running' })
  const { deps, calls, clock } = fakes(GL([glab(3, 'opened')]))
  const w = startWatcher({ env, deps, auto: false })
  await w.tick()
  clock.t += SEARCH_WAIT_MS
  await w.tick()
  assert.ok(calls.every(c => c.args[1] !== 'list' || calls.indexOf(c) === 0))
  assert.equal(calls.filter(c => c.args[1] === 'list').length, 1)
})

test('old stored files load with no found links', () => {
  assert.deepEqual(normalizeStored({ version: 1, mrs: {}, paused: false }).found, {})
  assert.deepEqual(normalizeStored({ found: { 1: 'u', 2: 5 } }).found, { 1: 'u' })
  const { env } = setup()
  assert.deepEqual(readStored(env.CREW_FLEET_HOME, 'A-1').found, {})
})
