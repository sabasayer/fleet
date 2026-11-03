# Fleet: start at login

Type: build (lean)
Status: done
Blocked by:

## Goal

Fleet starts on its own when the captain logs in to the Mac. It comes back after a crash. A second copy started by hand says clearly that fleet already runs.

## Scope

1. **README section "Start at login".** It gives a launchd plist for `~/Library/LaunchAgents/com.salihsayer.crew-fleet.plist` and the commands to load and unload it. Copy the pattern of the captain's mr-triage agent:
   - `ProgramArguments`: `/bin/zsh -lc "exec node bin/crew-fleet.ts"`. The login shell gives the normal `PATH`, so fleet finds `node`, `glab`, `gh` and `herdr`.
   - `WorkingDirectory`: the fleet checkout. Use `/Users/<you>/Private/fleet` as a placeholder the reader changes.
   - `RunAtLoad` true. `KeepAlive` with `SuccessfulExit` false, so a crash restarts it and a clean stop does not.
   - `StandardOutPath` and `StandardErrorPath`: `~/.fleet/fleet.log`, written as a full path. launchd does not expand `~`. Not `/tmp`, because macOS clears it on restart.
   - Port 4932, the default. No `--port`.
   - Load with `launchctl bootstrap gui/$(id -u) <plist>`, unload with `launchctl bootout gui/$(id -u) <plist>`.
2. **Port in use.** When the port is taken, `bin/crew-fleet.ts` prints `crew-fleet: fleet already runs at http://127.0.0.1:<port>` and exits with code 0. Exit 0 matters: with `SuccessfulExit` false, launchd does not restart it in a loop. Other listen errors keep their current behaviour.

Not in scope: a `crew-fleet login on|off` command, Linux or Windows, starting the demo.

## Acceptance

- One test starts a server on a port, then runs `bin/crew-fleet.ts --port <that port>`. It checks the output line and exit code 0.
- `npm test` passes.
- The README plist is valid: `plutil -lint` passes on a copy in the run folder.

Decisions came from the captain on 2026-11-03: plist plus README, no command; port 4932; restart on crash only; log in `~/.fleet/fleet.log`; a clear message when fleet already runs.

## Result

- `bin/crew-fleet.ts`: on `EADDRINUSE`, prints `crew-fleet: fleet already runs at http://127.0.0.1:<port>` and exits 0. Other errors still throw.
- `test/already-runs.test.ts`: starts a server on a free port, runs the entry point on that port, checks the line and exit code 0.
- `README.md`: new "Start at login" section with the plist, load and unload commands.
- Checks: `npm test` 212 pass, 0 fail. `plutil -lint` OK on a copy (with `<you>` set to a name) in the run folder.

Choices where the ticket was silent:

- The plist has a `Label` key (`com.salihsayer.crew-fleet`). launchd needs one.
- Stdout and stderr both go to the same log file.
- The test starts the first server with `startServer` and port 0. It sets `CREW_BOARD_ROOT` and `CREW_FLEET_HOME` to a temp folder.
- The README tells the reader to run `mkdir -p ~/.fleet` first, since launchd cannot open a log in a missing folder.
- The `<you>` placeholder makes the raw README plist invalid XML until the reader edits it. The README says to change it.
