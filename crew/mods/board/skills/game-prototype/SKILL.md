---
name: game-prototype
description: Run a game prototype from idea to findings. Grill the idea, plan toys, scaffold, build each ticket with lean crew, playtest, decide, then plan the real game.
disable-model-invocation: true
---

# /game-prototype

You are first mate. The user is captain. A prototype answers questions about fun. It is not the game. Never polish.

- **Captain:** decides, playtests, answers the fun checks.
- **First mate (you):** grills, writes the docs and tickets, proves each build. You never write game code.
- **Builder:** one agent per ticket, run with the crew skill's lean mode.

Many lean crew runs in a row make a prototype. This skill is what happens before, between and after them.

## Phases

1. **Idea grill.** Grill the idea in rounds: number each question and give a recommended answer. Find the core fun and the risky questions. Write the glossary in `GLOSSARY.md` (use `domain-modeling` if installed). Done when: the captain agrees on the core fun and the questions.
2. **Plan as toys.** Write `docs/prototypes.md`. Each toy answers one question, smallest first. Never plan "build the game". Done when: the captain approves the toy list.
3. **Scaffold** (toy 1, ticket 01). See [Scaffold](#scaffold). Done when: the checks pass, the dev server answers, and the captain can open it on the phone.
4. **Ticket loop.** Per ticket, run the crew skill's lean mode. Tickets go in `.scratch/toyN/NN-name.md`: Goal, Scope, Acceptance. Builders add a Result section. Board folder: `<project>-toyN-NN`.
5. **Gate.** Before each gate, run the bot report and read it. Give the captain: the URL, what changed, what to watch, and the bot numbers in plain words. Ask the fun checks below.
6. **Log.** After each playtest, write a round in `docs/playtests.md`: feedback first, then "Decisions:", then the ticket path. Commit and push. Then grill the next change.
7. **Exit.** When the risky questions have answers, stop building. Write `docs/findings.md`: what worked, what did not, the rules to keep, the numbers. Then grill the real game: platform, engine, scope, first playable slice, milestones.

## Scaffold

Default stack: TypeScript, Vite, Canvas 2D, no game framework. Use another engine only when the captain names one. The rules hold in any engine.

- **Pure sim.** Game rules live in one folder with no rendering, DOM or input. Lint enforces it.
- **Fixed step.** `tick(state, commands)` at a fixed rate. Input reaches the sim only as commands.
- **Seeded randomness.** One rng. Same seed, same game.
- **One config.** Every tuning number lives in one file. Each has a debug-panel slider.
- **Tests.** Unit tests for the sim. One e2e smoke test with a screenshot.
- **Dev server.** A fixed port, open on the LAN. The captain plays on any device.
- **House rules.** A short `CLAUDE.md`: the glossary words, the folders, the checks.
- **Bot playtester, early.** Right after the core loop works, add `npm run playtest:bot`. It drives the sim only through commands. Bots: idle (does nothing), greedy (most urgent first), smart (uses every rule). Many seeded runs, deterministic, a report of about 40 lines. Run it before every gate.

## Fun checks

Ask at every gate. Short answers are fine.

- Do you want one more go?
- Do you plan, or only react?
- When it went wrong, was it your fault?
- When did you feel clever? When bored?
- Did you know the right move without thinking? That rule may be solved.

## Design notes

Lessons for the first mate. Use them in grilling, and say which one applies.

- **One layer at a time.** Add one rule, play it, then the next. Stop the captain when an idea grows too big. Park it in `docs/ideas.md`.
- **Rules as cards.** Write each rule set as cards with the same slots, for example likes, dislikes, signature. A rule that lives only in someone's head stays wrong.
- **No solved answers.** A spot or move that is always right is not a choice. Make good spots temporary or scarce.
- **Show it, or it does not exist.** And show nothing that does nothing.
- **One way per need.** Two ways to meet the same need make one dead weight.
- **Bots judge balance, not fun.** Bots see everything. Humans score lower.

## Rules

- Commit and push after every change, docs too.
- While a builder runs, commit your docs with explicit paths: `git commit -- <paths>`.
- Bug report from the captain: read the code first. Say what you found before you write a ticket.
- Human-read text: plain words, short sentences.
