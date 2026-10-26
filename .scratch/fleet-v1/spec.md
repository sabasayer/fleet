# Spec: fleet v1

Status: ready-for-agent
Map: [../fleet/map.md](../fleet/map.md). Each section links the ticket that holds the full decision. Words follow [GLOSSARY.md](../../GLOSSARY.md).

## What it is

Fleet is a local browser app, started with `npx crew-fleet`. It shows every crew ship on a sea, grouped by fleet (project). The captain can see which ships need them, jump back to a ship's Claude session, start a new ship, and move a ship through its life after the crew stops.

## Parts

Fleet v1 needs work in two repos.

- **crew** (`sabasayer/crew`): the ship file and the command that writes it.
- **fleet** (`sabasayer/fleet`): the server and the page.

## 1. The ship file (crew repo)

Decision: [Grilling: the ship file contract](../fleet/issues/06-grilling-ship-file.md).

- One file per ship: `~/.crew/<ship>/ship.json`, next to `spec/`. MR folders (`~/.crew/<ship>-mr<N>/`) do not change.
- Fields: `version`, `ship`, `title`, `task` (link or `null`), `fleet`, `created`, `session: { id, updated }`, `mrs[]` with `n`, `repo`, `remote`, `worktree`, `branch`, `url`.
- A new command `crew-ship` (plugin `bin`, next to `crew-status`) writes it. It checks its input. The first mate calls it at Fetch, at each next MR, and at Ship.
- Every `crew-status` call refreshes `session` from `CLAUDE_CODE_SESSION_ID`. It skips the refresh in a sub-agent if sub-agents get their own ID.
- crew-board skips `ship.json`. Deleting the spec folder keeps `ship.json`.
- If `/crew` gets no fleet name, the first mate asks the captain at Fetch and suggests the repo name.
- Chain, crew states and the waiting reason stay in the status files.

## 2. Server (fleet repo)

Decision: [Grilling: fleet's own files and its server](../fleet/issues/07-grilling-fleet-files-and-server.md).

- npm package `crew-fleet`. Node 22.18 or newer, no dependencies, runs `.ts` directly. Port `4932`, `--port` to change. Runs in the foreground.
- Copies the crew-board helpers it needs (status file parsing, stale check, chain order, hats and faces). It does not import crew-board.
- Reads `~/.crew` (and `CREW_BOARD_ROOT` if set) every 2 seconds. Shows only ships with a `ship.json`.
- The page asks `/api/state` for new data every 2 seconds.
- Security (from [Grilling: the jump-back and new-ship flows](../fleet/issues/05-grilling-jump-back-new-ship.md)): listen on `127.0.0.1` only; reject requests whose `Origin` or `Host` is not fleet's own; every action needs a random token that the server puts in the page.

## 3. Fleet's own files

- `~/.fleet/ships/<ship>.json`, written only by the server: each MR's after-crew state, merge SHA and change time; the ship flags `paused` and `failed`; `docked` (the time it reached `done`).
- `~/.fleet/fleets.json`, edited by the captain or an agent: per fleet a display name, a colour and `release_check`. A fleet with no entry gets its name from the ship file and a colour made from that name. The README describes the format.

## 4. A ship's life

Decision: [Grilling: a ship's life after crew stops](../fleet/issues/03-grilling-ship-lifecycle.md).

- States: `sailing`, `in_review`, `merged`, `released`, `testing`, `done`, plus `paused`, `failed`, `abandoned`. "Needs captain" is a flag on a sailing ship: a crew member is `blocked` or `failed` (red when failed). The ship stays `sailing`.
- `sailing` → `in_review`: automatic, when every crew member is `done` and an MR `url` exists.
- `in_review` → `merged` or `abandoned`: automatic. Fleet asks `glab` or `gh` every 2 minutes for MRs in `in_review`. If no CLI works, the captain marks it.
- `merged` → `released`: the fleet's `release_check` runs every 2 minutes for merged MRs, with `FLEET_SHA`, `FLEET_REPO`, `FLEET_REMOTE`, `FLEET_BRANCH` and `FLEET_MR_URL` set and a 60-second limit. Exit code 0 means released. No check means the captain marks it. Fleet never guesses from the main pipeline.
- `released` → `testing` → `done`, `paused`, `failed`: the captain. A failed crew member does not fail the ship.
- Several MRs: the ship takes the state of its least advanced MR. It is `done` only when every MR is `done`. A bug found in testing starts a new MR, and the ship goes back to `sailing`.

## 5. The page

Decisions: [Prototype: the sea view](../fleet/issues/04-prototype-sea-view.md) (variant D) and [Prototype: the harbour and a ship whose crew stopped](../fleet/issues/08-prototype-harbour.md) (variant G). The reference is `prototype/sea-view.html` on branch `prototype/sea-view` (`?variant=G`). Rendering follows [Research: pixel-art tooling](../fleet/issues/02-research-pixel-tooling.md): Canvas 2D with HTML on top, sprites drawn in code, whole-number pixel scale, sized by `devicePixelRatio`.

- **Sea.** One lane per fleet. One row per ship. Left part "crew at work": one stone per crew member in chain order, coloured by state, and the ship on the stone of the member who works now. Right part: four labelled zones (in review, merged, released, testing). A ship whose crew stopped sits in its zone.
- **Zoom.** Armada (all lanes, small ships), fleet (one lane, role names), ship (one row, crew faces). Click or `→`/`Enter` zooms in, `←`/`Esc` zooms out, `↑`/`↓` move the cursor. A breadcrumb shows the level. Every change tweens for about 450 ms.
- **Ship looks.** Crew at work: sail up, running crew hop. Crew stopped: sail rolled up, flag at half-mast, a "waiting on" tag. `paused`: dimmed, with an anchor. `failed`: red flag, stays until the captain acts. `abandoned`: grey wreck that hides like done ships. Needs captain: a blinking gold `!` and a gold flag (red when a member failed).
- **Right column.** At the top, a needs-captain panel with each waiting ship and its reason. Below it, a ships panel: needs-captain ships first, a bar of crew states per row, and a "Waiting for you: <reason>" line. An open ship shows the goal, the MR count, the crew table, the state buttons and "jump back".
- **Harbour.** Done ships leave the sea and list in a harbour part of the panel for 3 days, then hide behind "+N hidden".
- **State buttons.** Mark merged, mark released, start testing, done, bug found → back to sea, pause, resume, mark failed, undock. Each one shows only when it applies.

## 6. Jump back and new ship

Decision: [Grilling: the jump-back and new-ship flows](../fleet/issues/05-grilling-jump-back-new-ship.md), based on [Research: how to jump back](../fleet/issues/01-research-jump-back.md).

- The target is the ship's `session.id`. Match by session ID only.
- Alive in herdr: find the pane in `agent.list` (default socket and named-session sockets), `agent.focus` it, then `open -a Ghostty`.
- Alive outside herdr (`claude agents --json` lists it, herdr does not): show "running outside herdr" with folder and PID. Never resume it.
- Gone: `agent.start` a pane in the ship's worktree, in a herdr workspace per fleet (created if missing), one tab per ship, running `claude --resume <id>`.
- New ship: a form with fleet, repo folder and task. Fleet makes a UUID and starts `claude --session-id <uuid> -n <ship> "/crew <task> fleet: <fleet>"` in the fleet's herdr workspace, in the repo's main checkout. It focuses the tab and brings Ghostty to the front. Fleet writes no file. The ship shows once crew writes `ship.json`.
- No herdr: show the command with a copy button.
- Read `herdr api schema --json` and fail clearly on an unsupported herdr version.

## Not in v1

Approving gates from the browser, fleet's own notifications, starting at login, mr-triage, other visual styles, the vice admiral. The map's Out of scope and Not yet specified lists hold the reasons. Keep the ship file and the server actions usable by a future agent.

## Build tickets

In `issues/`, in build order. Each one is one `/crew` ship.

1. [Crew: the ship file and `crew-ship`](issues/01-crew-ship-file.md)
2. [Fleet: server and plain ship list](issues/02-fleet-server-tracer.md)
3. [Fleet: the sea view](issues/03-fleet-sea-view.md)
4. [Fleet: the needs-captain and ships panels](issues/04-fleet-panels.md)
5. [Fleet: jump back through herdr](issues/05-fleet-jump-back.md)
6. [Fleet: start a new ship](issues/06-fleet-new-ship.md)
7. [Fleet: a ship's life and the harbour](issues/07-fleet-lifecycle.md)
8. [Fleet: merged from the repo host and the release check](issues/08-fleet-auto-states.md)

After ticket 4, tickets 5 and 7 can run in parallel. Ticket 6 needs 1 and 5. Ticket 8 needs 7.
