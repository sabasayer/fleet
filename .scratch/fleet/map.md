# Map: fleet

Label: wayfinder:map

## Destination

A build-ready spec for fleet v1, plus build tickets that `/crew` can run. Fleet v1 is a local browser app (`npx fleet`). It shows every crew ship on a sea, grouped by project. It lets the captain jump back to a ship's session and start a new ship.

## Notes

- Domain words are in `GLOSSARY.md` (armada, fleet, project, ship, crew member, captain, first mate). Use them.
- Tracker: local markdown (this folder). Repo: `github.com/sabasayer/fleet` (public, personal account `sabasayer`, noreply email).
- Fleet reads crew files and never writes them, like crew-board. Crew owns the contract (`~/Private/crew`, `mods/board/skills/crew/`).
- Start small and build on top, the way crew grew.
- A ship is not tied to any task manager (not only Linear). A project can be one repo, a multi-feature effort in one repo, or one feature across repos.
- The captain runs Claude inside herdr inside Ghostty.
- The captain likes pixel art, but it must be something an AI can build.
- Skills for grilling tickets: `grilling`, `domain-modeling`. Prototype tickets: `prototype`. Use plain language everywhere.

## Decisions so far

- [Grilling: fleet's own files and its server](issues/07-grilling-fleet-files-and-server.md): own repo with copied crew-board helpers; `~/.fleet/ships/<ship>.json` per ship and a hand-edited `~/.fleet/fleets.json` with `release_check`; poll files every 2 s and the repo host every 2 min; `npx crew-fleet` on port 4932, Node 22.18+, no dependencies; no notifications of its own
- [Grilling: the ship file contract](issues/06-grilling-ship-file.md): one `~/.crew/<ship>/ship.json` (title, task, fleet, session, MRs with repo, remote, worktree, branch, url) written by a new `crew-ship` command; `crew-status` refreshes the session ID; chain and waiting reason stay in the status files; old runs are hidden
- [Grilling: the jump-back and new-ship flows](issues/05-grilling-jump-back-new-ship.md): jump to the newest first-mate session by session ID (focus the herdr pane, else resume in a per-fleet herdr workspace, never resume a live one); new ship is a 3-field form that starts `/crew` in herdr; copy-command fallback; localhost-only server with origin check and token
- [Grilling: a ship's life after crew stops](issues/03-grilling-ship-lifecycle.md): fleet owns the states after crew (sailing, in_review, merged, released, testing, done, plus paused, failed, abandoned); merged is found from the repo host; released comes from an optional per-project release check, else by hand; a ship docks only at done
- [Research: how to jump back to a running crew session](issues/01-research-jump-back.md): herdr covers all cases by Claude session ID: focus the live pane, resume in a new pane when gone, start a new pane with a fleet-made session ID; Remote Control does not fit v1
- [Research: pixel-art tooling and rendering for an AI-built sea view](issues/02-research-pixel-tooling.md): live sprites drawn in code (adapted from crew-board), static art with claude-pxl, Canvas 2D with HTML on top; no Aseprite, no PixiJS for v1
- [Prototype: the sea view](issues/04-prototype-sea-view.md): one lane per fleet, one row per ship, one stone per crew member with the ship at the current member; right column has a needs-captain panel and a ships panel with a "Waiting for you" line; keyboard navigation and animated zoom; calm sea

## Not yet specified

- A fleet-level agent, maybe a "vice admiral", that watches and manages crews or fleets: nudges stale crews, starts the next MR, picks the next task. The v1 spec must not block it: the ship file and the actions should work for an agent too.
- Other visual styles, layouts and navigation for the sea view: 3D, low-poly, isometric, text only, board by state, icons, command palette. All are cheap prototypes to try later. The list is in [sea view experiments](ideas/sea-view-experiments.md). The UI can change at any time, so v1 does not wait for them.
- Write the v1 spec and split it into build tickets. This is the last step.

## Out of scope

- Fleet reads or writes mr-triage. Crew handles the mr-triage tasks today.
- Merging mr-triage, review-workspace, crew-board and fleet into one repo. That is its own effort.
- Normal Claude sessions that are not crew ships.
- Approving gates from the browser in v1.
- Fleet's own notifications: crew-board's alerts cover v1. Revisit when the tools merge.
- Starting fleet at login.
