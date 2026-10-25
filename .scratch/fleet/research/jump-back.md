# Research: how to jump back to a crew session

Ticket: `.scratch/fleet/issues/01-research-jump-back.md`
Checked on: 2026-10-25, on the captain's Mac.
Versions: Claude Code 2.1.310, herdr 0.7.3.

## Short answer

Use herdr for everything. Do not use Ghostty, Remote Control or `--resume` to reach a live session.

- **Session alive:** find the herdr pane whose Claude session ID matches the ship. Focus that pane. Then bring Ghostty to the front.
- **Session gone:** open a new herdr pane in the ship's folder. Run `claude --resume <session-id>` in it.
- **New ship:** open a new herdr pane in the ship's folder. Run `claude --session-id <new-uuid> -n <ship-name> ...` in it. Fleet makes the UUID, so it knows the session ID from the start.

herdr already knows the Claude session ID of every pane. This makes the mapping easy.

## What we found

### 1. herdr has a full CLI and a socket API

herdr is installed at `~/.local/bin/herdr`.
The CLI and the socket API are the same surface (herdr.dev home page: "The CLI and the socket API are the same surface agents drive").

The socket:
- Path: `~/.config/herdr/herdr.sock`. `herdr status` prints it. Named sessions use `~/.config/herdr/sessions/<name>/herdr.sock`. [Socket API]
- Wire format: newline-delimited JSON (one JSON object per line). Request: `{"id":"req_1","method":"agent.list","params":{}}`. The reply echoes the `id`. [Socket API]
- Events: `events.subscribe` pushes changes, such as `pane.agent_status_changed`. If a subscriber falls behind, herdr drops the subscription. Then the client must subscribe again and reload state with `session.snapshot`. [Socket API]
- Schema: `herdr api schema --json` prints the schema for the installed version. Clients "should ignore unknown fields and handle unsupported methods as normal errors". [Socket API]
- The docs say nothing about access control on the socket. Treat it as local-user only (file permissions).

Methods fleet needs (all present in the installed 0.7.3 schema):

| Need | Method | CLI |
| - | - | - |
| List Claude panes | `agent.list` | `herdr agent list` |
| Focus a pane | `agent.focus` (`{target}`) or `pane.focus` | `herdr agent focus <target>` |
| Open a pane that runs a command in a folder | `agent.start` | `herdr agent start <name> --cwd PATH -- <argv...>` |
| Open an empty tab in a folder | `tab.create` (`cwd`, `label`, `focus`) | `herdr tab create --cwd PATH` |
| Get the processes in a pane | `pane.process_info` | `herdr pane process-info --pane ID` |
| Watch status | `events.subscribe` | `herdr wait ...` |

`agent.start` params in 0.7.3: `name`, `argv` (required), `cwd`, `env`, `workspace_id`, `tab_id`, `split`, `focus` (default `false`).

**Version warning.** The online CLI reference already shows a newer `agent start` form: `herdr agent start <name> --kind KIND --pane ID [-- <agent-args...>]`. It "activates an existing available shell pane". The installed 0.7.3 form is different. Fleet must read `herdr api schema --json` or pin a herdr version. [CLI reference]

#### Each Claude pane carries its session ID

`herdr agent list` returns one entry per Claude pane. Each entry has:
`agent` (`claude`), `agent_session.value` (the Claude session UUID), `agent_status` (`idle`, `working`, `blocked`, `done`, `unknown`), `cwd`, `foreground_cwd`, `focused`, `pane_id`, `tab_id`, `terminal_id`, `workspace_id`.

On this machine, every live Claude pane had an `agent_session.value` that matched the `sessionId` in `~/.claude/sessions/<pid>.json`.

How herdr gets it: the herdr Claude integration installs a `SessionStart` hook (`~/.claude/hooks/herdr-agent-state.sh`). The hook reads `session_id` and `transcript_path` from the hook input. It sends them to herdr with `pane.report_agent_session`. It only runs inside herdr (`HERDR_ENV=1`, `HERDR_PANE_ID`, `HERDR_SOCKET_PATH` set). `herdr integration status` shows `claude: current (v7)`.

Because `SessionStart` also fires after `/clear` and on resume, herdr follows the session ID when it changes.

#### Finding a pane from a process ID

There is no "pane for this PID" call. Two ways work:
- Best: match on session ID. Read the ship's session ID, then pick the `agent.list` entry with the same `agent_session.value`.
- Fallback: call `pane.process_info` for each pane. It returns `foreground_process_group_id` and `foreground_processes[]`, each with `pid`, `argv` and `cwd`. On this machine the Claude PID was the foreground process group ID.

`agent.focus` takes a `target`. Targets "accept terminal ids, unique agent names, detected/reported agent labels, and legacy pane ids" (`herdr agent --help`). A session ID is not a target. So fleet must look it up first.

#### Restore after restart

herdr restores layouts after a restart. For Claude it runs `claude --resume <id>` in each pane that reported a session ID. This is on by default (`resume_agents_on_restore = false` turns it off). Stale or missing IDs come back as plain shells in the saved folder. [Session state]

This is why one live pane on this machine shows `claude --resume 27345246-...` in its process list, while its current session ID is `136f8112-...`. The ID changed after the restore (for example by `/clear`). **The command line of a Claude process is not a safe source for its session ID.** Use herdr or the session file.

#### Tested

In a new, unfocused workspace, this worked:

```
herdr agent start fleettest --cwd /Users/salihsayer/Private/fleet --workspace w4 --no-focus -- sh -c '...'
```

The pane opened in the given folder. It did not take focus. `herdr agent get fleettest` found it by name. The test workspace was then closed.

Not tested (it would move the captain's screen): what `agent.focus` does to an attached herdr client. The docs only say focus "marks the target seen". The expected result is that the attached herdr view switches to that pane. Confirm this in a prototype.

### 2. Ghostty: herdr does not raise the window

herdr runs inside one Ghostty window. Focusing a herdr pane changes what herdr shows. It does not bring Ghostty to the front. The herdr docs do not mention raising the terminal window. [CLI reference]

So fleet needs a second step on macOS: `open -a Ghostty`. This brings the Ghostty app to the front (macOS `open` command, `-a` opens the named application). If the captain has more than one Ghostty window, this cannot pick the herdr window. That is a limit to accept for v1.

### 3. `~/.claude/sessions/<pid>.json`

Claude Code documents this folder: it "holds one small file per running session, used to detect concurrent sessions and crashes. It isn't part of the age-based sweep: Claude Code removes each file when its session exits and clears crash leftovers on the next launch." [.claude directory]

The file format itself is not documented. It can change in any release.

Fields seen on this machine (no values copied here):

| Field | Meaning |
| - | - |
| `pid` | Process ID (same as the file name) |
| `sessionId` | Current Claude session UUID |
| `cwd` | Working folder |
| `startedAt` | Start time, Unix milliseconds |
| `procStart` | Process start time as text (helps spot a reused PID) |
| `version` | Claude Code version |
| `kind` | `interactive` (or background) |
| `entrypoint` | `cli` |
| `name`, `nameSource`, `nameSince` | Display name (`derived` like `crew-2a`, or `auto` from a title) |
| `status`, `statusUpdatedAt`, `updatedAt` | `busy`, `idle`, `shell`, ... |
| `messagingSocketPath` | A socket like `/tmp/cc-socks/<pid>.sock` |
| `peerProtocol`, `peerFeatures` | For peer messaging between sessions (undocumented) |
| `pidDomain` | `darwin` |

Each `<pid>.json` has a sibling `<pid>.<hash>.key` file. It is a secret. Fleet must never read it or show it.

**Better source: `claude agents --json`.** This is the documented form of the same data. It prints "every live session", interactive ones included, with `pid`, `cwd`, `kind`, `startedAt`, `sessionId`, `name`, `status` (`busy`, `waiting`, `idle`) and `waitingFor`. [Agent view] On this machine its output matched the session files exactly. Fleet should prefer it, or herdr `agent.list`, over reading the files.

Is it stable enough to map a ship to a live session? Yes, with one rule: **map by session ID, not by PID.** The session ID can change inside one process (after `/clear`, or `/resume` from inside). The crew ship file should record the session ID, and fleet should match it against live sessions each time.

### 4. `claude --resume` and `claude --continue` on a live session

Do not run them on a session that is still open in a terminal.

- "If you resume the same session in two terminals without forking, messages from both interleave into one transcript." [Sessions]
- `--fork-session` makes a copy with a new session ID instead. [Sessions]
- The special case: if the session is a **background** session (`claude --bg`), `claude --resume <id>` attaches to the running session instead of loading a second copy. This needs v2.1.285 or later. It does not apply to normal foreground sessions in herdr. [Sessions]
- `claude --continue` opens the newest session in the current folder. It skips background sessions that still run. [Sessions] It is a guess, so fleet should always pass an explicit ID.
- `claude --resume <id>` works from any folder. It searches the current project, then all projects. [Sessions]
- Transcripts live at `~/.claude/projects/<project>/<session-id>.jsonl`. They are deleted after `cleanupPeriodDays` (default 30 days). After that, resume fails with `No conversation found with session ID`. [Sessions], [.claude directory]
- On resume, Claude Code restores the permission mode, except `bypassPermissions`. Flags like `--mcp-config`, `--settings` and `--add-dir` are not restored. [Sessions]
- `claude --session-id <uuid>` starts a new session with a set ID (`claude --help`).
- `claude -n <name>` sets a display name. `claude --resume <name>` works only for a name you set, not for the default display name like `crew-2a`. [Sessions]

### 5. Remote Control and claude.ai/code

Remote Control connects claude.ai/code or the Claude mobile app to a session that runs on this Mac. [Remote Control]

How to turn it on:
- `claude --remote-control [name]` (or `--rc`) at start.
- `/remote-control` (or `/rc`) inside a running session.
- For every session: `remoteControlAtStartup: true` in `~/.claude/settings.json`, or "Enable Remote Control for all sessions" in `/config`. Each interactive process then registers one remote session.

What it needs:
- A Pro, Max, Team or Enterprise plan. "API keys are not supported." On Team and Enterprise, an Owner must turn it on.
- A claude.ai login. It does not work with `ANTHROPIC_BASE_URL` pointing at a gateway, or with Zero Data Retention or HIPAA setups.
- The local `claude` process must keep running.
- A one-time confirmation the first time.

The link:
- The session URL is `claude.ai/code/<remote-id>`. "The ID is the part of the session's URL at claude.ai/code between `/code/` and any `?`." [Remote Control]
- This remote ID comes from the Anthropic server. It is not the local session ID. **Fleet cannot build the link from local data.**
- Claude Code shows the URL in the terminal and "posts the session URL in the conversation". Fleet could only get it by parsing the transcript. The transcript format "is internal to Claude Code and changes between versions". [Sessions] No local session file on this machine had a Remote Control field. Remote Control has never been used here.

Limits:
- One remote session per interactive process.
- The transcript is stored on Anthropic servers while connected.
- Some commands only work in the terminal, such as `/resume` and `/plugin`.
- If you resume the same conversation in a second terminal, Remote Control stays with the first one.

Verdict: Remote Control is good for the phone. It is a poor fit for fleet v1 on the same Mac. It adds a cloud hop, needs a setting change, and fleet cannot get the link in a stable way. Fleet could later show "open on claude.ai/code" as a plain link to the session list.

### 6. Other ways to reach a session

- **Claude Desktop:** `claude --desktop --resume <id>` opens a session in the Desktop app (`claude --help`). On a live terminal session this is a second copy, so the interleave problem applies.
- **Background sessions:** `claude --bg`, `claude attach <id>`, `claude agents`. A background session can be opened from any terminal. But crew runs as foreground sessions in herdr, and herdr already gives this. Not needed for v1.
- **Peer socket:** each session has `messagingSocketPath` (`/tmp/cc-socks/<pid>.sock`) and `peerProtocol`. This is undocumented. Do not build on it.
- **Send text to a pane:** herdr `agent.send` / `pane.send_text` can type into a session. This is useful later for a "vice admiral" agent. It is not "jump back".
- **Read a pane:** herdr `agent.read` / `pane.read` returns the visible or recent text of a pane. Fleet could show a preview without leaving the browser.

## Options per case

### Case A: session alive

**Option A1 (recommended): herdr focus, then raise Ghostty.**
1. Get the ship's session ID from the crew ship file.
2. Call `agent.list`. Find the entry with `agent_session.value` equal to the session ID.
3. Call `agent.focus` with its `terminal_id`.
4. Run `open -a Ghostty`.

Needs: herdr running with the Claude integration installed. The fleet server runs on the same Mac as the same user, so it can reach the socket.
Limits: herdr CLI changes between versions, so read the schema. `open -a` cannot pick one of several Ghostty windows. The effect of focus on an attached client is not yet tested. If the session is not in herdr (for example a plain Ghostty tab), herdr does not know it. Then fleet can only show the folder and the session ID.

**Option A2: Remote Control link.** Not recommended. See section 5.

**Do not:** run `claude --resume <id>` on a live session.

### Case B: session gone

How fleet knows: the session ID is in no `agent.list` entry, and in no `claude agents --json` entry.

**Option B1 (recommended): resume in a new herdr pane.**
`agent.start` with `name` = ship name, `cwd` = ship folder, `argv` = `["claude", "--resume", "<session-id>"]`, `focus: true`. Then `open -a Ghostty`.

Needs: the transcript still on disk (under 30 days by default). The folder still exists (Claude Code falls back to the current folder if not).
Limits: flags from the first start, such as `--add-dir` or `--mcp-config`, are not restored. `bypassPermissions` mode is not restored. Check right before the start that the session is really gone, to avoid two copies.

**Option B2: show a copy command.** Fleet shows `cd <folder> && claude --resume <id>` with a copy button. Use this when herdr is not running.

### Case C: new ship

**Option C1 (recommended): new herdr pane with a set session ID.**
1. Fleet makes a new UUID.
2. `agent.start` with `name` = ship name, `cwd` = repo folder, `argv` = `["claude", "--session-id", "<uuid>", "-n", "<ship-name>", "<first prompt, for example the /crew command>"]`, `focus: true`.
3. `open -a Ghostty`.

Needs: herdr running. A place to put the pane: a workspace or tab per fleet (project) would fit the sea view.
Limits: the session ID can still change later (`/clear`). So crew should keep the ship file's session ID up to date. Fleet must not write crew files. If crew does not record it, fleet can follow the change through herdr: the pane stays the same while `agent_session.value` changes.
Note: how a positional prompt behaves with `/crew` should be checked in the grilling ticket for new ships.

**Option C2: `tab.create` with `cwd`, then `herdr pane run <pane_id> "<command>"`.** (The schema has no `pane.run` method. The CLI types the text and presses Enter, likely through `pane.send_input`.) Same result in two calls. Use it if `agent.start` changes shape in a newer herdr.

**Option C3: show a copy command.** Fallback when herdr is not running.

## Open points for the grilling tickets

- Does crew write the first mate's session ID into the ship file? Fleet needs it, and it must follow `/clear`.
- Where does a new ship's pane go: a new tab, a new workspace per project, or a split?
- Confirm in a prototype that `agent.focus` switches the attached herdr view.
- Pin a herdr version, or code against `herdr api schema --json`.

## Sources

- [Socket API] herdr docs, https://herdr.dev/docs/socket-api/
- [CLI reference] herdr docs, https://herdr.dev/docs/cli-reference/
- [Session state] herdr docs, https://herdr.dev/docs/session-state/
- herdr agent automation, https://herdr.dev/docs/agent-automation/
- herdr home page, https://herdr.dev , repo https://github.com/herdrdev/herdr
- Local: `herdr --help`, `herdr pane|agent|tab --help`, `herdr api schema --json`, `herdr agent list`, `herdr pane process-info`, `herdr integration status`, `~/.claude/hooks/herdr-agent-state.sh` (herdr 0.7.3)
- [Remote Control] Claude Code docs, https://code.claude.com/docs/en/remote-control
- [Sessions] Claude Code docs, https://code.claude.com/docs/en/sessions
- [Agent view] Claude Code docs, https://code.claude.com/docs/en/agent-view
- [.claude directory] Claude Code docs, https://code.claude.com/docs/en/claude-directory
- Local: `claude --help`, `claude agents --json`, `~/.claude/sessions/*.json` (Claude Code 2.1.310)
- macOS `open` command (`man open`, `-a application`)
