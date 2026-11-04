# Fleet: keep the token over a restart

Type: build (lean)
Status: done
Blocked by:

## Goal

Open fleet tabs keep working after fleet restarts. Today every restart makes a new token, and every button in an open tab then fails with 403 until the captain reloads.

## Scope

- `startServer` in `src/server.ts` reads the token from `<fleet home>/token` (the fleet home is `CREW_FLEET_HOME` or `~/.fleet`; use the existing `fleetHome(env)` helper).
- If the file is missing, or its content is not 48 hex characters, fleet makes a new token with `randomBytes(24)` as today. It writes it to that file with mode `0600` (read and write for the owner only) and creates the folder if needed.
- If the file exists but has looser permissions, fleet sets them to `0600`.
- The token check in requests does not change.
- The 403 message in `web/actions.js` stays. It can still happen when someone deletes the token file.
- README: one or two plain sentences under the section that lists the files in `~/.fleet`, or near the "Start at login" section: fleet keeps its token in `~/.fleet/token`, so open tabs keep working after a restart; delete the file to get a new token.

Not in scope: changing how the page gets the token.

## Acceptance

- Tests (port 0, temp `CREW_FLEET_HOME`):
  - Two servers started one after the other with the same fleet home have the same token.
  - The token file has mode `0600`.
  - A file with bad content gets replaced by a new valid token.
- `npm test` passes.

Decisions came from the captain on 2026-11-04: keep the token in a file, option (a).

## Result

- `startServer` reads the token from `<fleet home>/token`. A new `loadToken` helper in `src/server.ts` does this.
- A missing file, or content that is not 48 hex characters, gives a new `randomBytes(24)` token. It is written with mode `0600`. The folder is created if needed.
- A file with looser mode is set to `0600`.
- README: one short paragraph under Run.
- Tests in `test/token.test.ts`: same token over two starts, mode `0600`, loose mode fixed, bad content replaced. `npm test`: 242 pass.

Choices where the ticket was silent:
- Whitespace around the saved token is trimmed before the check (a trailing newline is fine).
- An unreadable token file is treated like a missing one.
- I added a test for the loose-mode fix, beyond the three required.
- All existing tests already pass a temp `CREW_FLEET_HOME`. No test change was needed.
