import assert from 'node:assert/strict'
import { test } from 'node:test'

import { describe, jumpHtml, requestJump } from '../web/jump.js'

const ship = { ship: 'ENG-1', session: { id: 'x' } }

test('outside herdr message shows folder and PID', () => {
  assert.match(describe({ status: 'outside_herdr', message: 'm', cwd: '/f', pid: 9 }), /Folder: \/f\. PID 9/)
})

test('button is disabled while busy or without a session', () => {
  assert.match(jumpHtml(ship, { ship: 'ENG-1', busy: true }), /disabled/)
  assert.match(jumpHtml({ ship: 'ENG-1', session: null }, null), /disabled/)
  assert.doesNotMatch(jumpHtml(ship, null), /disabled/)
})

test('fallback result shows the command and a copy button, escaped', () => {
  const html = jumpHtml(ship, { ship: 'ENG-1', result: { status: 'fallback', message: 'down', command: "cd '/a' && <b>" } })
  assert.match(html, /data-copy=/)
  assert.doesNotMatch(html, /<b>/)
})

test('a result for another ship is not shown', () => {
  assert.doesNotMatch(jumpHtml(ship, { ship: 'OTHER', result: { status: 'focused', message: 'hi' } }), /hi/)
})

test('request sends the token and turns failures into an error result', async () => {
  let seen: any
  const ok = await requestJump('a/b', 'tok', (async (url: string, init: any) => ((seen = [url, init]), { status: 200, json: async () => ({ status: 'focused' }) })) as any)
  assert.equal(ok.status, 'focused')
  assert.deepEqual(seen, ['/api/ships/a%2Fb/jump', { method: 'POST', headers: { 'x-fleet-token': 'tok' } }])
  assert.equal((await requestJump('a', 't', (async () => ({ status: 403 })) as any)).status, 'error')
  assert.equal((await requestJump('a', 't', (async () => { throw new Error('x') }) as any)).status, 'error')
})
