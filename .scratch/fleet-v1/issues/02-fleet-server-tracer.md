# Fleet: server and plain ship list

Repo: sabasayer/fleet
Status: closed
Blocked by: 01
Assignee: salih (Sonnet agent)

## What

Spec sections 2 and 3 (read side only). Set up the `crew-fleet` package: Node 22.18 or newer, no dependencies, `node --test`. Start the server on `127.0.0.1:4932` with the origin check and the token. Read `~/.crew`: ship files plus the status files of each MR folder. Read `~/.fleet/fleets.json` if it exists. Serve `/api/state` (fleets → ships → MRs and crew chain, the needs-captain reason) and a plain HTML page that lists it and asks again every 2 seconds.

## Done when

- `npx crew-fleet` (or `node bin` locally) shows real ships grouped by fleet.
- Folders without `ship.json` do not show.
- A request with a wrong `Origin` or no token on an action gets 403.

## Progress

Built on branch `feat/server` (commit `bf96203`, not pushed). `node --test`: 10 pass. Checked by hand: page 200, wrong `Origin` 403, POST without token 403.

Choices the spec left open: `CREW_FLEET_HOME` overrides `~/.fleet`; MR folders match without case; a crew member `running` for over 15 minutes is `stale`; a broken status file shows as `unreadable`; the token goes in the `x-fleet-token` header.

Captain decided: `fleets.json` is a flat map (fleet → name, color, release_check); a failed crew member flags the ship too, in red (spec section 4 updated). PR: https://github.com/sabasayer/fleet/pull/1. Checking with real ships waits for crew PR 14.
