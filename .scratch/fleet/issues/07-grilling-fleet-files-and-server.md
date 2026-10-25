# Grilling: fleet's own files and its server

Type: grilling
Status: resolved
Blocked by:

## Question

Where does fleet keep its own state per ship (the states after crew from the ship lifecycle ticket), and what is its format? Where does the optional project config live, and what does it hold (display name, colour, the release check command)? How often does fleet ask the repo host (`glab` / `gh`) for merged MRs, and run release checks? What does the server look like: `npx fleet`, the port, how the page gets updates, how it reads `~/.crew`? crew-board already has a web view (`/crew-board serve`, `mods/board/serve/serve.mjs`, port 7777) and alerts for blocked, failed and stale agents: should fleet reuse any of that, or stay apart?

## Answer

**Own repo, copied helpers.** Fleet stays in `sabasayer/fleet`. It copies the few crew-board helpers it needs (status file parsing, the stale check, the chain order, the hats and faces) and does not import them. `/crew-board serve` stays as it is. The copies fold back together when the tools merge.

**Notifications.** Fleet sends none in v1. crew-board's alerts (blocked, failed, stale) are enough. Think again when the tools merge.

**Ship state.** One file per ship: `~/.fleet/ships/<ship>.json`. Only the fleet server writes it. It holds:
- each MR's state (`in_review`, `merged`, `released`, `testing`, `done`, `abandoned`), its merge SHA and the time it changed;
- the ship-level flags `paused` and `failed`, set by the captain;
- `docked`: the time the ship reached `done`, so the harbour can hide it later.

`sailing` is not stored. Fleet works it out from the status files.

**Project config.** One hand-edited file: `~/.fleet/fleets.json`, one entry per fleet with a display name, a colour and `release_check`. The captain may also ask an agent to edit it, so the README must describe the format clearly. `release_check` is a shell command run with `sh -c`, with `FLEET_SHA`, `FLEET_REPO`, `FLEET_REMOTE`, `FLEET_BRANCH` and `FLEET_MR_URL` set and a 60-second limit. Exit code 0 means `released`. A fleet with no entry gets its name from the ship file, a colour made from that name, and no release check. There is no config editor in the UI.

**Polling.**
- `~/.crew` and fleet's own files: every 2 seconds.
- `glab` / `gh` for MRs in `in_review`: every 2 minutes.
- Release checks for `merged` MRs: every 2 minutes.
- Polling for an MR stops once it moves past that state.
- The page asks the server for new data every 2 seconds.

**Package and runtime.** The npm package is `crew-fleet` (`fleet` is taken), started with `npx crew-fleet`. The repo and command stay `fleet`. It needs Node 22.18 or newer, has no dependencies and runs `.ts` directly, like crew-board. The default port is `4932`, and `--port` changes it. It runs in the foreground.
