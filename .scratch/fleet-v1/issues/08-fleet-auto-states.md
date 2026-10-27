# Fleet: merged from the repo host and the release check

Repo: sabasayer/fleet
Status: closed
Blocked by: 07
Assignee: salih (Sonnet agent)

## What

Spec section 4, the automatic steps: every 2 minutes, ask `glab` or `gh` about MRs in `in_review` (merged with its SHA, or closed → `abandoned`). Run each fleet's `release_check` for merged MRs with the `FLEET_*` variables and a 60-second limit. Stop polling an MR once it moves on. Keep the "mark" buttons for when no CLI works or no check is set. Write the README part on `fleets.json` and `release_check`, with an example, so an agent can edit the file.

## Done when

- A merged test MR moves to `merged` by itself, and a release check that exits 0 moves it to `released`.
- A check that hangs is stopped at 60 seconds and does not block other ships.

## Progress

Built on branch `feat/auto-states` (from `feat/lifecycle`; commit `667d67a`), then merged with `feat/jump-back` (`38d1add`). Not pushed. `npm test`: 100 pass for the merged code.

Commands: `gh pr view <url> --json state,mergeCommit` (checked on a real merged PR: `MERGED` plus `mergeCommit.oid`); `glab mr view <n> -R <project URL> --output json`, using `state` and `merge_commit_sha`, then `squash_commit_sha`, then `sha`. A host name with "github" uses `gh`; any other host uses `glab`.

Choices: an MR marked merged by hand has no SHA, so `FLEET_SHA` is empty; check results live in memory only; a login or parse error only shows as the last result.

`glab mr view` does not take an MR URL. Fleet now calls `glab mr view <n> -R <project URL> --output json` (checked on a real merged GitLab MR: `state: merged` plus `merge_commit_sha`).
PR: https://github.com/sabasayer/fleet/pull/6. Next: when the captain marks an MR merged by hand, fleet fetches its SHA once from the repo host.
