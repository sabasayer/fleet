import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DARK, LIGHT } from '../web/theme.js'

const names = (set: Record<string, unknown>): string[] =>
  Object.entries(set)
    .flatMap(([key, value]) => (typeof value === 'object' && value ? names(value as Record<string, unknown>).map(name => `${key}.${name}`) : [key]))
    .sort()

const rgb = (hex: string, over?: string): number[] => {
  const full = hex.length <= 5 ? [...hex.slice(1)].map(c => c + c).join('') : hex.slice(1)
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
  const alpha = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1
  if (alpha === 1 || !over) return [r, g, b]
  const under = rgb(over)

  return [r, g, b].map((c, i) => c * alpha + under[i] * (1 - alpha))
}

const luminance = (c: number[]) => {
  const [r, g, b] = c.map(v => {
    const n = v / 255

    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (hi + 0.05) / (lo + 0.05)
}

const contrast = (fg: string, bg: string, under?: string) => ratio(rgb(fg), rgb(bg, under))

const hslMixed = (h: number, weight: number): number[] => {
  const [s, l] = [0.55, 0.5]
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))) * 255

  return [f(0), f(8), f(4)].map(v => v * weight)
}

test('light and dark sets have the same names', () => {
  assert.deepEqual(names(LIGHT), names(DARK))
})

const t = LIGHT
const grounds: [string, string, string?][] = [
  ['page', t.bg],
  ['hud', t.hud, t.bg],
  ['field', t.field],
  ['sea 0', t.calm0],
  ['sea 1', t.calm1],
]
const seaGrounds: [string, string, string?][] = [
  ['sea 0', t.calm0],
  ['sea 1', t.calm1],
  ['zone on sea 0', t.zoneTint, t.calm0],
  ['zone on sea 1', t.zoneTint, t.calm1],
  ['band on sea 0', t.bandTint, t.calm0],
]

test('light: body text is at least 7:1', () => {
  for (const [name, bg, under] of grounds) assert.ok(contrast(t.ink, bg, under) >= 7, `ink on ${name}`)
  for (const [name, bg, under] of seaGrounds) assert.ok(contrast(t.ink, bg, under) >= 7, `ink on ${name}`)
  for (const bg of [t.hover, t.active, t.activeHover]) assert.ok(contrast(t.ink, bg) >= 7, `ink on ${bg}`)
  assert.ok(contrast(t.ink, t.askBg) >= 7)
})

test('light: dim text and labels are at least 4.5:1', () => {
  for (const [name, bg, under] of grounds) assert.ok(contrast(t.dim, bg, under) >= 4.5, `dim on ${name}`)
  for (const [name, bg, under] of seaGrounds) assert.ok(contrast(t.dim, bg, under) >= 4.5, `dim on ${name}`)
  assert.ok(contrast(t.dim, t.hover) >= 4.5)
  for (const bg of [t.bg, t.hover, t.field]) assert.ok(contrast(t.accent, bg) >= 4.5, `accent on ${bg}`)
  assert.ok(contrast(t.accent, t.calm0) >= 4.5)
  assert.ok(contrast(t.accent, t.calm1) >= 4.5)
  assert.ok(contrast(t.ink, t.askBg) >= 4.5)
})

test('light: gold, good, states and life colours are at least 4.5:1 as text', () => {
  const colours: Record<string, string> = { gold: t.gold, good: t.good, ...Object.fromEntries(Object.entries(t.state).map(([k, v]) => [`state ${k}`, v])), ...Object.fromEntries(Object.entries(t.life).map(([k, v]) => [`life ${k}`, v])) }
  for (const [name, colour] of Object.entries(colours)) {
    for (const [ground, bg, under] of [...grounds.filter(g => g[0] !== 'field'), ...seaGrounds.slice(2)]) {
      assert.ok(contrast(colour, bg, under) >= 4.5, `${name} on ${ground}`)
    }
  }
})

test('light: badges and the ask button are readable', () => {
  assert.ok(contrast(t.needsInk, t.gold) >= 4.5)
  assert.ok(contrast(t.failInk, t.state.failed) >= 4.5)
  assert.ok(contrast(t.ink, t.askBg) >= 4.5)
})

test('light: borders and lines are at least 3:1', () => {
  assert.ok(contrast(t.line, t.bg) >= 3)
  assert.ok(contrast(t.edge, t.bg) >= 3)
  assert.ok(contrast(t.stoneLine, t.calm0) >= 3)
  assert.ok(contrast(t.stoneLine, t.calm1) >= 3)
  assert.ok(contrast(t.step, t.bg) >= 3)
})

test('light: ships, sails and state colours stand out from the sea', () => {
  for (const sea of [t.calm0, t.calm1]) {
    for (const [name, colour] of Object.entries({ ...t.state, anchor: t.anchor, gold: t.gold })) assert.ok(contrast(colour, sea) >= 3, `${name} on sea`)
    assert.ok(contrast(t.deck, sea) >= 3, 'deck on sea')
    assert.ok(contrast('#5c3a1c', sea) >= 3, 'hull on sea')
    assert.ok(contrast(t.sail, sea) >= 1.3, 'sail on sea')
  }
})

test('light: fleet names mixed with black stay readable for every hue', () => {
  const weight = parseInt(t.headMix) / 100
  for (let h = 0; h < 360; h += 5) {
    for (const sea of [t.calm0, t.calm1, t.bg]) assert.ok(ratio(hslMixed(h, weight), rgb(sea)) >= 4.5, `hue ${h} on ${sea}`)
  }
})

test('light: no black text shadow', () => {
  assert.equal(LIGHT.labelShadow, 'none')
  assert.equal(DARK.labelShadow, '1px 1px 0 #000')
})

for (const [mode, set] of [['dark', DARK], ['light', LIGHT]] as const) {
  test(`${mode}: the beacon "!" is readable and the box stands out from the sea`, () => {
    for (const box of [set.gold, set.beaconFail]) {
      assert.ok(contrast(set.beaconInk, box) >= 4.5, `beacon ink on ${box}`)
      for (const sea of [set.calm0, set.calm1]) assert.ok(contrast(box, sea) >= 3, `beacon box ${box} on ${sea}`)
    }
  })

  test(`${mode}: panel badges are readable`, () => {
    assert.ok(contrast(set.needsInk, set.gold) >= 4.5)
    assert.ok(contrast(set.failInk, set.state.failed) >= 4.5)
  })
}
