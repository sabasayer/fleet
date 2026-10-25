# Grilling: the jump-back and new-ship flows

Type: grilling
Status: resolved
Blocked by: 01

## Question

Using the findings of ticket 01: what exactly happens when the captain clicks a ship to jump back (session alive or gone), and when they click "new ship"? Which method does fleet use in each case? What must fleet know about a ship to do it?

## Answer

Based on [Research: how to jump back to a running crew session](01-research-jump-back.md).

**The ship's session.** Jump back always goes to the newest first-mate session of the ship. Crew members are sub-agents inside it and have no session of their own. Crew keeps that session ID up to date (see the ship file contract). Fleet matches by session ID, never by PID or command line.

**Session alive, in herdr.** Fleet finds the herdr pane whose Claude session ID matches. It checks the default socket and the named-session sockets. It focuses the pane (`agent.focus`), then runs `open -a Ghostty`. Accepted limit: with several Ghostty windows, the wrong one may come to the front. The first build ticket confirms `agent.focus` live on the captain's screen.

**Session alive, outside herdr.** `claude agents --json` shows it, but no herdr pane has it. Fleet shows "running outside herdr" with its folder and PID. It never resumes a session that any source reports as alive, because two copies mix into one transcript.

**Session gone.** Fleet opens a new pane in the ship's worktree and runs `claude --resume <id>`. The pane goes in a herdr workspace per fleet, one tab per ship. Fleet makes the workspace if it is missing.

**New ship.** A form with three fields: fleet (pick one or type a new name), repo folder (pick from the repos that the fleet's ships used, or paste a path), and task (free text or a link). Fleet makes a UUID. It opens a tab in that fleet's herdr workspace, in the repo's main checkout, and runs `claude --session-id <uuid> -n <ship> "/crew <task>"`, with the fleet name in the `/crew` text. It focuses the tab and brings Ghostty to the front. Fleet writes no file: crew's Fetch makes the worktree and the first mate writes the ship file. The ship appears on the sea once that file exists.

**No herdr.** Fleet shows the command with a copy button, for example `cd <worktree> && claude --resume <id>`. No abstraction for several launchers until a second launcher exists.

**Security.** The server listens only on `127.0.0.1`. It rejects requests whose `Origin` or `Host` is not its own. Every action that starts or focuses something needs a random token, which the server puts in the page.
