# Fleet: fit phones, tablets and small windows

Type: build (lean)
Status: done
Blocked by:

## Goal

Fleet works at any screen width: a phone (about 390 px wide), a tablet (about 768 px), and a narrow desktop window, for example fleet next to a terminal. Today the layout assumes a wide screen: the side panel sits to the right of the sea, and the sea draws for a wide canvas.

## Scope

1. **Narrow layout (width below 760 px).** The sea fills the width. The side panel (search, needs-captain list, the open ship) moves below the sea or becomes a bottom sheet the captain can open and close. Nothing overlaps the sea in a way that hides ships.
2. **The sea at small widths.** Ships, labels and lane heads stay readable and do not overlap one another. If the lanes do not fit, the sea scrolls vertically in place of shrinking ships below a readable size. Labels are at least 12 px.
3. **Touch.** A tap on a ship selects it, as a click does today. Tap targets (buttons, chips, lane heads, ships) are at least 40 by 40 px on a narrow screen. No hover-only feature.
4. **Other parts:** the new-ship modal fits a phone width with no side scroll. The "new ship" button does not cover the panel. The `<meta name="viewport">` tag is set.
5. **Wide screens stay as they are.**

Not in scope: access from another device. Fleet listens on `127.0.0.1` only; serving it on the network is a security change for a later ticket.

## Acceptance

- `npm test` passes. Add tests for any new layout function (for example the lane and label positions for a narrow width: no overlap).
- Check in a browser with viewport emulation at 390×844, 768×1024 and 1440×900, on the demo (`npm run demo -- --port <free port>`), in light and dark. Report what you checked with numbers: no horizontal page scroll (`scrollWidth <= innerWidth`), tap target sizes, label overlaps. Do not open screenshots.
- The wide layout at 1440×900 looks the same as before.

Decisions came from the captain on 2026-11-05: responsive design for phones and other devices. The first mate chose the 760 px break point, the bottom panel, and the scroll in place of shrinking.

## Result

What changed:
- Below 760 px viewport width, the page stacks: the sea on top (55%), the panel below (45%). The panel keeps its own scroll.
- When the sea is narrower than 640 px, it uses compact metrics. This covers phones and a narrow desktop window. The label column is 100 px and the right margin 60 px. The lane head gets its own full-width row. The lane labels (scout, crew, review, merged, released, testing) go on up to 4 rows so they never overlap. The ship tag is 12 px.
- The sea scrolls vertically with the native scroll (`#scroll`, `#world`). The scroll jumps to the cursor when the view changes. Ships are never shrunk below their scale.
- Tap: ship hit boxes grow to at least 40 by 40 (`padHit`). Buttons, chips, rows, crumb links, inputs and lane heads are at least 40 px. This applies below 760 px or on a coarse pointer (tablet).
- The modal has `max-height` and scrolls. The new ship button sits inside the sea area, so it never covers the panel. The viewport meta tag was already set.
- Wide layout: same numbers as before (tested). 1440x900 has the same head and label tops.

Tests: `npm test` passes (272). New tests in `test/layout.test.ts`: label overlap at widths 320 to 639, with and without the scout band, wide labels on one row, tap box size, compact layout not shifted.

Browser (demo on port 4937, no screenshots). Format: scrollWidth/innerWidth, small tap targets, label overlaps.
- 390x844 dark and light: armada, fleet, ship and modal views all 390/390, 0 small targets, 0 overlaps, labels 12 px. Modal box 355 px inside 390, no side scroll.
- 768x1024 dark and light: 768/768, 0 small targets, 0 overlaps. The sea is 408 px wide (compact), the panel 360 px. Modal 516 px.
- 1440x900 dark: 1440/1440, no sea scroll, 0 overlaps, panel 360 px. Light: 1200/1200 (the emulation reset the width), 0 overlaps.

Choices where the ticket was silent:
- Panel placement: stacked below, not a bottom sheet.
- Compact threshold: sea width below 640 px, separate from the 760 px page break. A 768 tablet has a 408 px sea, so it needs compact metrics.
- Lane label rows grow with width (up to 4 at 320 px) in place of shrinking text. The names are shortened: scout, crew, review.
- At a narrow width the keys hint in the crumbs is hidden.
- Ship tap target size is unit-tested. It was not clicked in the browser.
