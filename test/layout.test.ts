import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  crewOf, crewRight, currentIndex, headRoom, initialView, LABEL_COLUMN, layoutFor, RIGHT_MARGIN, shipLeft, trackSegments, currentLabel, mixLayout, move, reconcile, scrollShift, shipX, stoneX, toFleet, zoomIn, zoomOut,
} from '../web/layout.js'
import { onDeck, shipGrid, sizeClass } from '../web/art.js'

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

    test(`the ship keeps right of the label column and the track segments tile without overlap: ${count} members at ${width}px`, () => {
      for (let done = 0; done <= count; done++) {
        const crew = crewOfSize(count, done)
        const segments = trackSegments(crew.length, left, stop)
        assert.equal(segments.length, count)
        segments.slice(1).forEach(({ x, w }, i) => assert.ok(Math.abs(x - w / 2 - (segments[i].x + segments[i].w / 2)) < 0.001, `segments ${i} and ${i + 1} do not touch`))
        assert.ok(segments[0].x - segments[0].w / 2 >= left && segments[count - 1].x + segments[count - 1].w / 2 <= stop)
        const faces = shipGrid(crew, '#fff', 0, 'faces')[0].length * 8
        assert.ok(shipLeft(shipX(crew, left, stop), faces, left, right) >= left)
      }
    })
  }
}

test('the current step label names the role and counts the done steps', () => {
  const label = currentLabel(crewOfSize(12, 3), 170, 794)!
  assert.equal(label.text, 'review-quality · 3/12')
  assert.equal(label.x, stoneX(3, 12, 170, 794))
})

test('no label when every step is done or there is no crew', () => {
  assert.equal(currentLabel(crewOfSize(4, 4), 170, 794), null)
  assert.equal(currentLabel([], 170, 794), null)
})

test('lane head leaves room before the first header label', () => {
  assert.ok(headRoom(170, 1210, true) < headRoom(170, 1210, false))
  assert.ok(headRoom(170, 1210, false) > 0)
})

import { COMPACT_PX, isCompact, laneLabels, metricsFor, MIN_TAP, padHit, placeRows } from '../web/layout.js'

const overlaps = (items: { x: number; width: number; row: number }[]) =>
  items.some((a, i) => items.some((b, j) => i < j && a.row === b.row && Math.abs(a.x - b.x) < (a.width + b.width) / 2))

test('lane labels never overlap at any narrow width, with or without the scout band', () => {
  for (const w of [320, 360, 390, 400, 480, 600, COMPACT_PX - 1]) {
    for (const band of [false, true]) {
      const { items, rows } = laneLabels(100, w - 60, band, true)
      assert.equal(overlaps(items), false, `${w} band=${band}`)
      assert.ok(rows <= 4)
      for (const item of items) {
        assert.ok(item.x - item.width / 2 >= 0, `${w} left edge`)
        assert.ok(item.x + item.width / 2 <= w, `${w} right edge`)
      }
    }
  }
})

test('wide lane labels stay on one row', () => {
  const { items, rows } = laneLabels(170, 1080 - 70, true, false)
  assert.equal(rows, 1)
  assert.deepEqual(items.map(item => item.text), ['scouting', 'crew at work', 'in review', 'merged', 'released', 'testing'])
})

test('placeRows uses the next row when labels collide', () => {
  const rows = placeRows([{ text: 'aaaaaaaa', x: 50 }, { text: 'bbbbbbbb', x: 80 }, { text: 'cccc', x: 400 }], 3)
  assert.deepEqual(rows.map(r => r.row), [0, 1, 0])
})

test('wide metrics keep the old numbers; compact metrics start below the width break', () => {
  assert.equal(isCompact(COMPACT_PX), false)
  assert.equal(isCompact(COMPACT_PX - 1), true)
  const wide = metricsFor({ w: 1080 })
  assert.deepEqual([wide.labelColumn, wide.rightMargin, wide.head, wide.tintTop, wide.labelTop], [LABEL_COLUMN, RIGHT_MARGIN, 28, 24, 6])
  const narrow = metricsFor({ w: 390 })
  assert.equal(narrow.compact, true)
  assert.ok(narrow.head >= 44 + 18)
})

test('a tap box is at least 40 by 40 and keeps the ship inside', () => {
  const box = padHit({ x: 100, y: 50, w: 30, h: 36, ship: 's' })
  assert.ok(box.w >= MIN_TAP && box.h >= MIN_TAP)
  assert.ok(box.x <= 100 && box.x + box.w >= 130 && box.y <= 50 && box.y + box.h >= 86)
  assert.deepEqual(padHit({ x: 0, y: 0, w: 60, h: 60 }), { x: 0, y: 0, w: 60, h: 60 })
})

test('compact layout does not shift lanes; it reports the full height to scroll', () => {
  const many = Array.from({ length: 6 }, (_, i) => ({ id: `f${i}`, name: `F${i}`, color: '#fff', ships: [ship(`s${i}a`), ship(`s${i}b`)] }))
  const view = { level: 'armada', cursor: 'f5' }
  const out = layoutFor(view, many, { w: 390, h: 400 })
  const head = metricsFor({ w: 390 }).head
  assert.equal(out.lanes.f0.y, 64)
  assert.ok(out.bottom > 400)
  assert.equal(out.lanes.f1.y, 64 + head + 2 * out.rowHeight + 8 + 8)
  const wide = layoutFor(view, many, { w: 1000, h: 400 })
  assert.ok(wide.lanes.f0.y < 64)
})

test('boat length stays capped while the crew grows', () => {
  const widths = [1, 4, 5, 6, 10, 11, 18, 40].map(count => shipGrid(crewOfSize(count, 0), '#fff', 0, 'faces')[0].length)
  assert.equal(widths[2], widths[1] + 0)
  assert.equal(widths[3] < widths[7] + 1, true)
  assert.equal(Math.max(...widths), widths[7])
  assert.equal(widths[6], widths[7])
  assert.deepEqual([4, 5, 6, 10, 11].map(c => sizeClass(c).name), ['small', 'small', 'medium', 'medium', 'large'])
})

test('the deck shows the current member and its neighbours', () => {
  const crew = crewOfSize(18, 9)
  const shown = onDeck(crew, 6)
  assert.equal(shown.length, 6)
  assert.ok(shown.includes(crew[9]))
  assert.deepEqual(onDeck(crewOfSize(18, 18), 6), crewOfSize(18, 18).slice(12))
})
