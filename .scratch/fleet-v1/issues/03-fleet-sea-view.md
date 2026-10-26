# Fleet: the sea view

Repo: sabasayer/fleet
Status: ready-for-agent
Blocked by: 02
Assignee: salih (Sonnet agent)

## What

Spec section 5, the sea only: lanes, rows, crew stones, the ship sprite with crew faces, the three zoom levels with the 450 ms tween, keyboard navigation, the breadcrumb and the needs-captain `!`. Port it from `prototype/sea-view.html` (branch `prototype/sea-view`, variant D). Copy the hats, faces and state colours from crew-board's `hooks/ship.ts`. Use real data from `/api/state`.

## Done when

- The captain checks it in the browser with real ships and says it matches variant D.
- Pixels stay crisp on a Retina screen at every zoom level.
