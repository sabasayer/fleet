import assert from 'node:assert/strict'
import { test } from 'node:test'

import { isTyping, keyAction, keysHtml, pressAction } from '../web/keys.js'
import { buttonsHtml } from '../web/life.js'
import { jumpHtml } from '../web/jump.js'

const ship = (actions: string[], session: string | null = 's1') => ({ ship: 'A-1', session, life: { actions } })
const press = (key: string, s: object | null, typing = false) => keyAction({ key, ship: s, typing })

test('s maps to the one step button that shows', () => {
  assert.equal(press('s', ship(['mark_merged', 'pause', 'mark_failed'])), 'mark_merged')
  assert.equal(press('s', ship(['mark_released', 'pause', 'mark_failed'])), 'mark_released')
  assert.equal(press('s', ship(['start_testing', 'pause', 'mark_failed'])), 'start_testing')
  assert.equal(press('s', ship(['done', 'bug_found', 'pause', 'mark_failed'])), 'done')
})

test('p pauses or resumes, whichever button shows', () => {
  assert.equal(press('p', ship(['pause', 'mark_failed'])), 'pause')
  assert.equal(press('p', ship(['resume', 'mark_failed'])), 'resume')
})

test('a key does nothing when its button does not show', () => {
  assert.equal(press('f', ship(['resume'])), null)
  assert.equal(press('b', ship(['mark_merged', 'pause', 'mark_failed'])), null)
  assert.equal(press('u', ship(['pause', 'mark_failed'])), null)
  assert.equal(press('s', ship(['pause', 'mark_failed'])), null)
  assert.equal(press('u', ship(['undock'])), 'undock')
  assert.equal(press('b', ship(['done', 'bug_found'])), 'bug_found')
  assert.equal(press('f', ship(['pause', 'mark_failed'])), 'mark_failed')
})

test('j needs a session', () => {
  assert.equal(press('j', ship([])), 'jump')
  assert.equal(press('j', ship([], null)), null)
})

test('keys that need a ship do nothing without one', () => {
  assert.equal(press('j', null), null)
  assert.equal(press('s', null), null)
  assert.equal(press('n', null), 'new')
  assert.equal(press('?', null), 'help')
})

test('nothing fires while typing', () => {
  for (const key of ['j', 's', 'p', 'f', 'b', 'u', 'n', '?']) assert.equal(press(key, ship(['pause', 'mark_failed', 'undock']), true), null)
})

test('isTyping knows form fields', () => {
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) assert.equal(isTyping({ tagName }), true)
  assert.equal(isTyping({ tagName: 'DIV', isContentEditable: true }), true)
  assert.equal(isTyping({ tagName: 'BODY' }), false)
  assert.equal(isTyping(null), false)
})

test('f and b ask once, then fire on the second press', () => {
  const first = pressAction(null, 'A-1', 'mark_failed')
  assert.deepEqual(first, { fire: false, confirm: { ship: 'A-1', action: 'mark_failed' } })
  assert.deepEqual(pressAction(first.confirm, 'A-1', 'mark_failed'), { fire: true, confirm: null })
  assert.equal(pressAction(first.confirm, 'A-1', 'bug_found').fire, false)
  assert.equal(pressAction(first.confirm, 'A-2', 'mark_failed').fire, false)
})

test('other actions fire at once', () => {
  assert.deepEqual(pressAction(null, 'A-1', 'pause'), { fire: true, confirm: null })
})

test('buttons show their key, and ask for confirmation when armed', () => {
  const s = ship(['pause', 'mark_failed'])
  const plain = buttonsHtml(s, String)
  assert.match(plain, /pause \(p\)/)
  assert.match(plain, /mark failed \(f\)/)
  assert.match(buttonsHtml(s, String, { ship: 'A-1', action: 'mark_failed' }), /press again to confirm \(f\)/)
  assert.match(jumpHtml({ ship: 'A-1', session: 's1' }, null), /Jump back \(j\)/)
})

test('the key list names every key', () => {
  for (const key of ['j', 's', 'p', 'f', 'b', 'u', 'n', 'o', '?']) assert.ok(keysHtml().includes(`<b>${key}</b>`))
})
