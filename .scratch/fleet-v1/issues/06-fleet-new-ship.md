# Fleet: start a new ship

Repo: sabasayer/fleet
Status: closed
Blocked by: 01, 05
Assignee: salih (Sonnet agent)

## What

Spec section 6, new ship: the form (fleet, repo folder from the fleet's past ships or a pasted path, task), the UUID, `agent.start` in the fleet's herdr workspace with `claude --session-id <uuid> -n <ship> "/crew <task> fleet: <fleet>"`, then focus and `open -a Ghostty`. The fallback shows the command to copy. Check the repo folder path on the server before using it.

## Done when

- The captain starts a ship from the form, crew writes its `ship.json`, and the ship shows on the sea with a working jump back.

## Progress

Built on branch `feat/new-ship` (from `feat/auto-states`; commits `bc9cd45` fetch the SHA after a hand mark, `0243760` the new-ship form). Not pushed. `npm test`: 134 pass.

Facts: herdr `agent.start` takes `argv: string[]`, so no shell is involved. The copy command quotes every argument, and is tested with quotes, `$()`, backticks and `;`.

Choices: the ship name is a slug of the task (or of a link's last part) plus 4 UUID characters; crew gets the fleet ID, the herdr workspace uses the display name; a worktree path becomes its main checkout; the "starting…" note shows until a ship with that session ID appears, with a hint after 3 minutes. Open: a task that contains `fleet:` could confuse crew.

The captain started a real ship from the form (ENG-711 in FHP): herdr opened the tab, crew wrote `ship.json`, the ship showed on the sea. Fix after the check: the server keeps the "starting" list, so a refresh keeps it. PR: https://github.com/sabasayer/fleet/pull/7.
