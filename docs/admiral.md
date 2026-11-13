# Admiral

Status: design agreed, not built. Level 1 is next.

The admiral is a Claude session that does the captain's work across many ships. The captain decides how much it may do. Every ship it starts is a normal ship: its own session and its own terminal tab, so the captain can go to any of them.

## Levels

Build in this order. Each level works without the next one.

1. **Launcher.** `/admiral` reads a brief, lists the repos, and asks the captain to confirm. Then it starts one ship per repo through fleet, and exits.
2. **Gate answering.** The admiral answers some gates by a policy. It writes a shadow verdict on `gate-captain`.
3. **Follow-through.** After merge it waits for release, runs the e2e test in the acceptance environment, marks the ship done, and reports.
4. **Intake.** It checks the captain's list on a timer, proposes what to do, and starts work after the captain's yes.

## Level 1: launcher

- `/admiral` is a skill. It starts ships and exits. It does not stay to watch them.
- It starts each ship with `POST /api/ships/new`, the same call as the new-ship form. Fleet stays the only place that starts ships.
- `quiet: true` on that call: no Ghostty raise and no tab focus. A batch would steal focus once per ship.
- The shared brief is one file in `~/.crew/<convoy>/brief.md`. Each ship's task text names its repo and points to that file.
- The repo list comes from the captain: names, or a folder plus a rule. The admiral prints the list and asks once. `--yes` skips the question.
- More than 4 ships: it warns and asks again. There is no queue.
- One failed start does not stop the others. The admiral lists each failure with the exact line to run again. It does not retry.
- Its output is one line per ship: name, repo, how to jump. The fleet sea shows the gates.

New lines in the `/crew` text, like `fleet:` and `linear:`:
- `convoy: <name>`: crew passes it to `crew-ship create --convoy`. `ship.json` gets a `convoy` field. Fleet shows it in the side panel. Old ships have no field.
- `auto: plan`: the first mate may skip the captain at `gate-spec` and `gate-tests`. Use it only when the plan is already clear, for example a spec from an earlier analysis. Reviews and tests still run.

## Hard limits

The admiral never does these alone, at any level. They go in its report for the captain's yes:
- merge an MR,
- post in the captain's name (MR comments, issue trackers, chat, pages outside the captain's own task list),
- touch production,
- answer `gate-captain`, until the captain hands it over (see below).

It may do anything local that can be undone.

## How it stays alive (level 2 and later)

A `/loop` session in its own terminal tab. It wakes every 20 to 30 minutes. It reads and answers other sessions with herdr's `agent.read`, `agent.send` and `events.wait`.

## Gates

- `gate-spec` and `gate-tests`: the admiral answers them only on ships with `auto: plan`. It writes why in `decisions.jsonl`.
- `gate-captain`: the captain answers. The admiral writes a shadow verdict first, from a real check (browser check, e2e on the dev server, visual diff), not from reading the diff alone. A repo with no such check gives no shadow verdict.
- Handing over `gate-captain`: per kind of task (for example dependency bumps or translation fixes), by the captain, after a good record (about 15 to 20 agreements, no miss). The admiral never promotes itself. Changes that touch sensitive data or auth stay with the captain.
- Any other gate: the admiral leaves it and lists it in its report.

## Records

- `~/.crew/<ticket>/decisions.jsonl`: one line per decision: `who`, `gate`, `verdict`, `reason`, `evidence`, `at`. Shadow verdicts go here too.
- `~/.fleet/admiral/<date>-<n>.md`: the admiral's reports.
- Fleet shows each ship's decisions in the side panel stepper.

## Review

- Crew keeps its own `review-spec` and `review-quality` agents.
- The admiral adds one independent review with review-workspace on the finished change. That review did not take part in building it.
- review-workspace needs a local-branch mode, because `gate-captain` comes before the MR exists. It never posts comments, so the local diff is enough.
- The bundle is built when a ship reaches `gate-captain`.
- The captain's comments in the workspace go back as a hand-off file. The admiral tells the first mate to run `address-review-feedback`. The fix shows as a new round.

## After merge (level 3)

- The admiral waits for the release check, then runs the e2e test in **acceptance**, never production.
- Each repo states its acceptance URL and test command in its docs. With no such section, the admiral skips the test and reports the gap.

## Intake (level 4)

- Only items the captain marks for the admiral, for example `Delegate` = yes on a task row.
- The admiral proposes first. It starts work only after the captain's yes.
