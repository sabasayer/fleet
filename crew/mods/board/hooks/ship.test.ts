import { expect, test } from 'claude-code/testing'

import { drawShip, halfBlocks, hatFor, hatSvg, miniHatGrid, shipSvg, shipWidth, water } from './ship.ts'

const WIDTH = shipWidth(1, false)

const agent = (state: string) => ({ role: 'x', state, updatedMs: 0 })

test('ship is 5 text lines of the full width, bobbing only while sailing', () => {
  const lines = halfBlocks(drawShip([agent('running')], 0, true))
  expect(lines).toHaveLength(5)
  expect(lines.every(l => l.reduce((n, r) => n + r.t.length, 0) === WIDTH)).toBe(true)
  const still = JSON.stringify(halfBlocks(drawShip([agent('done')], 0, false)))
  expect(JSON.stringify(halfBlocks(drawShip([agent('done')], 1, false)))).toBe(still)
  expect(JSON.stringify(halfBlocks(drawShip([agent('running')], 1, true)))).not.toBe(JSON.stringify(lines))
})

test('characters mode draws faces: taller, wider with more agents, one face per state', () => {
  expect(halfBlocks(drawShip([agent('done')], 0, false, true))).toHaveLength(7)
  expect(shipWidth(8, true)).toBeGreaterThan(shipWidth(2, true))
  const face = (state: string) => JSON.stringify(halfBlocks(drawShip([agent(state)], 0, false, true)))
  const faces = ['done', 'failed', 'blocked', 'running', 'queued'].map(face)
  expect(new Set(faces).size).toBe(5)
})

test('every face is drawn whatever the role name, and a stale agent gets a red collar', () => {
  const roles = ['gate-spec', 'red', 'green', 'review-spec', 'review-standards', 'fixer', 'browser', 'zzz', 'a', 'b']
  for (const role of roles) {
    const grid = drawShip([{ role, state: 'done', updatedMs: 0 }], 0, false, true)
    expect(grid.every(row => row.every(cell => cell !== undefined))).toBe(true)
    const skin = grid.flat().filter(c => c && /^#[0-9a-f]{6}$/.test(c)).length
    expect(skin).toBeGreaterThan(20)
  }
  const fresh = JSON.stringify(drawShip([{ role: 'x', state: 'running', updatedMs: 1000 }], 0, true, true, 2000))
  const late = JSON.stringify(drawShip([{ role: 'x', state: 'running', updatedMs: 1000 }], 0, true, true, 1000 + 16 * 60_000))
  expect(late).not.toBe(fresh)
  expect(late).toContain('#e5484d')
})

test('hat shape follows the role family and review roles get different colors', () => {
  expect(hatFor('green').rows).not.toEqual(hatFor('red').rows)
  expect(hatFor('review-spec').rows).toEqual(hatFor('review-standards').rows)
  expect(hatFor('review-spec').color).not.toBe(hatFor('review-standards').color)
  expect(hatFor('red').color).toBe('#d9534f')
  expect(hatFor('whatever').rows).toEqual(hatFor('other').rows)
})

test('water scrolls only while sailing and keeps its width', () => {
  expect(water(1, true, WIDTH).t).not.toBe(water(0, true, WIDTH).t)
  expect(water(1, false, WIDTH).t).toBe(water(0, false, WIDTH).t)
  expect(water(3, true, WIDTH).t).toHaveLength(WIDTH)
})

test('svg ship has rects, a fixed size and a moving sea', () => {
  const a = shipSvg(drawShip([agent('running')], 0, true), 0, true, 6)
  const b = shipSvg(drawShip([agent('running')], 0, true), 1, true, 6)
  expect(a.source.startsWith('<svg')).toBe(true)
  expect(a.width).toBe(WIDTH * 6)
  expect(a.source).not.toBe(b.source)
})

test('row hat is a 3 by 2 mini hat in the terminal and the 5 by 2 hat as a small svg', () => {
  const lines = halfBlocks(miniHatGrid('green'))
  expect(lines).toHaveLength(1)
  expect(lines[0]!.reduce((n, r) => n + r.t.length, 0)).toBe(3)
  expect(hatSvg('green', 3).width).toBe(15)
  expect(hatSvg('green', 3).height).toBe(6)
  expect(hatSvg('red', 3).source).not.toBe(hatSvg('green', 3).source)
})
