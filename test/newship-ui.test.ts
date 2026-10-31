import assert from 'node:assert/strict'
import { test } from 'node:test'

import { newShipFormHtml, preselectedRepo, repoChoices, requestNewShip, startingHtml, WAIT_MS } from '../web/newship.js'
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

test('configured repos come first, then past repos, without duplicates or relative paths', () => {
  const configured = [{ ...fleets[0], repos: ['/main/extra', 'relative/path', '/main/portal', '/main/extra', 7] }]
  assert.deepEqual(repoChoices(configured, 'portal'), ['/main/extra', '/main/portal'])
})

test('a fleet with exactly one choice is preselected', () => {
  assert.equal(preselectedRepo(fleets, 'portal'), '/main/portal')
  assert.equal(preselectedRepo([{ id: 'n', name: 'n', repos: ['/a'], ships: [] }], 'n'), '/a')
})

test('no preselect with several choices, no choices or a typed new fleet', () => {
  assert.equal(preselectedRepo([{ ...fleets[0], repos: ['/main/extra'] }], 'portal'), '')
  assert.equal(preselectedRepo([{ id: 'n', name: 'n', ships: [] }], 'n'), '')
  assert.equal(preselectedRepo(fleets.slice(0, 1), 'brand new'), '')
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
  assert.match(html, /<textarea name="task" required maxlength="4000" rows="\d+">&#60;b&#62;&#39;<\/textarea>/)
})

test('the task keeps its line breaks in the form and in the copy button', () => {
  const html = newShipFormHtml({
    fleets,
    form: { fleet: 'f', folder: '', task: 'one\ntwo', copied: false },
    busy: false,
    result: { status: 'fallback', message: 'down', command: "claude 'one\ntwo'" },
  })
  assert.ok(html.includes('>one\ntwo</textarea>'))
  assert.ok(html.includes(`data-copy-new="claude &#39;one\ntwo&#39;"`))
})

test('the start button is disabled while busy', () => {
  assert.match(newShipFormHtml({ fleets, form: { fleet: '', folder: '', task: '' }, busy: true, result: null }), /type="submit" disabled/)
})

test('the starting note shows the ship', () => {
  const starting = [{ ship: 'fix-abcd', sessionId: ID, startedAt: 1000 }]
  assert.match(startingHtml(starting, 2000), /starting fix-abcd…/)
  assert.doesNotMatch(startingHtml(starting, 2000), /not seen yet/)
  assert.equal(startingHtml([], 2000), '')
})

test('after three minutes the note says not seen yet and to jump back', () => {
  const starting = [{ ship: 'fix-abcd', sessionId: ID, startedAt: 1000 }]
  assert.match(startingHtml(starting, 1000 + WAIT_MS), /not seen yet\. Jump back to check\./)
})

test('the panel shows the starting note even with no ships yet', () => {
  const starting = [{ ship: 'fix-abcd', sessionId: ID, startedAt: 1000 }]
  assert.match(panelHtml({ fleets: [], view: { level: 'armada' }, now: 2000, jump: null, starting }), /starting fix-abcd…/)
  assert.equal(panelHtml({ fleets: [], view: { level: 'armada' }, now: 2000, jump: null }), '')
})

test('the request sends the token and the four fields only', async () => {
  let seen: any
  const ok = await requestNewShip({ fleet: 'f', folder: '/r', task: 't', copied: true }, 'tok', (async (url: string, init: any) => ((seen = [url, init]), { status: 200, json: async () => ({ status: 'started' }) })) as any)
  assert.equal(ok.status, 'started')
  assert.equal(seen[0], '/api/ships/new')
  assert.equal(seen[1].headers['x-fleet-token'], 'tok')
  assert.deepEqual(JSON.parse(seen[1].body), { fleet: 'f', folder: '/r', task: 't', scout: false })
  assert.equal((await requestNewShip({}, 't', (async () => ({ status: 403 })) as any)).status, 'error')
  assert.equal((await requestNewShip({}, 't', (async () => { throw new Error('x') }) as any)).status, 'error')
})

test('the form has a Scout first checkbox after the task field', () => {
  const html = newShipFormHtml({ fleets, form: { fleet: '', folder: '', task: '', scout: false }, busy: false, result: null })
  assert.match(html, /type="checkbox"/)
  assert.match(html, /name="scout"/)
  assert.match(html, /Scout first/)
  assert.ok(html.indexOf('name="task"') < html.indexOf('name="scout"'))
})

test('a ticked box is kept when the form is drawn again', () => {
  const html = newShipFormHtml({ fleets, form: { fleet: '', folder: '', task: '', scout: true }, busy: false, result: null })
  assert.match(html, /name="scout"[^>]*checked|checked[^>]*name="scout"/)
})

test('the request sends scout true only when the box is ticked', async () => {
  const body = async (form: object) => {
    let seen: any
    await requestNewShip(form, 'tok', (async (_url: string, init: any) => ((seen = init), { status: 200, json: async () => ({ status: 'started' }) })) as any)

    return JSON.parse(seen.body)
  }
  assert.deepEqual(await body({ fleet: 'f', folder: '/r', task: 't', scout: true }), { fleet: 'f', folder: '/r', task: 't', scout: true })
  assert.equal((await body({ fleet: 'f', folder: '/r', task: 't', scout: false })).scout, false)
})
