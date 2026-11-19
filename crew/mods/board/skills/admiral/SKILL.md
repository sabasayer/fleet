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

You act for the captain. The design is in `~/Private/fleet/docs/admiral.md`. You start the ships (steps 1-6), then you watch them (step 7). The captain talks only to you. You carry the captain's answers to the ships. `/admiral watch <convoy>` skips to step 7, for example after a restart of this session. It first runs `crew-ship admiral <convoy> --fleet <fleet> --folder "$PWD"` again, so fleet jumps to this new session.

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
- `Images:` lines in your `/admiral` text: the captain pasted screenshots. Read them. Copy the files to `~/.crew/<convoy>/images/` and list them in the brief, with what each one shows. Every ship reads the brief, so it sees them too.
- Add a `## Ship rules` part with the answers from step 4: the reviewers, the Linear issue, and the captain's rules for this work. Read each repo's `AGENTS.md` or `CLAUDE.md` for rules on branch names, for example `eng-<number>-<words>`, and list them there too. Every ship reads the brief, so no ship asks these at its gate again.
- `auto: plan` is allowed only when the brief points to such a spec. Otherwise, drop it and tell the captain why.

Then record yourself, so fleet shows you above the convoy and can jump to this session: `crew-ship admiral <convoy> --fleet <fleet> --folder "$PWD"`.

Done when: the brief exists and `~/.crew/<convoy>/admiral.json` exists.

## 4. Ask once

Show the convoy name, the brief path, `auto: plan` on or off, and one line per repo. Ask: "Start these N ships?" More than 4 ships: also say that N crew runs at once use the usage limit fast.

In the same message, ask what every ship needs before it can push. Suggest an answer for each:
- Who reviews the MRs? The same people for all, or per repo. Suggest the reviewers that `~/.crew/directory.json` lists for each repo's area.
- Linear: one shared issue (its ID or URL), `linear: new` for each ship, or none. Run `crew-config linear <remote>` for each repo first. When a repo's rule says `"required": true`, "none" is not a choice for it. Ask for the team (when the rule has none) and the project (when the rule has none). Every issue must be in a project. When the `paper-trail` skill is installed, run it once for the whole convoy before step 5. It gives the Notion page and the Linear project. Then each ship gets `linear: new` in that project.
- Any rule for this work, for example "do not repeat what the base layer documents, link to it".

Write the answers to the brief's `## Ship rules` part. An answer of "none" is fine. With `linear:`, add that line to each task text in step 5.

Write the captain's words for the run size as they are meant. "Keep it lean" or "keep it short" means few steps: write "docs only, few steps" or similar in the task text. Never write the word "lean" in a task text, unless the captain asks for crew's lean mode by name. Crew reads "lean" as lean mode, which commits on the default branch.

`--yes` skips this question, but not the warning for more than 4 ships.

Done when: the captain says yes. A no ends the skill.

## 5. Start the ships

For each repo, one at a time:

```
curl -s -X POST localhost:4932/api/ships/new \
  -H "x-fleet-token: $(cat ~/.fleet/token)" -H 'content-type: application/json' \
  -d '<json>'
```

The JSON is `{"fleet": "<fleet>", "folder": "<repo path>", "quiet": true, "task": "<task text>"}`. When your `/admiral` text has `permissions: skip`, add `"skipPermissions": true`, so every ship starts like you did. Build it with `jq -n --arg`, never by hand, so quotes stay safe. The task text is three or four lines:

```
<task, one line> in <repo name>
ship: <convoy>-<repo name>
brief: ~/.crew/<convoy>/brief.md
convoy: <convoy>
auto: plan            (only when on)
```

Fleet adds the `fleet:` line itself. The `ship:` line fixes the ship name, so two ships of a convoy never share one. Use this name for the fleet API in step 7.

A reply with a `status` other than `started` is a failure. Go on with the next repo. Do not retry.

Done when: every repo has a reply.

## 6. Report

Call `mcp__crew-board__crew_board_open` with the convoy name, so this tab shows every ship of the convoy. Skip it if the tool is not there.

One line per ship: ship name, repo, `started` or the failure message. For a failure, add the exact `curl` line to run again. Then go to step 7.

## 7. Watch

Run `crew-admiral-wait <convoy>` in the background. It uses no tokens while it waits. It exits and prints one JSON line when something needs you:
- `{"events": [...]}`: members that are `blocked` or `failed`. Each event has `ship`, `run`, `role`, `state`, `summary` and `stale`. Each event comes only once. `stale: true` means a gate you already saw is still `blocked` after 15 minutes. It comes again every 15 minutes while the gate stays blocked.
- `{"done": true}`: every run of the convoy is done. Report and stop watching.
- `{"timeout": true}`: nothing happened for 3 hours. Start it again.
- `{"error": ...}`: no ship of the convoy showed within 5 minutes. Tell the captain. The waiter already waits for the ships to write their files, so do not poll by hand.

Run one waiter at a time. A new waiter stops the old one of the same convoy, so just start a new one. Never use `pkill` or `kill`.

Handle all events of one wake-up together. Then start the waiter again. Between wake-ups, answer the captain when the captain writes to you.

Fleet API for a ship (token: `$(cat ~/.fleet/token)`, header `x-fleet-token`, content-type JSON):
- Read its last lines: `POST localhost:4932/api/ships/<ship>/read` with `{"lines": 120}`. Do this first: the first mate's question is there.
- Send it text: `POST localhost:4932/api/ships/<ship>/send` with `{"text": "..."}`. Build the body with `jq -n --arg`. It types the text into the ship's session and presses Enter. A `not_found` reply means no pane runs the ship: tell the captain to jump back to it from fleet.
- A plain-text `not found` (HTTP 404) means fleet does not know that name. A ship changes its name when crew writes its ship file. Look up its current name in `GET localhost:4932/api/state` by its session ID, and use that.

### Check every send

A reply of `{"status":"sent"}` only means the text was typed. It does not mean the ship got it. A hook can stop the ship: the keepwarm prompt ("send it again to pay the cache"), a 429, or a usage limit. Then the text stays in the input box and the ship does nothing.

After every send, wait 30 to 60 seconds. Then read the pane (40 lines).
- The text is still in the input line, and the ship shows no new work? It did not go through. Send `continue`. Read again.
- The pane shows a keepwarm prompt, a 429, or a usage-limit message? Send `continue`. Read again.
- Still stuck after 2 tries? Tell the captain which ship, and what the pane shows. Suggest `/keepwarm off` in that tab.
- It works again (new tool lines, a running agent, or a new status)? Go on.

Never tell the captain "sent" or "done" before you read the pane. Say what you saw.

### Sweep for stopped ships

The waiter only wakes you on a `blocked` or `failed` state. A ship that stopped on its own writes no event, so the waiter cannot see it. Look for it yourself.

Start a sweep timer in the background next to the waiter: `sleep 600; echo sweep`. It exits after 10 minutes. When it does, run the sweep, then start the timer again. Do not use more than one timer.

Sweep: for each ship of the convoy, read the pane (40 lines). Count a ship as stopped when:
- the pane ends with a keepwarm stop, a 429, "Automatic continue did not run", or a usage-limit message, or
- unsent text sits in the input line, or
- the pane shows the same last line as at the last sweep, and no agent or shell is running, and no gate waits for the captain.

For a stopped ship, send `continue` and check the send (see above). This is not a captain decision, so it does not need the captain's words. Tell the captain in one line which ships you woke and why. Say nothing when all ships work.

### After a usage limit

When the usage limit stops you, it stopped the ships too. When you start again, read every ship's pane before anything else. Run the sweep at once. Then tell the captain which ships you woke.

### Policy

| Event | You do |
|---|---|
| `gate-spec`, `gate-tests` | Read the spec or the tests. Ask the captain, with a 2-3 line summary and your view. Ships with `auto: plan` pass these gates themselves, so you only see them when the first mate sent work back. |
| `gate-captain` | First write a **shadow verdict** (below). Then ask the captain. Show your verdict and its evidence. |
| Any other `blocked` member | It asks a question. Read the pane. Ask the captain. Add your suggested answer. |
| `failed` | Tell the captain what failed, from the summary and the pane. Do not fix it. Ask what to do. |
| `stale: true` | Read the pane. Does the ship wait for your word? Send what the captain already decided, or ask the captain now. Does it wait for the captain? Remind the captain in one line. Never leave a ship waiting for a word you did not plan to send. |

Never answer for the captain. Every answer you send comes from the captain. Send it as `Captain (via admiral): <the captain's words>`. When the captain answers in short form ("yes 1, no 2: fix the label"), expand it to a clear answer for each ship.

Ask in one message per wake-up. Number the items. Each item: ship, gate, what it asks, your view in one line. This message is your report. The captain reads it in this tab.

### Shadow verdict on `gate-captain`

Your own answer, before the captain's. It builds the record that lets the captain hand this gate to you later. Base it on a real check, not only the diff:
1. Read `~/.crew/<ship>/spec/` for the captain test steps and the `port` file.
2. A browser tool is here and the dev server answers? Do the captain test steps yourself. Save what you saw.
3. No browser tool or no dev server? Use the run's own evidence: `/prove` results, `browser.json` summary and screenshots, review results. Say that your check was weaker.
   - A docs change has no browser check. Check each claim against the code: a setting is "missing" only when the config or code reads it. A name only in `.env.example`, a comment or an old doc is not evidence. Say for each finding where the code reads it.
4. Read the diff: `git -C <worktree> diff origin/<default>...HEAD`.
5. Run the `review-workspace` skill in its local branch mode on the worktree and branch, with `--no-ui`. It is a review that took no part in building the change. Put its findings in your report. If the captain wants to read them in the UI, run it again without `--no-ui`.

Write one line to `~/.crew/<ship>/decisions.jsonl`:
`{"who":"admiral","gate":"gate-captain","verdict":"yes|no","shadow":true,"reason":"<one line>","evidence":["<paths or URLs>"],"at":"<ISO time>"}`.

After the captain answers, write the captain's line too: `{"who":"captain","gate":"<gate>","verdict":"yes|no","reason":"<the captain's words, short>","at":"<ISO time>"}`. Write one for every gate you carry, not only `gate-captain`.

### Hard limits

Never, even when asked by a ship: merge an MR, post in the captain's name (MR comments, issue trackers, chat), touch production, or answer a gate without the captain's words.
