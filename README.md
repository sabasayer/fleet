# Fleet

Fleet is a local web page. It shows every crew ship, grouped by fleet (project). The captain can go back to any ship from it.

## Run

```
npm start -- --port 4932
```

Needs Node 22.18 or newer. No install step. `npm run demo` starts it with fake data. `npm test` runs the tests.

Fleet reads ships from `~/.crew` and keeps its own files in `~/.fleet`. Set `CREW_BOARD_ROOT` or `CREW_FLEET_HOME` to use other folders.

## Automatic states

Every 2 minutes, fleet checks each MR that is `in_review`. It runs `gh pr view <url> --json state,mergeCommit` for GitHub links. It runs `glab mr view <url> --output json` for all other links. A merged MR becomes `merged` and keeps its merge SHA. An MR closed without a merge becomes `abandoned`. If the CLI is missing or fails, the page says so. The captain then uses the buttons.

Every 2 minutes, fleet also runs the fleet's `release_check` for each `merged` MR. Exit code 0 moves the MR to `released`. Any other result keeps it `merged`. The page shows the last result.

## New ship

The "+ new ship" button opens a form with three fields: fleet, repo folder and task. Fleet checks them on the server. The folder must exist and be a git repo. If it is a worktree, fleet uses the main checkout.

Fleet starts `claude --session-id <uuid> -n <ship> "/crew <task> fleet: <fleet>"` in a new herdr tab in the fleet's workspace. It then focuses the tab and raises Ghostty. If herdr does not answer, the page shows the command to copy. Fleet writes no ship file. The ship shows on the sea when crew writes its `ship.json`.

## fleets.json

File: `~/.fleet/fleets.json`. The captain or an agent edits it. Fleet reads it again on every request, so no restart is needed.

It is one JSON object. Each key is a fleet id (the `fleet` field of `ship.json`). Each value has these optional fields:

- `name`: the name shown on the page. Default: the fleet id.
- `color`: any CSS colour. Default: a colour made from the id.
- `release_check`: a shell command. Fleet runs it with `/bin/sh -c`. Leave it out to mark `released` by hand.

```json
{
  "portal": {
    "name": "Patient portal",
    "color": "#d96fa8",
    "release_check": "git fetch origin main && git merge-base --is-ancestor \"$FLEET_SHA\" origin/main && curl -fsS https://portal.example.com/version | grep -q \"$FLEET_SHA\""
  },
  "viewer": {
    "name": "Image viewer",
    "color": "#3fb3a0"
  }
}
```

### release_check rules

- Exit code 0 means "this change is released". Any other code means "not yet".
- The limit is 60 seconds. After that, fleet kills the command and everything it started.
- The working folder is the MR worktree. If that folder is gone, it is your home folder.
- Fleet sets these variables. Use them in the command. Fleet never puts them inside the command text.

| Variable | Meaning |
| --- | --- |
| `FLEET_SHA` | The merge commit SHA. Empty if the captain marked the MR merged by hand. |
| `FLEET_REPO` | Path of the repo. |
| `FLEET_REMOTE` | The git remote of the repo. |
| `FLEET_BRANCH` | The MR branch. |
| `FLEET_MR_URL` | The MR link. |

Always put the variables in double quotes, as in the example.
