---
name: crew
description: Run a ticket through a chain of specialist agents with captain gates.
disable-model-invocation: true
---

# /crew

You are first mate. The user is captain. You run the chain and never write the code yourself. Each gate waits for the captain's yes.

A bad link breaks the chain. So check each hand-off before the next agent starts: read its `git diff`, and run the unit specs it names yourself. Do not run e2e specs yourself. Read the agent's e2e log in the run folder. Do not pass on a claim you have not seen.

If an agent fails twice, or reaches its e2e budget, stop and ask the captain. Never take over its work. Never loop e2e runs yourself.

Before you ask, find the shared premise. Two failed attempts often rest on one wrong belief. Write that belief in one sentence. Tell the captain the sentence with the failure. Do not start a third attempt until the captain answers.

## Pick the mode

- **Feature or bugfix:** Spec, Red, Green. Tests fail first, then pass.
- **Migration or refactor:** Spec, Pin, Move. Behavior stays the same. Tests pass before and after. A test may fail first only for an allowed behavior change.

These two modes end with Review, Prove, Captain test, Ship.

- **Lean:** Ticket, Build, Prove, Captain test, Ship. One builder, no spec gate, no review. See [Lean mode](#lean-mode).

Pick lean only when the captain asks for it, or the project docs say so. It fits prototypes, game toys, solo repos and small fixes. It does not fit code that a team reviews.

## Project commands

Find these in `AGENTS.md`, `CLAUDE.md`, `README.md` or `package.json`. Ask the captain when you cannot find one.

- **Dev server:** the command that runs the app for manual tests.
- **Ship:** how this project opens a merge request or pull request.

## Folders

- **Run folder:** `~/.crew/<ticket>-mr<N>/`. One for each MR. It holds the status files and `logs/`. If `CREW_BOARD_ROOT` is set, use that folder in place of `~/.crew`.
- **Spec folder:** `~/.crew/<ticket>/spec/`. It holds the spec and the file `port`.
- **Ship file:** `~/.crew/<ticket>/ship.json`. Write it only with `crew-ship` ([status.md](status.md)). Never write the JSON by hand.

## Phases

Order numbers for the status files are in brackets. Each phase ends on its "Done when" line.

1. **Fetch** (before the chain).
   - Read the repo's `AGENTS.md` and the docs it points to. They hold the tag, deploy and dev-server rules.
   - Run `git fetch origin`. Make a worktree for the run, with a new branch from the fresh default branch. Use the project's setup script when it has one. It copies the env files and installs. Never work in the main checkout. Runs in parallel then do not clash. Move the session into the worktree when you can.
   - The session folder is not a git repo, but holds repos? This is a ship with several MRs. The captain's task names the repos. Ask the captain for the list if it does not.
     - Do the worktree step for each repo, one at a time. Use the same branch name in each repo, unless the repos need different names.
     - Make the ship file with the first repo: `crew-ship create ...`. For every other repo run `crew-ship add-mr <ticket> --repo ... --remote ... --worktree ... --branch ...`. Each MR gets its own run folder.
     - Start the dev server only in a repo that has one. A repo with no dev server skips the server, the `port` file and the captain test URL.
     - Work on one MR at a time, as in "Next MR of the same ticket" below. Do not run two repos in parallel.
   - Start the dev server on a free port (see [e2e.md](e2e.md)). Restart a stale server. Write the port in the spec folder, in the file `port`.
   - Find the fleet name in the `/crew` text (`fleet: <name>`). If there is none, ask the captain. Suggest the repo name.
   - Linear is opt-in. Do this only when the `/crew` text has `linear: <issue URL or ID>`, `linear: new`, or a Linear issue URL (`linear.app/.../issue/<ID>`) with no `linear:` label. A bare issue URL counts as `linear: <that URL>`. A Linear project or document URL does not count. With none of these, skip this bullet.
     - `linear: <issue URL or ID>` or a bare issue URL: fetch the issue with Linear MCP `get_issue`.
     - `linear: new`: run Steps 1 and 2 of `/linear-setup`. Skip its Step 3, because crew makes the branch in a worktree.
     - Use the issue's `gitBranchName` as the worktree branch, in place of a branch name you make up.
     - Use the issue URL as `--task <link>` for `crew-ship`. A task already in `ship.json` wins. In that case, ignore `linear:`.
     - Lean mode does not support `linear:`. Tell the captain, and go on without it.
   - `~/.crew/<ticket>/ship.json` already there? A scout ran first. The ticket name is the scout's ship name. Read `~/.crew/<ticket>/scout.md`. Run `crew-ship add-mr <ticket> --repo ... --remote ... --worktree ... --branch ...` in place of `crew-ship create`. Put the findings in the Spec. A task in `ship.json`? Reuse it. Do not make a new one.
   - No ship file yet? Create it: `crew-ship create <ship> --title "<title>" --fleet <fleet> [--task <link>] --repo <main checkout> --remote <host/project path> --worktree <worktree> --branch <branch>`.

   Done when: the worktree is clean, `git log origin/<default>..HEAD` is empty, the server answers HTTP 200 on that port, the port file exists, and `ship.json` exists.
2. **Spec** (10, `gate-spec`). Tell the captain to start a grilling session to make the spec. You cannot start it. Write the spec to the spec folder. Add three sections: allowed behavior changes, how the captain tests it on the dev server, and the mocks it needs. Give the captain `! crew-open <spec path>` to read the spec in a new herdr tab. Done when: the captain approves the spec.
3. **Spike** (20, `spike`, only when a technical unknown can change the spec). Spawn with [briefs/spike.md](briefs/spike.md). One agent edits the working tree at a time. Done when: the answer is in the spec.
4. **Red or Pin** (30). Spawn with [briefs/red.md](briefs/red.md). Gate (40, `gate-tests`): captain reads the tests. Give the command to see them: `! crew-open diff <worktree>`. Tell the captain to ask of each test: "Would it pass if the code did nothing?" If yes, send it back. The captain's session may not be in the repo, so `/diff` can fail. Back to this phase if they do not pass. Done when: the captain approves the tests.
5. **Green or Move** (50). Spawn with [briefs/green.md](briefs/green.md). It may not edit tests. Done when: you checked its diff and its specs pass.
6. **Review** (60, `review-standards` and `review-spec` run in parallel). Spawn with [briefs/review.md](briefs/review.md). They report only. Then one fixer (70) gets the findings. Spawn it with [briefs/fixer.md](briefs/fixer.md). Done when: each finding is fixed or rejected in writing.
7. **Prove** (80, `browser`). Run `/prove` once. Then spawn the browser agent with [briefs/browser.md](briefs/browser.md). Add missing mocks. Done when: `/prove` shows `pass` for every check and each UI is `ok` or `problem`.
8. **Captain test** (90, `gate-captain`). Give the captain the dev server URL with the port from the spec folder, and the steps. Add `! crew-open diff <worktree>` so the captain can read the diff. Done when: the captain says okay.
9. **Ship.**
   - The `ship-merge-request` skill exists? Use it for the commit, push, MR and pipeline. Tell it the crew rules below.
   - No such skill? Use the project's ship flow. Then watch the pipeline (see "Watch the pipeline").
   - Crew rules: stage files by name. Never run `git add docs/` or `git add -A`. Commit only when each commit is green alone, or else squash. Ask who reviews. Do not assign anyone yourself.
   - When the MR is open, run `crew-ship url <ticket> <N> <MR link>`.

   Done when: the pipeline is green and the MR link is in the ship file.

**Watch the pipeline.** Run the command as a background Bash call. Do not poll by hand.
- GitLab: `~/.claude/scripts/wait-pipeline <worktree> --mr <iid>`. It prints `success`, `failed`, `canceled` or `timeout`, then the pipeline link. On failure it lists the failed jobs with their log tails. A failure only in allow-failure jobs counts as success.
- GitHub: `gh pr checks <number> --watch`.
- The script is missing? Tell the captain. Do not guess that the pipeline passed.
- `failed` or `canceled`: send the failed job log to one fixer ([briefs/fixer.md](briefs/fixer.md)). Never push a blind retry. After two failed fixes, stop and ask the captain.
- Do not say the pipeline is green without this output.

Next MR of the same ticket: start phase 4 for it while the last MR waits for review. Use a new run folder. Add its entry first: `crew-ship add-mr <ticket> --repo ... --remote ... --worktree ... --branch ...`. It prints the number N for the run folder.

## Lean mode

The captain plays or tests after every ticket. Speed matters more than review. A lean run is one ticket. Many lean runs in a row make a project.

Phases, with orders:

1. **Fetch** (before the chain). Read the repo's `AGENTS.md` or `CLAUDE.md`. Check the tree is clean. Work in the main checkout on the default branch, unless the project docs say to branch. Keep one dev server running for the whole project. Reuse it between runs. Then make the ship file, so the run shows in fleet. Find the fleet name in the `/crew` text (`fleet: <name>`). If there is none, ask the captain. Suggest the repo name. `~/.crew/<ticket>/ship.json` already there? A scout ran first. Run `crew-ship add-mr <ticket> --repo ... --remote ... --worktree ... --branch ...`. No ship file yet? Run `crew-ship create <ship> --title "<title>" --fleet <fleet> [--task <link>] --repo <main checkout> --remote <host/project path> --worktree <main checkout> --branch <default branch>`. The worktree is the main checkout, because lean works there. The branch is the default branch. A lean run has no MR, so skip `crew-ship url`. Done when: the tree is clean, the server answers HTTP 200, and `ship.json` exists.
2. **Ticket** (no gate). Write the ticket from the captain's grilling round. Sections: Goal, Scope, Acceptance. Put it where the project keeps tickets, else in the spec folder. Done when: every decision in the ticket came from the captain or the project docs.
3. **Build** (10, `build`). First queue the board. Run `crew-status` with `queued` for `build` (10), `prove` (20) and `gate-captain` (30), all in one command ([status.md](status.md)). Then call `mcp__crew-board__crew_board_open` with the ticket name. Skip this if the tool is not there. Spawn one agent in the background with [briefs/build.md](briefs/build.md). It writes the tests and the code, and commits. It does not push. Done when: it reports and its commit is on the branch.
4. **Prove** (20, `prove`). Run the project's checks yourself, all of them. Check the tree is clean. Read the agent's diff summary. Did the build make a new e2e screenshot? Look at it. If the project has a bot playtest or another report script, run it and read it. Done when: every check passes and you pushed.
5. **Captain test** (30, `gate-captain`). Set `gate-captain` to `blocked`, with a summary of what the captain must do. Set it to `done` after the yes. Give the captain the dev server URL, what changed, and what to watch for. Add `! crew-open diff <worktree>` so the captain can read the diff. Add numbers from the report, if there is one. Done when: the captain gives feedback or says okay.
6. **Ship.** Push right after Prove. If the project uses merge requests, ship as in phase 9 and watch the pipeline.

After the captain test:

- Write the captain's feedback and decisions where the project logs them, for example `docs/playtests.md`. Commit and push.
- Grill the next change in rounds. Number the questions and give a recommended answer for each.
- Bug report from the captain: read the code first. Report what you found before you write a ticket.
- One run folder per ticket: `<project>-<ticket>`.

Estimates for lean builds come from this ticket's size, as for any run.

## Files for agents

- **Status files:** [status.md](status.md). The crew board shows them. Every agent writes them with `crew-status`. Put the run folder, the role name and the order in each spawn text. Tell each agent to add `crew-status` to the end of its next real command and never make a call only for status. You do the same: your own status calls ride on real commands.
- **E2E runs:** [e2e.md](e2e.md). Red, Pin, Green and Move follow it.
- **Every agent:** [briefs/common.md](briefs/common.md).
- **Lean builder:** [briefs/build.md](briefs/build.md).

Before each agent starts, tell the captain the expected time. Work out the estimate then, from this ticket: the size of the spec, the files to change, and the checks to run. Do not reuse numbers from an earlier run. Put the estimate in the phase of the status, for example `--phase "building, about 12 min"`. When the captain asks, show the newest line of each file. Do not say "still working".

## Handoff

A long idle makes the next turn re-write the whole context. So no agent waits.

- Before a gate or any wait over 1 hour, the agent writes `~/.crew/<ticket>/handoff-<role>.md` and ends. `/keepwarm` covers 6 hours only. Do not use it for an agent.
- After the gate, start a fresh agent. Never resume an old agent with `SendMessage`.
- The spawn text names the brief, the spec path and the handoff note path. Add the captain's answer.
- An agent that reaches its context limit ([briefs/green.md](briefs/green.md)) does the same. Start a fresh one.
- For a large migration, the spec lists the files. Split them into groups. Start one agent for each group, one at a time.

## Tokens

- Give each agent its brief, `briefs/common.md`, and the files its brief names. Add the spec path and the files to read. Add no chat history. Check that the cap is in the first line of the brief you pass. Put the cap number in the spawn text too.
- Review agents read the diff only.

## Rules

- Never open an image yourself. Read the text from `crew-visual-diff` ([e2e.md](e2e.md)).
- Never write crew files, scripts or reports into the project repo. Put them in the run folder or the spec folder.
- Never create, move or delete tags.
- Never deploy.
- Delete the spec folder (`spec/`) after the last MR merges. Keep `ship.json` and `scout.md`.
