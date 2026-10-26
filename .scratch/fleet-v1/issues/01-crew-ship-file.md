# Crew: the ship file and `crew-ship`

Repo: sabasayer/crew
Status: closed
Blocked by:
Assignee: salih (Sonnet agent)

## What

Spec section 1. Add `crew-ship` to `mods/board/bin`. Make `crew-status` refresh `session` in `ship.json`. Make crew-board (terminal, desktop and `serve`) skip `ship.json`. Update the crew skill: Fetch (ask for the fleet if none was given, create the ship file), the next MR (add an entry), Ship (set `url`), and the spec-folder delete rule.

## First, check

What `CLAUDE_CODE_SESSION_ID` and `CLAUDE_CODE_CHILD_SESSION` show in a sub-agent's Bash call, and after `/clear`. Pick the refresh rule from that, and write the result in the ticket.

## Done when

- `crew-ship` refuses bad input and never needs hand-written JSON.
- A test run writes a valid `ship.json`, and the session ID follows a `/clear`.
- crew-board does not show `ship` as a crew member.

## Progress

Built on branch `feat/ship-file` in crew (commit `0f381ca`, not pushed). Tests pass: `claude plugin test mods/board` (17) and `python3 mods/board/test/crew_ship_test.py` (4).

Check result: in a sub-agent's Bash, `CLAUDE_CODE_SESSION_ID` is set and `CLAUDE_CODE_CHILD_SESSION=1`. Rule: `crew-status` skips the session refresh when `CLAUDE_CODE_CHILD_SESSION` is set.

Choices the spec left open: `crew-ship add-mr` numbers the MR itself; `session` is `null` when the ID is missing; `crew-status` finds the ship folder by dropping `-mr<N>` from the run folder name.

The captain checked both by hand: the session ID changes after `/clear`, and crew-board does not show `ship`. PR: https://github.com/sabasayer/crew/pull/14

Later fact: a sub-agent sees the same `CLAUDE_CODE_SESSION_ID` as its parent. So the skip on `CLAUDE_CODE_CHILD_SESSION` is needed, not only safe.
