# Fleet: server and plain ship list

Repo: sabasayer/fleet
Status: ready-for-agent
Blocked by: 01
Assignee: salih (Sonnet agent)

## What

Spec sections 2 and 3 (read side only). Set up the `crew-fleet` package: Node 22.18 or newer, no dependencies, `node --test`. Start the server on `127.0.0.1:4932` with the origin check and the token. Read `~/.crew`: ship files plus the status files of each MR folder. Read `~/.fleet/fleets.json` if it exists. Serve `/api/state` (fleets → ships → MRs and crew chain, the needs-captain reason) and a plain HTML page that lists it and asks again every 2 seconds.

## Done when

- `npx crew-fleet` (or `node bin` locally) shows real ships grouped by fleet.
- Folders without `ship.json` do not show.
- A request with a wrong `Origin` or no token on an action gets 403.
