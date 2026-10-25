# Research: how to jump back to a running crew session

Type: research
Status: open
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
