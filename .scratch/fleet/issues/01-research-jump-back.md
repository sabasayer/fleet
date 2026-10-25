# Research: how to jump back to a running crew session

Type: research
Status: resolved
Blocked by:

## Question

How can fleet take the captain back to a running crew session, and how can it start a new one? The captain runs Claude Code inside herdr inside Ghostty, so focusing a Ghostty tab does not help.

Find out:
- herdr: does it have a CLI, API or socket to list panes, focus a pane, and open a new pane that runs a command in a folder? Can a pane be found from a process ID?
- Claude Code Remote Control and web access: can a local session be opened from claude.ai or another UI? What does that need, and can fleet build a link to it?
- `~/.claude/sessions/<pid>.json`: what does it hold (session ID, cwd, start time)? Is it stable enough to map a ship to a live session?
- `claude --resume <id>` and `claude --continue`: what happens when the original session is still running?
- Any other way to reach a session from a browser app on the same machine.

Output: the options per case (session alive, session gone, new ship), with the limits of each.

## Answer

Findings: [research/jump-back.md](https://github.com/sabasayer/fleet/blob/research/jump-back/.scratch/fleet/research/jump-back.md) on branch `research/jump-back`.

- herdr (0.7.3 installed) has a CLI and a JSON socket (`~/.config/herdr/herdr.sock`). Its Claude `SessionStart` hook knows each pane's Claude session ID (`agent list` → `agent_session.value`).
- Session alive: find the pane by session ID, `agent.focus` it, then `open -a Ghostty`. Never `claude --resume` a live session: the two copies mix into one transcript.
- Session gone: `agent.start` a pane in the ship's folder and run `claude --resume <id>`. Works while the transcript exists (30 days by default).
- New ship: `agent.start` a pane in the repo and run `claude --session-id <uuid> -n <ship> ...`. Fleet makes the UUID, so it knows the session from the start.
- Match ships by session ID, never by PID or command line. The ID changes after `/clear`. `claude agents --json` is the documented list of live sessions.
- Remote Control is a poor fit for v1: the link ID comes from Anthropic's server.
- Not confirmed: `agent.focus` was not tested live; the herdr API differs between versions (read `herdr api schema --json` or pin a version); `open -a Ghostty` cannot pick between several windows.
