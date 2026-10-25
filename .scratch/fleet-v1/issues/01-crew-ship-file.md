# Crew: the ship file and `crew-ship`

Repo: sabasayer/crew
Status: ready-for-agent
Blocked by:

## What

Spec section 1. Add `crew-ship` to `mods/board/bin`. Make `crew-status` refresh `session` in `ship.json`. Make crew-board (terminal, desktop and `serve`) skip `ship.json`. Update the crew skill: Fetch (ask for the fleet if none was given, create the ship file), the next MR (add an entry), Ship (set `url`), and the spec-folder delete rule.

## First, check

What `CLAUDE_CODE_SESSION_ID` and `CLAUDE_CODE_CHILD_SESSION` show in a sub-agent's Bash call, and after `/clear`. Pick the refresh rule from that, and write the result in the ticket.

## Done when

- `crew-ship` refuses bad input and never needs hand-written JSON.
- A test run writes a valid `ship.json`, and the session ID follows a `/clear`.
- crew-board does not show `ship` as a crew member.
