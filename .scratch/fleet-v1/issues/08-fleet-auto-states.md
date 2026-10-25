# Fleet: merged from the repo host and the release check

Repo: sabasayer/fleet
Status: ready-for-agent
Blocked by: 07

## What

Spec section 4, the automatic steps: every 2 minutes, ask `glab` or `gh` about MRs in `in_review` (merged with its SHA, or closed → `abandoned`). Run each fleet's `release_check` for merged MRs with the `FLEET_*` variables and a 60-second limit. Stop polling an MR once it moves on. Keep the "mark" buttons for when no CLI works or no check is set. Write the README part on `fleets.json` and `release_check`, with an example, so an agent can edit the file.

## Done when

- A merged test MR moves to `merged` by itself, and a release check that exits 0 moves it to `released`.
- A check that hangs is stopped at 60 seconds and does not block other ships.
