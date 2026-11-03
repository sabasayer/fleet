# Fleet: favicon

Type: build (lean)
Status: done
Blocked by:

## Goal

The browser tab shows a small fleet icon, so the captain finds the fleet tab fast.

## Scope

- One `<link rel="icon">` in the page head in `src/page.ts`, with an inline SVG data URI. No new file, no new server route.
- The SVG is a pixel ship made of squares (`<rect>`), with the app's colours from `web/art.js`: sail `#e8e4d8`, hull `#5c3a1c`, a sea line `#1e4a72`. Use `shape-rendering="crispEdges"` so the pixels stay sharp.
- It must read well at 16×16 and 32×32. Keep the grid small, for example 16×16 units.

Not in scope: an icon that changes when a ship needs the captain.

## Acceptance

- A test checks that the served page has a `<link rel="icon"` with an `image/svg+xml` data URI.
- `npm test` passes.

Decisions came from the captain on 2026-11-03: pixel ship in the app colours, inline SVG, no state on the icon.

## Result

- `src/page.ts`: new `<link rel="icon">` with an inline SVG data URI. The SVG is built from `<rect>` squares on a 16x16 grid.
- `test/server.test.ts`: new test checks the served page has the icon link with an `image/svg+xml` data URI.
- `npm test`: 213 pass, 0 fail.

Choices where the ticket was silent:
- The icon has a dark `#0d1b2a` background square, so the ship shows on light and dark tab bars.
- The data URI is URL-encoded (`encodeURIComponent`), not base64.
- A small `rect` helper builds the SVG in `page.ts`.
