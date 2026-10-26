# Map: fleet v1 build

Label: wayfinder:map

## Destination

Fleet v1 is built as the [spec](spec.md) says. The captain uses it on his own crew ships: he sees them on the sea, jumps back, starts a new ship and moves ships through their life.

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

## Not yet specified

- Gaps the build will find: a herdr API call that does not work as the research says, a crew-board helper that does not copy cleanly, the sub-agent session ID rule. Each becomes a ticket when a build hits it.

## Out of scope

The planning map's Out of scope list still holds. The spec's "Not in v1" section repeats it.
