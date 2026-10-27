# Fleet: the sea view

Repo: sabasayer/fleet
Status: closed
Blocked by: 02
Assignee: salih (Sonnet agent)

## What

Spec section 5, the sea only: lanes, rows, crew stones, the ship sprite with crew faces, the three zoom levels with the 450 ms tween, keyboard navigation, the breadcrumb and the needs-captain `!`. Port it from [`.scratch/fleet/prototype/sea-view.html`](../../fleet/prototype/sea-view.html) (variant D). Copy the hats, faces and state colours from crew-board's `hooks/ship.ts`. Use real data from `/api/state`.

## Done when

- The captain checks it in the browser with real ships and says it matches variant D.
- Pixels stay crisp on a Retina screen at every zoom level.

## Progress

Built on branch `feat/sea-view` (from `feat/server`; commits `607350e`, `a97e53d`, `8e61249`; not pushed). `npm test`: 21 pass. `npm run demo` serves sample ships from `fixtures/demo/`.

Changes from variant D: the `!` and flag are red when a member failed; a stale member is red and does not hop; pixel sizes round to whole device pixels; the right column is a grid column, not an overlay; the cursor row scrolls into view.

Captain accepted the look and chose: a ship shows its newest MR with crew; a ship whose crew is done sits at the end of its row until the lifecycle ticket; a click in the armada zooms straight to the ship.
