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

## Progress

Built on branch `feat/jump-back` (from `feat/panels`; commits `3a0bddf`, `e086a70`, `cf483e0`; not pushed). `npm test`: 60 pass. Only read-only herdr calls were made.

Facts: herdr 0.7.3, protocol 16, one socket `~/.config/herdr/herdr.sock`. `agent.list` gives `agent_session.value` (the session ID) and pane, tab and workspace IDs. `claude agents --json` gives `pid`, `sessionId`, `cwd`.

Choices: `claude agents --json` is the final check that a session is gone; if it fails, fleet shows the command and does not resume. The herdr workspace label is the fleet's display name. Resume uses the newest MR worktree that still exists. A tab with the ship's name is reused.

Waiting on the captain: live checks (live ship, gone ship, outside herdr, herdr stopped) and whether `agent.focus` switches the attached herdr view.
