---
name: admiral
description: Start one crew ship per repo for the same piece of work, as real sessions the captain can jump to. Use when the captain says "admiral", or asks to run one task across several repos as separate crew runs.
disable-model-invocation: true
---

# /admiral

```
/admiral <task> repos: <names, or a folder plus a rule> fleet: <fleet> [auto: plan] [--yes]
```

You act for the captain. This is level 1 of the design in `~/Private/fleet/docs/admiral.md`: you start ships and exit. You do not watch them, and you never answer their gates.

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

One line per ship: ship name, repo, `started` or the failure message. For a failure, add the exact `curl` line to run again. Then: "Open fleet to jump to any ship. Gates show there." Nothing else.
