# Fleet: start a new ship

Repo: sabasayer/fleet
Status: ready-for-agent
Blocked by: 01, 05
Assignee: salih (Sonnet agent)

## What

Spec section 6, new ship: the form (fleet, repo folder from the fleet's past ships or a pasted path, task), the UUID, `agent.start` in the fleet's herdr workspace with `claude --session-id <uuid> -n <ship> "/crew <task> fleet: <fleet>"`, then focus and `open -a Ghostty`. The fallback shows the command to copy. Check the repo folder path on the server before using it.

## Done when

- The captain starts a ship from the form, crew writes its `ship.json`, and the ship shows on the sea with a working jump back.
