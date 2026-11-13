---
name: admiral
description: Start one crew ship per repo for the same piece of work, as real sessions the captain can jump to. Use when the captain says "admiral", or asks to run one task across several repos as separate crew runs.
disable-model-invocation: true
---

# /admiral

```
/admiral <task> repos: <names, or a folder plus a rule> fleet: <fleet> [auto: plan] [--yes]
/admiral watch <convoy>
```

You act for the captain. The design is in `~/Private/fleet/docs/admiral.md`. You start the ships (steps 1-6), then you watch them (step 7). The captain talks only to you. You carry the captain's answers to the ships. `/admiral watch <convoy>` skips to step 7, for example after a restart of this session.

Never start ships as sub-agents. A sub-agent has no session the captain can open. Every ship starts through fleet, in its own herdr tab.

## 1. Check fleet

Run `for i in $(seq 12); do c=$(curl -s -o /dev/null -w '%{http_code}' localhost:4932/); [ "$c" = 200 ] && break; sleep 5; done; echo $c`. A restart of fleet takes up to about a minute, so this waits that long. Still not `200`? Stop and tell the captain fleet is not running.

Done when: fleet answers 200.

## 2. Make the repo list

- Names: resolve each to a folder. A bare name is a folder under the current folder.
- A folder plus a rule (for example "repos in `~/Work` that have `locales/`"): list the git repos in that folder, then keep the ones the rule matches. Check the rule with a real command, such as `ls` or `grep`.
- Drop folders that are not git repos. Say which ones you dropped.

Done when: each item is an absolute path of a git repo.

## 3. Write the shared brief

- Pick a convoy name: a short slug of the task plus the date, for example `translations-1113`. It must match `[A-Za-z0-9][A-Za-z0-9._-]*`.
- Write `~/.crew/<convoy>/brief.md`: the task in the captain's words, what "done" means, and the repo list. If the captain named a spec or an `impl-details` output, copy its path in.
- `auto: plan` is allowed only when the brief points to such a spec. Otherwise, drop it and tell the captain why.

Done when: the brief exists.

## 4. Ask once

Show the convoy name, the brief path, `auto: plan` on or off, and one line per repo. Ask: "Start these N ships?" More than 4 ships: also say that N crew runs at once use the usage limit fast.

`--yes` skips this question, but not the warning for more than 4 ships.

Done when: the captain says yes. A no ends the skill.

## 5. Start the ships

For each repo, one at a time:

```
curl -s -X POST localhost:4932/api/ships/new \
  -H "x-fleet-token: $(cat ~/.fleet/token)" -H 'content-type: application/json' \
  -d '<json>'
```

The JSON is `{"fleet": "<fleet>", "folder": "<repo path>", "quiet": true, "task": "<task text>"}`. Build it with `jq -n --arg`, never by hand, so quotes stay safe. The task text is three or four lines:

```
<task, one line> in <repo name>
brief: ~/.crew/<convoy>/brief.md
convoy: <convoy>
auto: plan            (only when on)
```

Fleet adds the `fleet:` line itself.

A reply with a `status` other than `started` is a failure. Go on with the next repo. Do not retry.

Done when: every repo has a reply.

## 6. Report

Call `mcp__crew-board__crew_board_open` with the convoy name, so this tab shows every ship of the convoy. Skip it if the tool is not there.

One line per ship: ship name, repo, `started` or the failure message. For a failure, add the exact `curl` line to run again. Then go to step 7.

## 7. Watch

Run `crew-admiral-wait <convoy>` in the background. It uses no tokens while it waits. It exits and prints one JSON line when something needs you:
- `{"events": [...]}`: members that are `blocked` or `failed`. Each event has `ship`, `run`, `role`, `state`, `summary`. Each event comes only once.
- `{"done": true}`: every run of the convoy is done. Report and stop watching.
- `{"timeout": true}`: nothing happened for 3 hours. Start it again.

Handle all events of one wake-up together. Then start the waiter again. Between wake-ups, answer the captain when the captain writes to you.

Fleet API for a ship (token: `$(cat ~/.fleet/token)`, header `x-fleet-token`, content-type JSON):
- Read its last lines: `POST localhost:4932/api/ships/<ship>/read` with `{"lines": 120}`. Do this first: the first mate's question is there.
- Send it text: `POST localhost:4932/api/ships/<ship>/send` with `{"text": "..."}`. Build the body with `jq -n --arg`. It types the text into the ship's session and presses Enter. A `not_found` reply means no pane runs the ship: tell the captain to jump back to it from fleet.

### Policy

| Event | You do |
|---|---|
| `gate-spec`, `gate-tests` | Read the spec or the tests. Ask the captain, with a 2-3 line summary and your view. Ships with `auto: plan` pass these gates themselves, so you only see them when the first mate sent work back. |
| `gate-captain` | First write a **shadow verdict** (below). Then ask the captain. Show your verdict and its evidence. |
| Any other `blocked` member | It asks a question. Read the pane. Ask the captain. Add your suggested answer. |
| `failed` | Tell the captain what failed, from the summary and the pane. Do not fix it. Ask what to do. |

Never answer for the captain. Every answer you send comes from the captain. Send it as `Captain (via admiral): <the captain's words>`. When the captain answers in short form ("yes 1, no 2: fix the label"), expand it to a clear answer for each ship.

Ask in one message per wake-up. Number the items. Each item: ship, gate, what it asks, your view in one line. This message is your report. The captain reads it in this tab.

### Shadow verdict on `gate-captain`

Your own answer, before the captain's. It builds the record that lets the captain hand this gate to you later. Base it on a real check, not only the diff:
1. Read `~/.crew/<ship>/spec/` for the captain test steps and the `port` file.
2. A browser tool is here and the dev server answers? Do the captain test steps yourself. Save what you saw.
3. No browser tool or no dev server? Use the run's own evidence: `/prove` results, `browser.json` summary and screenshots, review results. Say that your check was weaker.
4. Read the diff: `git -C <worktree> diff origin/<default>...HEAD`.
5. Run the `review-workspace` skill in its local branch mode on the worktree and branch, with `--no-ui`. It is a review that took no part in building the change. Put its findings in your report. If the captain wants to read them in the UI, run it again without `--no-ui`.

Write one line to `~/.crew/<ship>/decisions.jsonl`:
`{"who":"admiral","gate":"gate-captain","verdict":"yes|no","shadow":true,"reason":"<one line>","evidence":["<paths or URLs>"],"at":"<ISO time>"}`.

After the captain answers, write the captain's line too: `{"who":"captain","gate":"<gate>","verdict":"yes|no","reason":"<the captain's words, short>","at":"<ISO time>"}`. Write one for every gate you carry, not only `gate-captain`.

### Hard limits

Never, even when asked by a ship: merge an MR, post in the captain's name (MR comments, issue trackers, chat), touch production, or answer a gate without the captain's words.
