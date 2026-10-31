import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  crewOf, crewRight, currentIndex, headRoom, initialView, LABEL_COLUMN, layoutFor, RIGHT_MARGIN, ROLE_CHAR_PX, roleLabels, shipLeft, mixLayout, move, reconcile, scrollShift, shipX, stoneX, toFleet, zoomIn, zoomOut,
} from '../web/layout.js'
import { shipGrid } from '../web/art.js'

const member = (role: string, state: string) => ({ role, state, stale: false })
const ship = (name: string, mrs: { crew: ReturnType<typeof member>[] }[] = [{ crew: [] }]) => ({ ship: name, title: name, mrs, needsCaptain: null })
const fleets = [
  { id: 'a', name: 'A', color: '#fff', ships: [ship('a1'), ship('a2')] },
  { id: 'b', name: 'B', color: '#fff', ships: [ship('b1')] },
]
const size = { w: 1000, h: 700 }

test('current member is the first one not done', () => {
  assert.equal(currentIndex([member('red', 'done'), member('green', 'running'), member('review', 'blocked')]), 1)
  assert.equal(currentIndex([member('red', 'done'), member('green', 'done')]), -1)
  assert.equal(currentIndex([]), -1)
})

test('crew comes from the latest merge request that has crew', () => {
  const red = member('red', 'done')
  assert.deepEqual(crewOf(ship('s', [{ crew: [red] }, { crew: [] }])), [red])
  assert.deepEqual(crewOf(ship('s', [{ crew: [] }])), [])
})

test('ship sits on the current stone, at the end when all done, near the start without crew', () => {
  const crew = [member('red', 'done'), member('green', 'running')]
  assert.equal(shipX(crew, 100, 500), stoneX(1, 2, 100, 500))
  assert.equal(shipX([member('red', 'done')], 100, 500), 546)
  assert.equal(shipX([], 100, 500), 124)
})

test('zoom in and out walk armada, fleet, ship', () => {
  let view = initialView(fleets)
  assert.deepEqual(view, { level: 'armada', cursor: 'a' })
  view = zoomIn(view, fleets)
  assert.deepEqual(view, { level: 'fleet', cursor: 'a1' })
  view = zoomIn(move(view, fleets, 1), fleets)
  assert.deepEqual(view, { level: 'ship', cursor: 'a2' })
  assert.deepEqual(zoomIn(view, fleets), view)
  view = zoomOut(view, fleets)
  assert.deepEqual(view, { level: 'fleet', cursor: 'a2' })
  assert.deepEqual(zoomOut(view, fleets), { level: 'armada', cursor: 'a' })
  assert.deepEqual(zoomOut({ level: 'armada', cursor: 'a' }, fleets), { level: 'armada', cursor: 'a' })
})

test('cursor wraps and the breadcrumb keeps the ship in its fleet', () => {
  assert.deepEqual(move({ level: 'armada', cursor: 'b' }, fleets, 1), { level: 'armada', cursor: 'a' })
  assert.deepEqual(move({ level: 'fleet', cursor: 'a1' }, fleets, -1), { level: 'fleet', cursor: 'a2' })
  assert.deepEqual(toFleet({ level: 'ship', cursor: 'a2' }, fleets, 'a'), { level: 'fleet', cursor: 'a2' })
  assert.deepEqual(toFleet({ level: 'ship', cursor: 'a2' }, fleets, 'b'), { level: 'fleet', cursor: 'b1' })
})

test('reconcile falls back to armada when the cursor ship is gone', () => {
  assert.deepEqual(reconcile({ level: 'ship', cursor: 'gone' }, fleets), { level: 'armada', cursor: 'a' })
  assert.deepEqual(reconcile({ level: 'ship', cursor: 'b1' }, fleets), { level: 'ship', cursor: 'b1' })
  assert.deepEqual(reconcile({ level: 'armada', cursor: 'gone' }, fleets), { level: 'armada', cursor: 'a' })
})

test('armada shows every lane, fleet and ship zoom hide the others', () => {
  const armada = layoutFor({ level: 'armada', cursor: 'a' }, fleets, size)
  assert.equal(armada.lanes.a.a, 1)
  assert.equal(armada.lanes.b.a, 1)
  assert.ok(armada.lanes.b.y > armada.lanes.a.y)

  const fleet = layoutFor({ level: 'fleet', cursor: 'a1' }, fleets, size)
  assert.equal(fleet.lanes.b.a, 0)
  assert.ok(fleet.lanes.b.y > size.h)
  assert.equal(fleet.ships.a1.a, 1)
  assert.equal(fleet.ships.a2.a, 1)

  const one = layoutFor({ level: 'ship', cursor: 'a2' }, fleets, size)
  assert.equal(one.ships.a1.a, 0)
  assert.equal(one.ships.a2.a, 1)
  assert.equal(one.ships.a2.y, one.ships.a2.y)
  assert.equal(one.scale, 8)
})

test('a fleet above the focus slides up, below slides down', () => {
  const above = layoutFor({ level: 'fleet', cursor: 'b1' }, fleets, size)
  assert.ok(above.lanes.a.y < 0)
})

test('mixing layouts halfway gives halfway values', () => {
  const from = layoutFor({ level: 'armada', cursor: 'a' }, fleets, size)
  const to = layoutFor({ level: 'ship', cursor: 'a1' }, fleets, size)
  const half = mixLayout(from, to, 0.5)
  assert.equal(half.scale, 5)
  assert.equal(half.ships.a2.a, 0.5)
})

test('scroll shift keeps the cursor row in view', () => {
  assert.equal(scrollShift({ top: 100, bottom: 300 }, 700), 0)
  assert.equal(scrollShift({ top: 800, bottom: 900 }, 700), 900 - (700 - 16))
})

const ROLES = ['red', 'green', 'review-spec', 'review-quality', 'gate-captain', 'browser-check', 'fixer', 'move', 'pin', 'review', 'gate', 'browser']
const crewOfSize = (count: number, done: number) =>
  Array.from({ length: count }, (_, i) => member(ROLES[i % ROLES.length], i < done ? 'done' : 'running'))

for (const width of [1280, 1440, 1920]) {
  for (const count of [3, 8, 12]) {
    const left = LABEL_COLUMN
    const right = width - RIGHT_MARGIN
    const stop = crewRight(left, right)

    test(`role labels do not overlap and the ship keeps right of the label column: ${count} members at ${width}px`, () => {
      for (let done = 0; done <= count; done++) {
        const crew = crewOfSize(count, done)
        const spans = roleLabels(crew, left, stop).map(({ x, text }) => [x - (text.length * ROLE_CHAR_PX) / 2, x + (text.length * ROLE_CHAR_PX) / 2])
        assert.ok(spans.length > 0)
        spans.slice(1).forEach(([from], i) => assert.ok(from >= spans[i][1], `labels ${i} and ${i + 1} overlap`))
        const faces = shipGrid(crew, '#fff', 0, 'faces')[0].length * 8
        assert.ok(shipLeft(shipX(crew, left, stop), faces, left, right) >= left)
      }
    })
  }
}

test('role names shrink, then only the current one shows', () => {
  const crew = crewOfSize(12, 3)
  assert.deepEqual(roleLabels(crewOfSize(3, 1), 170, 794).map(l => l.text), ['red', 'green', 'review-spec'])
  assert.ok(roleLabels(crew, 170, 794).every(l => l.text.length <= 5))
  const tight = roleLabels(crew, 170, 300)
  assert.deepEqual(tight.map(l => [l.k, l.text]), [[3, 'review-quality']])
})

test('lane head leaves room before the first header label', () => {
  assert.ok(headRoom(170, 1210, true) < headRoom(170, 1210, false))
  assert.ok(headRoom(170, 1210, false) > 0)
})
