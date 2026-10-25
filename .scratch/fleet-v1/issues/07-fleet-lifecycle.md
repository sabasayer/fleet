# Fleet: a ship's life and the harbour

Repo: sabasayer/fleet
Status: ready-for-agent
Blocked by: 04

## What

Spec sections 3 and 4, plus the harbour part of section 5 (variant G): write `~/.fleet/ships/<ship>.json`; work out each ship's state; the after-crew zones on the lane; the stopped, paused, failed and abandoned looks; the state buttons (with the token); the harbour list with the 3-day hide and "+N hidden". No repo host calls yet: `merged` and `released` are marked by hand in this ticket.

## Done when

- Unit tests cover the state rules, including several MRs and "bug found → back to sea".
- The captain walks one ship from `in_review` to the harbour with the buttons.
