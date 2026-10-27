import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { startServer, type Running } from '../src/server.ts'
import { startWatcher, type Deps } from '../src/watch.ts'

const tmp = mkdtempSync(join(tmpdir(), 'fleet-sha-'))
const env = { CREW_BOARD_ROOT: join(tmp, 'crew'), CREW_FLEET_HOME: join(tmp, 'home') }
let server: Running
let asked = 0

before(async () => {
  mkdirSync(join(tmp, 'crew', 'S-1'), { recursive: true })
  writeFileSync(
    join(tmp, 'crew', 'S-1', 'ship.json'),
    JSON.stringify({ version: 1, ship: 'S-1', title: 't', task: null, fleet: 'f', created: '2026-10-20T10:00:00Z', session: null, mrs: [{ n: 1, repo: '/r', remote: 'x', worktree: '/w', branch: 'b', url: 'https://gitlab.com/a/b/-/merge_requests/1' }] }),
  )
  mkdirSync(join(tmp, 'crew', 'S-1-mr1'))
  writeFileSync(join(tmp, 'crew', 'S-1-mr1', 'red.json'), JSON.stringify({ role: 'red', state: 'done', updated: new Date().toISOString() }))
  const deps: Deps = {
    cli: async () => (asked++, { ok: true, stdout: '{"state":"merged","merge_commit_sha":"fromhost"}' }),
    check: async () => ({ code: 1, timedOut: false }),
    now: () => Date.now(),
  }
  server = await startServer({ port: 0, env, watcher: startWatcher({ env, deps, auto: false }) })
})
after(() => server.close())

test('mark merged by hand then stores the SHA from the host', async () => {
  const res = await fetch(`http://127.0.0.1:${server.port}/api/ship`, {
    method: 'POST',
    headers: { 'x-fleet-token': server.token },
    body: JSON.stringify({ ship: 'S-1', action: 'mark_merged' }),
  })
  assert.equal(res.status, 200)
  let sha: string | null = null
  for (let i = 0; i < 50 && !sha; i++) {
    await new Promise(resolve => setTimeout(resolve, 20))
    sha = (await (await fetch(`http://127.0.0.1:${server.port}/api/state`)).json()).fleets[0].ships[0].life.mrs[0].sha
  }
  assert.equal(sha, 'fromhost')
  assert.equal(asked, 1)
})
