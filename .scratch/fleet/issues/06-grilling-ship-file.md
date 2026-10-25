# Grilling: the ship file contract

Type: grilling
Status: resolved
Blocked by: 03, 05

## Question

What does the ship file hold (project, title, task link, repos, worktrees, session data, lifecycle state)? Where does it live (the ship folder or each MR folder in `~/.crew`)? When does the first mate write or update it? How does it handle several MRs and several repos? The crew skill owns the contract and fleet only reads it. The sea view needs two things from it: the crew chain in order with each member's state, and a short, readable reason when the ship waits for the captain (see the sea view ticket). It must also give fleet what the lifecycle needs: each MR's link and repo host, so fleet can find `merged`. Fleet keeps the states after crew in its own file, not in this one (see the ship lifecycle ticket). It must keep the newest first-mate Claude session ID current (it changes after `/clear` and after each handoff), and record the fleet name the `/crew` text passes in.

## Answer

**Place.** One file per ship: `~/.crew/<ship>/ship.json`, in the ship folder next to `spec/`. The MR folders (`~/.crew/<ship>-mr<N>/`) stay as they are, because every top-level JSON file there shows as a crew member. crew-board must skip `ship.json`. Crew's "delete the spec folder after the last MR merges" deletes only `spec/`, and `ship.json` stays.

**Fields.**
- `version`: format version.
- `ship`: the folder name.
- `title`.
- `task`: a link or `null`, from any tracker.
- `fleet`.
- `created`.
- `session`: `{ id, updated }`, the newest first-mate Claude session.
- `mrs[]`: one entry per MR, with `n`, `repo` (local main checkout path), `remote` (host and project path, like `gitlab.com/founda/application/xds-viewer-ui`), `worktree`, `branch` and `url` (`null` until the MR opens).

A feature across several repos is MRs with different `repo` values.

**Not in it.** The chain, the crew states and the "Waiting for you" reason come from the status files (`order`, `state`, and `summary`, which `blocked` requires). The states after crew live in fleet's own file. Leave out the crew mode, estimates and the spec path.

**Writer.** A new command `crew-ship` in the crew-board plugin's `bin`, next to `crew-status`. It checks its input. No JSON is written by hand. The first mate calls it at Fetch (create with fleet, title, task and the first MR), at the next MR (add an entry), and at Ship (set the MR `url`). Each call rides on a real command.

**Session ID.** Every `crew-status` call also refreshes `session` in `ship.json` from `CLAUDE_CODE_SESSION_ID`. The first build ticket checks two things: what a sub-agent's Bash call sees, and what happens after `/clear`. If sub-agents get their own ID, `crew-status` skips the refresh when `CLAUDE_CODE_CHILD_SESSION` is set.

**Fleet name.** Fleet's new-ship form passes it in the `/crew` text. If `/crew` starts without one, the first mate asks the captain at Fetch and suggests the repo name.

**Old runs.** Runs with no `ship.json` do not show in fleet. crew-board still shows them.

**Work in the crew repo** (for the spec): the `crew-ship` command, the session refresh in `crew-status`, crew-board skipping `ship.json`, and the crew skill text for Fetch, the next MR and Ship.
