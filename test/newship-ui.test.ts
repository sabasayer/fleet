import assert from 'node:assert/strict'
import { test } from 'node:test'

import { newShipFormHtml, repoChoices, requestNewShip, startingHtml, stillStarting, WAIT_MS } from '../web/newship.js'
import { panelHtml } from '../web/panel.js'

const ID = '11111111-2222-3333-4444-555555555555'
const mr = (repo: string, worktree: string) => ({ n: 1, repo, worktree, crew: [] })
const fleets = [
  { id: 'portal', name: 'Patient portal', ships: [{ ship: 'A-1', session: { id: ID }, mrs: [mr('/main/portal', '/wt/a'), mr('/main/portal', '/wt/b')] }] },
  { id: 'viewer', name: 'Viewer', ships: [{ ship: 'V-1', session: null, mrs: [mr('/main/viewer', '/wt/v')] }] },
]

test('repo choices come from the typed fleet, once each, main checkout first', () => {
  assert.deepEqual(repoChoices(fleets, 'Patient portal'), ['/main/portal'])
  assert.deepEqual(repoChoices(fleets, 'portal'), ['/main/portal'])
})

test('a new fleet name offers every known repo', () => {
  assert.deepEqual(repoChoices(fleets, 'brand new'), ['/main/portal', '/main/viewer'])
})

test('a missing repo falls back to the worktree', () => {
  const only = [{ id: 'x', name: 'x', ships: [{ ship: 'S', mrs: [mr('', '/wt/only')] }] }]
  assert.deepEqual(repoChoices(only, 'x'), ['/wt/only'])
})

test('the form escapes values and shows the copy command for a fallback', () => {
  const html = newShipFormHtml({
    fleets,
    form: { fleet: '"><script>', folder: '', task: "<b>'", copied: false },
    busy: false,
    result: { status: 'fallback', message: 'down', command: "cd '/a' && <i>" },
  })
  assert.doesNotMatch(html, /<script>|<b>|<i>/)
  assert.match(html, /data-copy-new=/)
  assert.match(html, /maxlength="500"/)
})

test('the start button is disabled while busy', () => {
  assert.match(newShipFormHtml({ fleets, form: { fleet: '', folder: '', task: '' }, busy: true, result: null }), /type="submit" disabled/)
})

test('the starting note shows until a ship with that session ID appears', () => {
  const starting = [{ ship: 'fix-abcd', sessionId: '99999999-2222-3333-4444-555555555555', at: 1000 }]
  assert.match(startingHtml(starting, fleets, 2000), /starting fix-abcd…/)
  assert.doesNotMatch(startingHtml(starting, fleets, 2000), /not seen yet/)
  const seen = [{ ship: 'fix-abcd', sessionId: ID.toUpperCase(), at: 1000 }]
  assert.equal(startingHtml(seen, fleets, 2000), '')
  assert.deepEqual(stillStarting(seen, fleets), [])
})

test('after three minutes the note says not seen yet and to jump back', () => {
  const starting = [{ ship: 'fix-abcd', sessionId: '99999999-2222-3333-4444-555555555555', at: 1000 }]
  assert.match(startingHtml(starting, fleets, 1000 + WAIT_MS), /not seen yet\. Jump back to check\./)
})

test('the panel shows the starting note even with no ships yet', () => {
  const starting = [{ ship: 'fix-abcd', sessionId: ID, at: 1000 }]
  assert.match(panelHtml({ fleets: [], view: { level: 'armada' }, now: 2000, jump: null, starting }), /starting fix-abcd…/)
  assert.equal(panelHtml({ fleets: [], view: { level: 'armada' }, now: 2000, jump: null }), '')
})

test('the request sends the token and the three fields only', async () => {
  let seen: any
  const ok = await requestNewShip({ fleet: 'f', folder: '/r', task: 't', copied: true }, 'tok', (async (url: string, init: any) => ((seen = [url, init]), { status: 200, json: async () => ({ status: 'started' }) })) as any)
  assert.equal(ok.status, 'started')
  assert.equal(seen[0], '/api/ships/new')
  assert.equal(seen[1].headers['x-fleet-token'], 'tok')
  assert.deepEqual(JSON.parse(seen[1].body), { fleet: 'f', folder: '/r', task: 't' })
  assert.equal((await requestNewShip({}, 't', (async () => ({ status: 403 })) as any)).status, 'error')
  assert.equal((await requestNewShip({}, 't', (async () => { throw new Error('x') }) as any)).status, 'error')
})
