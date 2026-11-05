import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

import { startServer, type Running } from '../src/server.ts'

const tmp = mkdtempSync(join(tmpdir(), 'fleet-console-'))
const crew = join(tmp, 'crew')
const home = join(tmp, 'fleet-home')
const NOW = Date.parse('2026-11-05T09:00:00Z')
let server: Running

const write = (path: string, data: unknown) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}
const ship = (name: string, url: string | null = null) => ({
  version: 1, ship: name, title: `title ${name}`, task: null, fleet: 'alpha', created: `2026-11-0${name.at(-1)}T08:00:00Z`, session: null,
  mrs: [{ n: 1, repo: '/r', remote: 'gitlab.com/g/p', worktree: '/w', branch: 'b', url }],
})
const status = (role: string, state: string, extra = {}) => ({ role, state, updated: new Date(NOW).toISOString(), ...extra })
const stored = (state: string) => ({ version: 1, mrs: { 1: { state, sha: null, changed: '2026-11-04T10:00:00Z' } } })

before(async () => {
  write(join(crew, 'gate-1', 'ship.json'), ship('gate-1', 'https://gitlab.com/g/p/-/merge_requests/7'))
  write(join(crew, 'gate-1-mr1', 'gate-spec.json'), status('gate-spec', 'blocked', { summary: 'approve the spec' }))
  write(join(crew, 'sail-2', 'ship.json'), ship('sail-2'))
  write(join(crew, 'sail-2-mr1', 'red.json'), status('red', 'running'))
  write(join(crew, 'review-3', 'ship.json'), ship('review-3', 'https://gitlab.com/g/p/-/merge_requests/9'))
  write(join(crew, 'review-3-mr1', 'red.json'), status('red', 'done'))
  for (const [name, state] of [['merged-4', 'merged'], ['done-5', 'done'], ['gone-6', 'abandoned']]) {
    write(join(crew, name, 'ship.json'), ship(name, 'https://gitlab.com/x'))
    write(join(home, 'ships', `${name}.json`), stored(state))
  }
  server = await startServer({ port: 0, env: { CREW_BOARD_ROOT: crew, CREW_FLEET_HOME: home }, clock: () => NOW })
})
after(() => server.close())

const get = (path: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    request({ host: '127.0.0.1', port: server.port, path }, res => {
      let body = ''
      res.on('data', c => (body += c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
    }).on('error', reject).end()
  })

test('console.json is one fleet panel with gates first and closed ships left out', async () => {
  const res = await get('/console.json')
  assert.equal(res.status, 200)
  const feed = JSON.parse(res.body)

  assert.equal(feed.version, 1)
  assert.equal(feed.id, 'fleet')
  assert.equal(feed.updatedAt, '2026-11-05T09:00:00.000Z')
  assert.deepEqual(feed.app, { url: 'http://127.0.0.1:4932/', open: 'http://127.0.0.1:4932/?ship={key}' })
  assert.deepEqual(feed.tile, { value: 1, label: 'gates wait on you', detail: '3 ships sailing', level: 'now' })
  assert.deepEqual(feed.groups.map((g: any) => g.title), ['Waiting on you', 'Sailing'])

  const [waiting, sailing] = feed.groups
  assert.deepEqual(waiting.items, [{
    key: 'gate-1', title: 'title gate-1', since: '2026-11-01T08:00:00Z', url: 'https://gitlab.com/g/p/-/merge_requests/7',
    detail: 'gate-spec: approve the spec', level: 'now', icon: 'gate', badge: { text: 'you', tone: 'red' },
  }])
  assert.deepEqual(sailing.items.map((i: any) => [i.key, i.level, i.icon, i.badge.text]), [['sail-2', 'soon', 'run', 'sailing'], ['review-3', 'fyi', 'run', 'in review']])
  assert.equal(sailing.items[0].url, undefined)
})

test('console.json tile is calm when no gate waits', async () => {
  const { consoleFeed } = await import('../src/console.ts')
  const feed = consoleFeed({ now: NOW, fleets: [] })

  assert.deepEqual(feed.tile, { value: 0, label: 'gates wait on you', detail: '0 ships sailing', level: 'calm' })
  assert.deepEqual(feed.groups, [])
})
