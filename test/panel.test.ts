import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ago, linkChip, listedShips, openShipName, waitingShips } from '../web/panel.js'

const member = (updatedMs: number) => ({ role: 'red', state: 'done', stale: false, updatedMs })
const ship = (name: string, updatedMs: number, needs: 'blocked' | 'failed' | null = null) => ({
  ship: name,
  title: name,
  created: '2026-01-01T00:00:00Z',
  mrs: [{ crew: [member(updatedMs)] }],
  needsCaptain: needs && { role: 'gate', reason: 'r', kind: needs },
})
const fleets = [
  { id: 'a', name: 'A', color: '#fff', ships: [ship('a1', 300), ship('a2', 100, 'blocked')] },
  { id: 'b', name: 'B', color: '#fff', ships: [ship('b1', 200, 'failed'), ship('b2', 50)] },
]
const names = (entries: { ship: { ship: string } }[]) => entries.map(e => e.ship.ship)

test('waiting ships list the longest wait first, across fleets', () => {
  assert.deepEqual(names(waitingShips(fleets)), ['a2', 'b1'])
})

test('ships panel puts waiting ships first, then the oldest', () => {
  assert.deepEqual(names(listedShips({ level: 'armada', cursor: 'a' }, fleets)), ['a2', 'b1', 'b2', 'a1'])
})

test('ships panel shows only the focused fleet once zoomed in', () => {
  assert.deepEqual(names(listedShips({ level: 'fleet', cursor: 'b2' }, fleets)), ['b1', 'b2'])
})

test('open ship follows the cursor except at armada level', () => {
  assert.equal(openShipName({ level: 'armada', cursor: 'a' }), null)
  assert.equal(openShipName({ level: 'ship', cursor: 'a1' }), 'a1')
})

test('ago words', () => {
  assert.equal(ago(0, 30000), 'just now')
  assert.equal(ago(0, 5 * 60000), '5 min ago')
  assert.equal(ago(0, 3 * 3600000), '3 h ago')
})

import { panelHtml } from '../web/panel.js'
import { filterCount, filterLabel } from '../web/search.js'

const panelArgs = { fleets: fleets as never, now: Date.now(), jump: {} as never }
const armada = { level: 'armada', cursor: 'a' }
const opened = { level: 'ship', cursor: 'a2' }

test('split panel puts the open ship block first, above the needs list', () => {
  const html = panelHtml({ ...panelArgs, view: opened, split: true })
  assert.ok(html.indexOf('open-panel') >= 0 && html.indexOf('open-panel') < html.indexOf('needs-panel'))
  assert.equal(html.match(/class="open"/g)?.length, 1)
  assert.equal(html.includes('data-open="a2"'), true)
})

test('split panel has no open block when no ship is open', () => {
  assert.equal(panelHtml({ ...panelArgs, view: armada, split: true }).includes('open-panel'), false)
})

test('the normal panel keeps the open ship inside its row', () => {
  const html = panelHtml({ ...panelArgs, view: opened })
  assert.equal(html.includes('open-panel'), false)
  assert.equal(html.match(/class="open"/g)?.length, 1)
})

test('filter button counts the active chip filter', () => {
  assert.equal(filterCount({ text: 'x', chip: 'all' }), 0)
  assert.equal(filterLabel({ text: '', chip: 'needs' }), 'filter (1)')
  assert.equal(filterLabel({ text: '', chip: 'all' }), 'filter')
})

test('link chips show an icon and a short reference, and keep the full link in the title', () => {
  const linear = linkChip('https://linear.app/founda/issue/ENG-3197/404-page-shows-patient-id')
  assert.match(linear, /<span class="ref-icon">L<\/span>ENG-3197</)
  assert.match(linear, /title="Linear: https:\/\/linear\.app\/founda\/issue\/ENG-3197\/404-page-shows-patient-id"/)
  assert.match(linkChip('https://github.com/sabasayer/fleet/pull/32'), /GH<\/span>#32</)
  assert.match(linkChip('https://github.com/sabasayer/fleet/issues/12'), /GH<\/span>#12</)
  assert.match(linkChip('https://gitlab.com/founda/application/xds-nuxt-base/-/merge_requests/383'), /GL<\/span>!383</)
  assert.match(linkChip('https://app.notion.com/p/410c271b'), /N<\/span><\/a>/)
  assert.match(linkChip('https://example.org/x'), /↗<\/span><\/a>/)
})

test('link chips refuse anything that is not an http link', () => {
  assert.equal(linkChip('javascript:alert(1)'), '')
  assert.equal(linkChip(null), '')
  assert.equal(linkChip(''), '')
})
