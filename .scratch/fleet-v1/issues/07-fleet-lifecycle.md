# Fleet: a ship's life and the harbour

Repo: sabasayer/fleet
Status: closed
Blocked by: 04
Assignee: salih (Sonnet agent)

## What

Spec sections 3 and 4, plus the harbour part of section 5 (variant G): write `~/.fleet/ships/<ship>.json`; work out each ship's state; the after-crew zones on the lane; the stopped, paused, failed and abandoned looks; the state buttons (with the token); the harbour list with the 3-day hide and "+N hidden". No repo host calls yet: `merged` and `released` are marked by hand in this ticket.

## Done when

- Unit tests cover the state rules, including several MRs and "bug found → back to sea".
- The captain walks one ship from `in_review` to the harbour with the buttons.

## Progress

Built on branch `feat/lifecycle` (from `feat/panels`; commit `b65875c`; not pushed). `npm test`: 53 pass. The demo copies its fleet home to `.demo-home`, so the fixtures stay clean.

Choices the spec left open: "resume" clears both `paused` and `failed`; pause is offered in every state except done and abandoned; a state button moves every MR at the ship's current stage; a ship is `abandoned` only when all its MRs are; "bug found" keeps the ship `sailing` until the new MR shows; the needs-captain flag shows only while sailing; the 3 harbour days are fixed (no day switch).

Merge: conflicts with `feat/jump-back` in `src/page.ts`, `src/server.ts`, `web/main.js`, `web/panel.js`. Fix when both are accepted.

The captain walked a ship from in review to the harbour in the demo and accepted it.
