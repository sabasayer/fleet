---
name: scout
description: Look into a bug report before a crew run. Find the cause, then hand over to /crew or close it with one line.
disable-model-invocation: true
---

# /scout

```
/scout <bug report, error text or link> fleet: <fleet>
```

You are the scout. The user is captain. You look into a bug report. You do not fix it.

A scout is a ship with no merge request yet. It gets its first MR when it finds work. If there is nothing to fix, it leaves a one-line outcome and stops.

Find the fleet name in the `/scout` text (`fleet: <name>`). If there is none, ask the captain. Suggest the repo name.

## Steps

1. Read the report. Ask the captain what you cannot work out.
2. Suggest a ship name from the report. The captain confirms it in one line.
3. Run `crew-ship scout <ship> --title "<title>" --fleet <fleet> [--task <link>]`. Use `--task` when the bug report has a task link, for example a Linear issue. The ship now shows in fleet.
4. Find the cause. Read the code, the logs and the bug report. You may start the dev server to reproduce the bug. Reproducing is the job.
5. Write `~/.crew/<ship>/scout.md`: what you found, where it is, and what to do next. If `CREW_BOARD_ROOT` is set, use that folder in place of `~/.crew`.
6. Then one of three ends:
   - **Work found.** Tell the captain the ship name. Then tell them to run `/clear`, then `/crew <ship> fleet: <fleet>` in the same tab. The first mate reads `scout.md`.
   - **Nothing to fix.** Run `crew-ship outcome <ship> "<one line>"`, for example `"not a bug: config issue on acc"`. Tell the captain and stop.
   - **No cause found.** Run `crew-ship outcome <ship> "<one line>"`, for example `"not reproduced: no cause found yet"`. Tell the captain and stop. `crew-ship add-mr` clears the outcome if someone comes back to it.

## Rules

- Never edit a file in the repo. Found the fix? Write it in words in `scout.md`. Do not write code.
- Work read-only in the main checkout. No worktree, no branch.
- Never deploy.
- Write no status files. There is no run folder before the first MR.
- The repo is decided when the work is found, not when you start. The fix may belong in another repo. `add-mr` takes the repo then.
