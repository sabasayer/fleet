# crew-open: read agent output in a herdr tab

Type: build (lean)
Status: done
Blocked by:
Closes: GitHub issue #23

## Goal

At a gate, the captain reads files and diffs from crew agents with good tools, in a new herdr tab next to the chat. One command opens the right tool. The captain does not switch windows.

## Scope

1. **New command `crew-open`** in `crew/mods/board/bin/`, next to `crew-status`. Python 3, like its neighbours. No new dependency.
   - `crew-open diff <worktree> [<base>]`: open `hunk diff <base>` in the worktree. Default base: the merge-base of `HEAD` and the remote default branch (`origin/HEAD`, else `origin/main`). `hunk diff <commit>` also shows uncommitted changes, so this one form covers both cases.
   - `crew-open <file>`: a `.md` file opens in `glow -p <file>`. Any other file opens in `hx <file>`. The tab's working folder is the file's git root (else its folder), so Helix finds the project's language servers.
   - The tab: `herdr tab create --cwd <folder> --label "<label>" --no-focus`, then run the command in the tab's pane. Label: `diff <worktree folder name>` or the file name. Print one line: what opened and the tab label.
   - No herdr (not on the PATH, or the call fails): print the command the captain can run, for example `cd <worktree> && hunk diff <base>`, and exit with code 0. Missing path or worktree: a clear message and exit code 2.
2. **Tests** in `crew/mods/board/test/`, in the style of `crew_ship_test.py`: the command chosen for each case (`.md`, other file, diff with and without base), and the no-herdr fallback. Use a fake `herdr` on the `PATH` to record calls. Do not open real tabs.
3. **Crew skill** (`crew/mods/board/skills/crew/SKILL.md`):
   - Spec gate: give the captain `! crew-open <spec path>`.
   - Tests gate: replace `! git -C <worktree> diff` with `! crew-open diff <worktree>`.
   - Captain test gates (full and lean): add `! crew-open diff <worktree>` to the message.
4. **README** (`crew/README.md`): add `crew-open` to the list of commands. Say it needs herdr, Hunk, Helix and glow, and that it prints the command when herdr is not there.

Not in scope: an editor config (the captain's Helix setup lives outside this repo), a fleet UI button, snapshot or image views.

## Acceptance

- The new tests pass, and all existing checks pass (`npm test`, the Python tests).
- `crew-open diff <worktree>` with no herdr on the `PATH` prints a runnable command.
- The skill text names `crew-open` at the three gates.

Decisions came from the captain on 2026-11-03 and 2026-11-04: Hunk for diffs, Helix for code files, glow for markdown, a herdr tab, print the command when herdr is missing, the gates call it. Fleet itself stays out of this.

## Result

- Added `crew-open` (diff and file modes) in `crew/mods/board/bin/`.
- Added `crew_open_test.py` with 8 tests and a fake `herdr`.
- Skill text names `crew-open` at the spec gate, the tests gate and both captain test gates.
- README lists the command.
- Checks: `npm test` 257 pass. Python tests 22 pass.

Choices where the ticket was silent:
- The tab's pane id comes from the JSON of `herdr tab create` (`root_pane.pane_id`, found at any depth). The shape comes from `herdr api schema`. No real tab was made.
- If `tab create` or `pane run` fails, or the JSON has no pane id, it prints the command and exits 0, like the no-herdr case.
- No remote base found: it runs plain `hunk diff`.
- Label is `diff <folder name>` or the file name.
- Output line: `opened <command> in tab '<label>'`.
