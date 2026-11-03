# Fleet: focus the next ship after a dock, and a blue favicon

Type: build (lean)
Status: done
Blocked by:

## Goal

Two small fixes the captain found in use on 2026-11-03.

## Scope

1. **Bug: the panel shows the docked ship.** The captain opens a ship and moves it to `done`. The ship docks, and the sea cursor moves on to the next ship. But the right column still shows the docked ship with its "Undock" button.
   - Cause: `poll()` in `web/main.js` sets `harbourOpen` to the ship that just docked. The panel shows `harbourOpen` before the cursor's ship.
   - Fix: after a dock, do not set `harbourOpen`. The cursor goes to the next ship on the sea (the same fleet when it still has ships, else the first fleet), and the panel follows the cursor. The captain can still undock from the harbour list.
2. **Favicon background.** The dark square mixes with the captain's other tab icons. Change the background square in the icon in `src/page.ts` from `#0d1b2a` to the app's `WAVE` blue `#2a5c88` (from `web/art.js`). Keep the sea line at the bottom as `#1e4a72`, which is darker, so it still shows against the new background. If it does not show, use `#16385a` for the sea line.

## Acceptance

- A test shows that after the open ship docks, the panel shows the cursor's ship, not the docked one. Use the style of the existing UI tests in `test/`.
- The favicon test still passes, and it checks the new background colour.
- `npm test` passes.

Decisions came from the captain on 2026-11-03. The captain asked to merge without a captain test.

## Result

- `poll()` no longer sets `harbourOpen` after a dock. New `afterDock` in `web/layout.js` picks the view: same fleet if it still has ships, else the first fleet.
- The panel now follows the cursor. The captain can still undock from the harbour list.
- Favicon background is `#4f8fd9`. Sea line is `#0d1b2a`.
- The first mate measured contrast. `#2a5c88` gave the hull 1.2:1. `#4f8fd9` with a `#0d1b2a` sea line gives every part at least 1.7:1 (hull 1.74, sail 2.64, mast 3.02, sea line 5.19).
- Tests: two new tests in `test/harbour.test.ts`. The favicon test in `test/server.test.ts` checks the new colour.

Choices:
- Put the dock decision in a small pure function, `afterDock`, so it can be tested.
- When the docked ship's fleet still has ships, the cursor goes to that fleet's first ship, not the one after the docked ship (the existing `toFleet` rule).
