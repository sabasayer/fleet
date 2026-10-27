# Map: fleet v1 build

Label: wayfinder:map

## Destination

Fleet v1 is built as the [spec](spec.md) says. The captain uses it on his own crew ships: he sees them on the sea, jumps back, starts a new ship and moves ships through their life.

## Result

Fleet v1 is built and in use. All eight build tickets are closed; the code is in fleet PRs 1 to 7 (stacked) and crew PR 14. The captain started ENG-711 from fleet on 2026-10-27. Two prototype tickets (09, 10) stay open as polish. Three fixes found in use wait for the `scouts-fleet` crew ship: [Fleet: the sea fits long crews and any window width](issues/11-fleet-sea-fits-long-crews.md) and [Fleet: longer instructions in the new-ship form](issues/12-fleet-new-ship-instructions.md) and [Fleet: keyboard shortcuts for ship actions](issues/13-fleet-keyboard-shortcuts.md).

## Notes

- **This map does the work.** It overrides wayfinder's "plan, don't do" rule. The planning map ([Map: fleet](../fleet/map.md)) ended in the spec. Here the build tickets are the route.
- **Build on Sonnet.** Every build ticket runs on a Sonnet agent, to save usage limits. Start it with `claude --model sonnet` (or a Sonnet sub-agent). Opus only drives the map and the HITL tickets.
- Each build ticket is one `/crew` ship. Follow the build order and the `Blocked by:` lines in each ticket.
- When a build hits a question the spec does not answer, stop. Open a decision ticket here (grilling or research). Do not guess.
- Tracker: local markdown (this folder). Tickets are in `issues/`. A ticket is unblocked when every ticket in its `Blocked by:` line is closed. A session claims a ticket with `Assignee:` before work.
- Words are in `GLOSSARY.md`. Skills: `grilling` and `domain-modeling` for grilling tickets, `prototype` for prototype tickets. Plain language everywhere.

## Decisions so far

- [Crew: the ship file and `crew-ship`](issues/01-crew-ship-file.md): built (crew PR 14); `crew-status` skips the session refresh in sub-agents; `add-mr` numbers MRs itself
- [Fleet: server and plain ship list](issues/02-fleet-server-tracer.md): built (fleet PR 1); `fleets.json` is a flat map; a failed crew member flags the ship in red
- [Fleet: the sea view](issues/03-fleet-sea-view.md): built (fleet PR 2); a ship shows its newest MR with crew; armada click zooms straight to the ship
- [Fleet: the needs-captain and ships panels](issues/04-fleet-panels.md): built (fleet PR 3); panels in their own column; longest wait first; a panel click zooms to the ship
- [Fleet: a ship's life and the harbour](issues/07-fleet-lifecycle.md): built (fleet PR 4); resume clears paused and failed; a state button moves every MR at the current stage; harbour keeps 3 days fixed
- [Fleet: jump back through herdr](issues/05-fleet-jump-back.md): built (fleet PR 5); `agent.focus` switches the herdr view; never resume when the alive check fails
- [Fleet: merged from the repo host and the release check](issues/08-fleet-auto-states.md): built (fleet PR 6); `glab` needs the MR number and `-R`, not the MR URL; check results live in memory
- [Fleet: start a new ship](issues/06-fleet-new-ship.md): built (fleet PR 7); argv to herdr, no shell; fleets.json `repos` fill the form; starting ships match by session ID, since crew may rename the ship

## Not yet specified

- Gaps the build will find: a herdr API call that does not work as the research says, a crew-board helper that does not copy cleanly, the sub-agent session ID rule. Each becomes a ticket when a build hits it.

## Out of scope

The planning map's Out of scope list still holds. The spec's "Not in v1" section repeats it.

Scouts (a session that looks into a bug before any crew run) come after v1 as their own map. Decisions so far are in [Idea: scouts](../fleet/ideas/scouts.md).
