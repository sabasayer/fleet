# Fleet: find the MR by branch when the link is missing

Type: build (lean)
Status: done
Blocked by:

## Goal

A ship shows the right state even when its work shipped outside the crew chain. On 2026-11-03 six ships were wrong because no `crew-ship url` call saved their MR link. The first mate found every MR by asking GitLab or GitHub for an MR on the ship's branch.

## Scope

- In the watcher (`src/watch.ts`), for each MR of a ship at sea that has `url: null` and a `branch`, fleet asks the repo host for an MR on that branch:
  - GitHub: `gh pr list -R <owner/repo> --head <branch> --state all --json number,state,url,mergeCommit`.
  - GitLab: `glab mr list -R <group/project> --source-branch <branch> --all --output json`.
  - The host and project come from the MR's `remote` (`host/path`). If the remote has no host (for example `acme/apps/web-base`), treat it as `gitlab.com`.
  - Skip MRs whose branch is the default branch (`main` or `master`). Lean runs work on the default branch and have no MR.
  - If several MRs match, take the newest one.
- Fleet never writes crew files. It keeps the found link in its own per-ship file (the `Stored` state in `src/life.ts`, under `~/.fleet/ships/`), and uses it wherever a missing `url` is used today: the state rules, the merged check, the release check env (`FLEET_MR_URL`), and the page.
- State rules for a found MR:
  - **Merged MR:** that MR becomes `merged` (with its merge SHA), even when crew members are not all `done`. The work shipped, so the open crew roles no longer matter.
  - **Closed without a merge:** that MR becomes `abandoned`, as today.
  - **Open MR:** it counts as the MR link. The existing rule still applies: the ship is `in_review` only when every crew member is `done`.
- Ask at most once every 10 minutes per MR while nothing is found, so a run with no MR yet does not call the CLI every 2 minutes. Once found, stop searching for that MR.
- If the CLI is missing or fails, do nothing, as the merged check does today.
- README: a short note in "Automatic states": fleet finds a missing MR link by branch.

Not in scope: writing the link back into `ship.json`, finding MRs for scouts with no MRs.

## Acceptance

- Unit tests with a fake `cli`: GitHub and GitLab argument shapes; a remote without a host uses `gitlab.com`; the default branch is skipped; the newest of several matches wins; a merged match moves the MR to `merged` even with crew not done; an open match leads to `in_review` only when the crew is done; a closed match becomes `abandoned`; the 10-minute wait between empty searches.
- `npm test` passes.

Decisions: the captain asked for this on 2026-11-04. The first mate chose the details above where the captain was silent: a found merged MR beats unfinished crew roles; a 10-minute wait between empty searches; a host-less remote means `gitlab.com`; the default branch is skipped.

## Result

- `src/life.ts`: `Stored` has a new `found` map (MR number to link). Old files load with `{}`.
- `src/state.ts`: a missing `url` falls back to the found link. The page, state rules and release check env use it.
- `src/watch.ts`: new search for MRs with no link and a non-default branch. `parseRemote`, `searchPlan`, `newestMatch` are exported.
- `test/find-mr.test.ts`: 15 tests. `npm test`: 257 pass.
- README: note in "Automatic states".

Choices:
- Found link is saved first. Then a merged or closed match moves the MR at once.
- An open found MR is also polled for its merge while crew is not done (sailing).
- Newest match = highest MR number.
- A CLI failure also starts the 10-minute wait.
- glab on a host other than gitlab.com gets `-R https://host/path`. gh on a host other than github.com gets `-R host/path`.
- A remote has a host when it is `git@host:path`, has a scheme, or its first part has a dot.
