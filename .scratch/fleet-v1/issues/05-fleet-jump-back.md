# Fleet: jump back through herdr

Repo: sabasayer/fleet
Status: ready-for-agent
Blocked by: 04
Assignee: salih (Sonnet agent)

## What

Spec section 6, jump back: talk to the herdr socket (newline-delimited JSON), check `herdr api schema --json`, find the pane by session ID across sockets, focus it, and run `open -a Ghostty`. Detect "running outside herdr" with `claude agents --json`. Resume a gone session in the fleet's herdr workspace. Show the copy-command fallback when herdr does not answer. The "jump back" button needs the token.

## First, check

With the captain watching: does `agent.focus` switch the attached herdr view? Write the result in the ticket.

## Done when

- The captain jumps to a live ship, to a gone ship, and sees the fallback with herdr stopped.
- Fleet never runs `--resume` on a session that any source reports as alive.
