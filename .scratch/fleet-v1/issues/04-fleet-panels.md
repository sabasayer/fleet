# Fleet: the needs-captain and ships panels

Repo: sabasayer/fleet
Status: closed
Blocked by: 03
Assignee: salih (Sonnet agent)

## What

Spec section 5, the right column: the needs-captain panel, the ships panel (needs-captain first, crew state bars, "Waiting for you" line) and the open-ship view (goal, MR count, crew table). Leave places for the state buttons and "jump back", which come in later tickets. Keep the panel in step with the keyboard cursor, as in the prototype.

## Done when

- The captain checks it with a ship blocked on a gate and a ship with a failed member.

## Progress

Built on branch `feat/panels` (from `feat/sea-view`; commit `8c7493b`; not pushed). `npm test`: 26 pass.

Choices: the panels sit in the right grid column, not over the sea; the needs-captain list covers all fleets, the ships list follows the zoom; both sort by longest wait; a click on a panel row zooms the sea to that ship (same as an armada click); the task shows as a link only when it is a URL (the ship file says `task` is a link or `null`); a stale member shows "(stale)" in red; several MRs show one crew (the newest), as on the sea, until "Prototype: ship zoom with several MRs" decides.

The captain checked the look in the browser and accepted it.
