import assert from 'node:assert/strict'
import { test } from 'node:test'

import { startHint, newShipFormHtml, preselectedRepo, repoChoices, requestNewShip, startingHtml, WAIT_MS, imagesHtml, pastedImageFiles, MAX_IMAGE_BYTES } from '../web/newship.js'
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

test('the request sends the token and the form fields only', async () => {
  let seen: any
  const ok = await requestNewShip({ fleet: 'f', folder: '/r', task: 't', copied: true }, 'tok', (async (url: string, init: any) => ((seen = [url, init]), { status: 200, json: async () => ({ status: 'started' }) })) as any)
  assert.equal(ok.status, 'started')
  assert.equal(seen[0], '/api/ships/new')
  assert.equal(seen[1].headers['x-fleet-token'], 'tok')
  assert.deepEqual(JSON.parse(seen[1].body), { fleet: 'f', folder: '/r', task: 't', start: 'crew', skipPermissions: false, images: [] })
  assert.equal((await requestNewShip({}, 't', (async () => ({ status: 403 })) as any)).status, 'error')
  assert.equal((await requestNewShip({}, 't', (async () => { throw new Error('x') }) as any)).status, 'error')
})

test('the form has a Start as choice after the task field, with four options', () => {
  const html = newShipFormHtml({ fleets, form: { fleet: '', folder: '', task: '', start: 'crew' }, busy: false, result: null })
  assert.match(html, /<select name="start">/)
  for (const text of ['Crew', 'Crew, auto plan', 'Scout first', 'Admiral: one ship per repo']) assert.ok(html.includes(`>${text}</option>`), text)
  assert.ok(html.indexOf('name="task"') < html.indexOf('name="start"'))
  assert.ok(html.includes(startHint('crew')))
})

test('the chosen start is kept, with its hint, when the form is drawn again', () => {
  const html = newShipFormHtml({ fleets, form: { fleet: '', folder: '', task: '', start: 'auto' }, busy: false, result: null })
  assert.match(html, /value="auto" selected/)
  assert.ok(html.includes('captain test still waits'))
})

test('the request sends the chosen start', async () => {
  let seen: any
  await requestNewShip({ fleet: 'f', folder: '/r', task: 't', start: 'admiral' }, 'tok', (async (_url: string, init: any) => ((seen = init), { status: 200, json: async () => ({ status: 'started' }) })) as any)
  assert.equal(JSON.parse(seen.body).start, 'admiral')
})

test('the form has a skip permissions box, kept when drawn again, and the request sends it', async () => {
  const fleets = [{ id: 'f', name: 'F', ships: [], repos: [] }]
  const html = newShipFormHtml({ fleets, form: { fleet: 'F', folder: '/r', task: 't', start: 'crew', skipPermissions: true }, busy: false, result: null })
  assert.match(html, /<input type="checkbox" name="skipPermissions" checked>/)
  let body: any
  await requestNewShip({ fleet: 'f', folder: '/r', task: 't', skipPermissions: true }, 'tok', (async (_: string, init: any) => ((body = JSON.parse(init.body)), { status: 200, json: async () => ({}) })) as any)
  assert.equal(body.skipPermissions, true)
})

const item = (type: string, size = 10) => ({ kind: type.startsWith('image/') ? 'file' : 'string', type, getAsFile: () => ({ size, type }) })

test('a pasted screenshot becomes an image file', () => {
  const { files, message } = pastedImageFiles([item('image/png')], 0)
  assert.equal(files.length, 1)
  assert.equal(message, '')
})

test('a paste with plain text stays a text paste, even with an image beside it', () => {
  assert.deepEqual(pastedImageFiles([item('text/plain'), item('text/html'), item('image/png')], 0), { files: [], message: '' })
})

test('too many or too large images give a message and no files', () => {
  assert.match(pastedImageFiles([item('image/png'), item('image/png')], 3).message, /at most 4/)
  assert.match(pastedImageFiles([item('image/png', MAX_IMAGE_BYTES + 1)], 0).message, /larger than 5 MB/)
  assert.equal(pastedImageFiles([item('image/svg+xml')], 0).files.length, 0)
})

test('image previews escape the data URL and each has a remove button', () => {
  const html = imagesHtml(['data:image/png;base64,AA"><script>'])
  assert.ok(!html.includes('<script>'))
  assert.match(html, /data-remove-image="0"/)
})

test('the new ship request sends the pasted images', async () => {
  let sent: any
  await requestNewShip({ fleet: 'f', folder: '/r', task: 't', images: ['data:image/png;base64,AA'] }, 'tok', async (_url: string, init: any) => {
    sent = JSON.parse(init.body)
    return { status: 200, json: async () => ({ status: 'started' }) } as any
  })
  assert.deepEqual(sent.images, ['data:image/png;base64,AA'])
})
