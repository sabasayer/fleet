import assert from 'node:assert/strict'
import { test } from 'node:test'

import { boatGrid, shipGrid, snap, WOOD } from '../web/art.js'
import { crewLeft, crewRight, detailFor, floatTop, laneHeadText, placeX, SCOUT_SHARE, scoutRight, scoutX, shipPlaceX, showScoutBand, spriteRows, stoneX, WATER_GAP, waterLineY, zoneEdge } from '../web/layout.js'
import { shipPhase } from '../web/life.js'

const SAIL = '#e8e4d8'
const FLAG = '#4fbf6f'
const LEFT = 100
const RIGHT = 500
const colors = (grid: (string | null)[][]) => grid.flat().filter(Boolean)
const ship = (over: object = {}) => ({ ship: 's', title: 's', mrs: [], kind: 'ship', outcome: null, ...over })
const withMr = (over: object = {}) => ship({ mrs: [{ n: 1, crew: [] }], ...over })

test('the phase comes from kind, the MR list and the outcome', () => {
  assert.equal(shipPhase(ship({ kind: 'scout', outcome: 'turned back' })), 'turned_back')
  assert.equal(shipPhase(ship({ kind: 'scout' })), 'scouting')
  assert.equal(shipPhase(withMr({ kind: 'scout' })), 'ship')
  assert.equal(shipPhase(ship()), 'ship')
  assert.equal(shipPhase(withMr()), 'ship')
})

test('a scout that gained MR 1 reads as a normal ship, even with an outcome', () => {
  assert.equal(shipPhase(withMr({ kind: 'scout', outcome: 'turned back' })), 'ship')
})

test('a ship file with no kind and no outcome reads as a normal ship', () => {
  assert.equal(shipPhase({ ship: 's', mrs: [] }), 'ship')
  assert.equal(shipPhase({ ship: 's', mrs: [{ n: 1, crew: [] }] }), 'ship')
})

test('the scouting band takes 15% off the left of the crew band', () => {
  assert.equal(SCOUT_SHARE, 0.15)
  assert.equal(scoutRight(LEFT, RIGHT), 160)
  assert.equal(crewLeft(LEFT, RIGHT, true), 160)
  assert.equal(crewLeft(LEFT, RIGHT, false), LEFT)
})

test('with the band on, the crew band right edge and the four zone edges do not move', () => {
  assert.equal(crewRight(LEFT, RIGHT), 340)
  assert.deepEqual([0, 1, 2, 3, 4].map(i => zoneEdge(i, LEFT, RIGHT)), [340, 380, 420, 460, 500])
  assert.ok(crewLeft(LEFT, RIGHT, true) < crewRight(LEFT, RIGHT))
})

test('crew stones start at the left of the crew band', () => {
  assert.equal(stoneX(0, 1, crewLeft(LEFT, RIGHT, false), crewRight(LEFT, RIGHT)), 220)
  assert.equal(stoneX(0, 1, crewLeft(LEFT, RIGHT, true), crewRight(LEFT, RIGHT)), 250)
})

test('with the band on a ship with no crew moves right, a ship in a zone stays put', () => {
  const sailing = { life: { stage: 'sailing' } }
  const merged = { life: { stage: 'merged' } }
  assert.equal(shipPlaceX(sailing, [], LEFT, RIGHT, false), 124)
  assert.equal(shipPlaceX(sailing, [], LEFT, RIGHT, true), 184)
  assert.equal(shipPlaceX(merged, [], LEFT, RIGHT, true), shipPlaceX(merged, [], LEFT, RIGHT, false))
})

test('the band shows on manual, and on a scout at sea when nobody pressed s', () => {
  assert.equal(showScoutBand(undefined, false), false)
  assert.equal(showScoutBand(true, false), true)
  assert.equal(showScoutBand(undefined, true), true)
  assert.equal(showScoutBand(false, true), false)
})

test('the lane head counts scouts apart from ships, and leaves them out at zero', () => {
  const ships = [withMr(), withMr(), withMr(), withMr()]
  const scout = ship({ kind: 'scout' })
  assert.equal(laneHeadText([...ships, scout]), '4 ships · 1 scout')
  assert.equal(laneHeadText(ships), '4 ships')
})

test('the scout boat has a hull and a short mast, but no sail', () => {
  const full = colors(shipGrid([], '#ffffff', 0, 'deck', 'sailing'))
  assert.ok(full.includes(WOOD) && full.includes(SAIL))
  const boat = colors(boatGrid(0, FLAG))
  assert.ok(boat.length > 0)
  assert.equal(boat.includes(WOOD), true)
  assert.equal(boat.includes(SAIL), false)
})

test('the scout boat flies the fleet colour', () => {
  assert.ok(colors(boatGrid(0, FLAG)).includes(FLAG))
  assert.ok(colors(boatGrid(1, FLAG)).includes(FLAG))
  assert.equal(colors(boatGrid(0, '#123456')).includes(FLAG), false)
})

test('the boat bobs every other frame', () => {
  assert.notDeepEqual(boatGrid(0, FLAG), boatGrid(1, FLAG))
  assert.deepEqual(boatGrid(0, FLAG), boatGrid(2, FLAG))
})

test('the bob space stays at the bottom of the boat grid', () => {
  const bottom = boatGrid(0, FLAG).at(-1)
  assert.deepEqual(bottom, bottom?.map(() => null))
})

test('a scout boat sits in the middle of the band, and falls back when the band is off', () => {
  const scout = ship({ kind: 'scout' })
  assert.equal(scoutX(LEFT, RIGHT), 130)
  assert.equal(placeX(scout, [], LEFT, RIGHT, true), 130)
  assert.equal(placeX(scout, [], LEFT, RIGHT, false), shipPlaceX(scout, [], LEFT, RIGHT, false))
})

test('a normal ship is placed the same with or without the band rule', () => {
  const sailing = withMr({ life: { stage: 'sailing' } })
  assert.equal(placeX(sailing, [], LEFT, RIGHT, true), shipPlaceX(sailing, [], LEFT, RIGHT, true))
  assert.equal(placeX(sailing, [], LEFT, RIGHT, false), shipPlaceX(sailing, [], LEFT, RIGHT, false))
})

test('a scout boat ends on the water line, at the same place as a ship hull', () => {
  const scale = 2
  const dpr = 2
  const rowY = 100
  const rowPx = snap(scale, dpr)
  const detail = detailFor(scale)
  const lineY = waterLineY(rowY, detail, scale)
  const boat = boatGrid(1, FLAG)

  assert.equal(floatTop(lineY, boat.length, rowPx) + boat.length * rowPx, lineY - WATER_GAP)
  assert.equal(rowY + spriteRows(detail) * rowPx, lineY - WATER_GAP)
})
