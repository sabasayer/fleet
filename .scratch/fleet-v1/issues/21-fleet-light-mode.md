# Fleet: light mode

Type: build (lean)
Status: done
Blocked by:

## Goal

The captain uses a light screen, because dark screens are hard to read with astigmatism. Fleet shows a light theme when the system is set to light. It keeps the current dark theme when the system is set to dark.

## Scope

1. **Theme by system setting.** Use `prefers-color-scheme`. No toggle button and no saved setting.
2. **Page colours** (`src/page.ts`): move every colour to CSS custom properties. Give a dark set (the current values, unchanged) and a light set.
3. **Sea colours** (`web/art.js`, `web/sea.js`, `web/life.js`): the canvas reads its colours from the active theme. When the system setting changes, the sea draws again with the new colours, without a reload.
4. **Light palette**, for easy reading:
   - Background: a soft off-white or very light blue, not pure `#fff`, to cut glare.
   - Text: dark, with contrast of at least 7:1 on its background for body text, and at least 4.5:1 for small and dim text, chips and labels.
   - The sea: light blues. Ships, crew, sails and the state colours stay readable on it. Change a state colour only when it fails 3:1 against the light sea.
   - Ship labels on the sea: no black text shadow in light mode. Labels must still meet 4.5:1.
   - Borders and lines: clear, not thin pale grey.
5. **The favicon does not change.**

## Acceptance

- One test checks that the light and dark sets have the same names.
- One test checks the contrast pairs above for the light set. A small contrast function in the test is fine.
- `npm test` passes.
- The dark theme looks the same as before.
- Report the light colours you chose and their contrast numbers.

Decisions came from the captain on 2026-11-04: light mode, because of astigmatism. Follow the system setting (the captain's Mac is set to light).

## Result

- New `web/theme.js` holds one dark set (old values) and one light set. The CSS variables are made from it.
- `src/page.ts` uses `var(--name)` for every colour. The `prefers-color-scheme: light` block swaps the set.
- Canvas code reads the live `theme` object. `web/main.js` listens for system changes and draws again, no reload.
- Light sea is light blue. Text 8:1 or more on page and sea. Dim text and state colours 4.8:1 or more.
- Test `test/theme.test.ts`: same names in both sets, and contrast pairs for light.
- Choices where the ticket was silent: sail is tan in light mode (white is too close to the sea). Anchor, deck, gold and state colours get light values. Fleet names are mixed 40% with black in light mode so any hue stays readable. Hats are the same in both themes.
