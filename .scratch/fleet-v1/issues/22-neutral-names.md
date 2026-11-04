# Neutral names in tests and notes

Type: chore (lean)
Status: done
Blocked by:

## Goal

Fleet is a public repo. Some tests, notes and one prototype use real names from the captain's work: a company name, its ticket ids, product names and repo paths. Replace them with made-up names, so the repo shows nothing from that work.

## Scope

1. Replace each real name with a made-up one. The list of words to find is in the run folder (`words.txt`). Do not copy that list into the repo, the commit or the report.
   - Ticket ids: use `ABC-<number>` (keep the number of digits, change the digits).
   - Product, repo and group names: use `acme`, `acme/apps/web-base` and similar short names. Use one name for one thing in all files.
   - Keep test logic the same. Only the strings change. If a test checks a string, change both sides.
2. Files: run `git grep -il` with each word, plus `docs/img/fleet.png`. For the PNG, check its text chunks (`strings`) and whether the picture shows a real name. If the picture shows one, retake it from `npm run demo` with the same size and say so in the report. If only random bytes match, leave it and say so.
3. No history rewrite. One new commit.

## Acceptance

- `git grep -i` for every word in `words.txt` finds nothing (except the random bytes of a PNG, if that is the case).
- `npm test` passes, and the Python tests in `crew/mods/board/test/` pass.
- The commit message and the ticket Result name no real word from the list.

Decision came from the captain on 2026-11-03: a clean-up commit on main, no history rewrite.

## Result

Replaced every listed word in 17 files (tests, notes, one prototype, crew README). Test logic is the same.

- Ticket ids became `ABC-<number>` with new digits of the same length. Ids that were only `-1`, `-2`, `-3` kept their digit.
- Company name became `Acme`. The repo path became `gitlab.com/acme/apps/web-base`.
- The two prototype projects became `web` ("Acme web") and `view` ("Acme viewer").
- `npm test`: 257 pass. Python `crew_ship_test.py`: 14 pass.
- `crew/mods/board/hooks/*.test.ts` do not load here (package `claude-code` is missing). They failed the same way before the change.
- `docs/img/fleet.png`: only random bytes match (2 short strings). The text chunks hold no real word. I did not open the picture. It came from the README screenshot commit, and the demo data in the repo was already made-up. I could not check the picture itself. Left as is.
