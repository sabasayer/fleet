# Fleet: start a new ship

Repo: sabasayer/fleet
Status: ready-for-agent
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

Waiting on the captain: one real start. It needs crew PR 14 in `~/Private/crew` first, because `~/.claude/skills/crew` links there and that checkout is on `fix/crew-cost-caps`.
