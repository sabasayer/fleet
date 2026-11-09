import assert from 'node:assert/strict'
import { test } from 'node:test'

import { phaseOf, stepperHtml } from '../web/steps.js'

const member = (role: string, state: string, summary = '') => ({ role, state, stale: false, summary })

test('roles map to phases, unknown roles go to other', () => {
  const phases = (roles: string[]) => roles.map(role => phaseOf(role).id)
  assert.deepEqual(phases(['gate-spec', 'spike', 'red', 'pin-b', 'gate-tests', 'green', 'move-c', 'review-spec', 'review-standards', 'fixer', 'browser', 'gate-captain', 'first-mate', 'surprise']), [
    'spec', 'spec', 'tests', 'tests', 'tests', 'build', 'build', 'review', 'review', 'review', 'prove', 'ship', 'ship', 'other',
  ])
})

test('done steps collapse into one line, open steps are grouped by phase', () => {
  const html = stepperHtml([member('gate-spec', 'done', 'ok'), member('red', 'done', 'ok'), member('green', 'running', 'building'), member('review-spec', 'queued', 'review')])
  assert.equal(html.match(/2 of 4 done/g)!.length, 1)
  assert.equal(html.match(/<details/g)!.length, 1)
  assert.match(html, /<h4>Build <span class="dim">0\/1<\/span><\/h4>/)
  assert.match(html, /<h4>Review <span class="dim">0\/1<\/span><\/h4>/)
  assert.doesNotMatch(html, /<h4>Spec/)
})

test('only a live step shows its note, a waiting step is dimmed', () => {
  const html = stepperHtml([member('green', 'running', 'building the helper'), member('review-spec', 'queued', 'review')])
  assert.match(html, /building the helper/)
  assert.doesNotMatch(html, />review</)
  assert.match(html, /class="step  wait"/)
})

test('a stale step counts as open and shows (stale)', () => {
  const html = stepperHtml([{ role: 'green', state: 'done', stale: true, summary: 'x' }])
  assert.match(html, /0 of 1 done/)
  assert.match(html, /done \(stale\)/)
})

test('no crew gives the empty message', () => {
  assert.match(stepperHtml([]), /No crew yet/)
})
