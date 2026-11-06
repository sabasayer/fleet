# Fleet: fit the console card (short, narrow screens)

Type: build (lean)
Status: done
Blocked by: 24

## Goal

The console shows fleet as a card about 400 px wide and 460 to 570 px tall. At that size, the narrow layout from ticket 24 is too tight. On the live fleet at 400×460:
- The sea gets 253 px and shows 7 of 46 ship labels.
- The panel gets 207 px. The search box and chips take 110 px of it, so the list of ships that need the captain has about 67 px, about one row.

A phone (390×844) is fine today, and must stay fine.

## Scope

1. **Short and narrow (width below 760 px and height below 640 px):** the page scrolls as one column. There are no fixed 55/45 boxes with their own scroll. The order is:
   1. the "needs captain" list, in full;
   2. the sea, at a fixed height that shows at least 3 lanes, with its own vertical scroll as today;
   3. the search box and the other panel blocks (ships, harbour, the open ship).
   When a ship is open (`?ship=` or a tap), its block is at the top, above the needs list.
2. **Search at narrow widths (below 760 px, any height):** the search is one line: the text field plus a "filter" button. The button shows the chips and the count of active filters. The chips open below it. Chips with an active filter stay visible as one row.
3. **Tall narrow screens (phone):** keep the ticket 24 layout, except for the search change in point 2.
4. **Wide screens:** no change.

## Acceptance

- `npm test` passes. Add tests for any new function, for example the block order.
- Browser check on the demo at 400×460, 400×570, 390×844 and 1440×900, in light and dark (`?theme=light` and `?theme=dark` work). Report numbers:
  - no horizontal scroll (`scrollWidth <= innerWidth`);
  - at 400×460: the height in view for the needs list before any scroll, and how many needs rows show (all of them, for the demo's 2);
  - the search block height at narrow widths (target: 56 px or less when closed);
  - tap targets stay at least 40 px.
- 1440×900 keeps the same numbers as before.
- Do not open screenshots.

Decisions came from the captain on 2026-11-05: fleet must look okay inside the console card. The first mate chose the 640 px height break, the one-column scroll, and the order: needs list, sea, rest.

## Result

What changed:
- Short and narrow (width below 760, height below 640): the page is one column and scrolls. Order: open ship, needs list, sea (340 px, own scroll), search, then ships and harbour. CSS only moves blocks (`display: contents` on `#right` and `#side`, plus `order`).
- `panelHtml` has a `split` option. When set, the open ship gets its own `.open-panel` block (first) and rows no longer hold it. `main.js` sets it from a media query and redraws when the query changes.
- Narrow (below 760, any height): search is one line, the field plus a `filter` button. The button shows `filter (1)` when a chip is active. Chips open below it. When closed, only the active chip shows, as one row.
- New in `search.js`: `filterCount`, `filterLabel`.
- Tall narrow and wide: unchanged except the search line.

Tests: `npm test` passes (291). New tests in `test/panel.test.ts`: block order, no open block when none is open, normal panel unchanged, filter label.

Browser (demo, port 4939, no screenshots). All sizes: scrollWidth equals innerWidth, 0 targets under 40 px.
- 400x460 dark and light: needs list 159 px in view, 2 of 2 rows. Search closed 52 px. Chips open 186 px. One chip active and closed 98 px (52 plus a 40 px chip row). Sea 340 px shows 4 ship rows fully. With `?ship=` the order top to bottom is open (8), needs (407), sea (565), search (913), ships (973).
- 400x570 light: same numbers (needs 159, 2 rows, search 52).
- 390x844 dark and light: grid 55/45 kept, sea 464 px, search 52 px.
- 1440x900 dark and light: panel 360 px, search block 134 px, chips as before, no filter button.

Choices where the ticket was silent:
- Sea height 340 px: fits the crumbs, the lane head and 4 ship rows. "Lane" read as a ship row.
- "Count of active filters" counts the chip only. The text is already visible in the field.
- The starting block sits with the rest, below the sea.
- Closed with an active chip, the block is 98 px. The 56 px target applies with no filter.
- Search padding is 4 px vertical at narrow widths, so the closed block is 52 px.
