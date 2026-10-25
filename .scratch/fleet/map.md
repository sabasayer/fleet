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

- [Research: pixel-art tooling and rendering for an AI-built sea view](issues/02-research-pixel-tooling.md): live sprites drawn in code (adapted from crew-board), static art with claude-pxl, Canvas 2D with HTML on top; no Aseprite, no PixiJS for v1

## Not yet specified

- Server and data shape, and the UI stack. This comes after the sea view prototype.
- The harbour and docked look of finished ships. This follows from the ship lifecycle ticket.
- A fleet-level agent, maybe a "vice admiral", that watches and manages crews or fleets: nudges stale crews, starts the next MR, picks the next task. The v1 spec must not block it: the ship file and the actions should work for an agent too.
- macOS notifications when a ship needs the captain.
- An optional project config for display names and colours.
- Write the v1 spec and split it into build tickets. This is the last step.

## Out of scope

- Fleet reads or writes mr-triage. Crew handles the mr-triage tasks today.
- Merging mr-triage, review-workspace, crew-board and fleet into one repo. That is its own effort.
- Normal Claude sessions that are not crew ships.
- Approving gates from the browser in v1.
