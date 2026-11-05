# Fleet: a readable "!" beacon on the sea

Type: build (lean)
Status: done
Blocked by:

## Goal

A ship that needs the captain shows a "!" beacon above it on the sea. In the light theme the "!" is hard to read. The sign is a box in the gold or failed colour, and the "!" is cut out of it in the fixed colour `#2a1d00`. In light mode the box is dark brown (`#5c4300`) or dark red (`#a81c26`), so the dark "!" almost vanishes inside it. The captain has astigmatism, so this matters.

## Scope

1. The "!" ink comes from the theme, not the fixed `#2a1d00` in `web/art.js` (`BANG`, `beaconGrid`).
2. Light theme: the "!" ink has at least 4.5:1 contrast against both the needs box (gold) and the failed box. White, or the theme's `needsInk` and `failInk`, are fine if they pass.
3. Dark theme: keep it as it is today (`#2a1d00` on the bright gold and red boxes), unless a pair is below 4.5:1. Then pick the closest colour that passes, and say so.
4. The box itself must stand out from the sea: at least 3:1 against both sea shades, in both themes.
5. The panel badges (`.needs`, `.fail` in `src/page.ts`) must also reach 4.5:1 in both themes. Fix them only if they fail.

## Acceptance

- `test/theme.test.ts` checks the pairs above in both themes.
- `npm test` passes.
- Report every pair with its contrast number.

Decision came from the captain on 2026-11-05: the "!" is hard to read; fix its colours for accessibility.

## Result

- "!" ink now comes from the theme key `beaconInk`. The failed box colour comes from the new key `beaconFail`. Both are in `web/theme.js`.
- Light: ink is white. Dark: ink stays `#2a1d00`.
- Dark failed box: `#e5484d` was only 2.2 to 2.4 against the sea. The beacon box now uses `#ff6b6f` (3.13 and 3.33 against the sea). The ship state colour is unchanged.
- Dark failed badge: `failInk` was white on `#e5484d` (3.91). It is now `#140808` (5.02).
- Tests: `test/theme.test.ts` checks the beacon and badge pairs in both themes.

Contrast numbers (light / dark):
- "!" on gold box: 9.30 (white on `#5c4300`) / 9.40 (`#2a1d00` on `#e5c04b`)
- "!" on failed box: 7.35 (white on `#a81c26`) / 5.95 (`#2a1d00` on `#ff6b6f`)
- Gold box on sea 0 / sea 1: 7.12 / 6.76 light, 5.26 / 4.94 dark
- Failed box on sea 0 / sea 1: 5.62 / 5.34 light, 3.33 / 3.13 dark
- Needs badge: 9.30 light, 9.92 dark. Fail badge: 7.35 light, 5.02 dark.
