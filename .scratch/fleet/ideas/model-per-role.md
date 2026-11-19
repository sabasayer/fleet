# Idea: a model for each crew role

Seed for a later ticket. The captain agreed to it on 2026-11-19.

Today the captain picks Sonnet by hand for build tickets, to save usage limits. The choice lives in the captain's head. Fleet and crew do not know it.

## Idea

- A small config maps each crew role to a model: `build`, `red`, `green`, `review-*`, `fixer`, `browser`, `spike`.
- The first mate reads the config when it spawns an agent. A missing role uses the default.
- Fleet shows the model on each boat's crew member, so the captain sees where tokens go.
- The new-ship form can override the config for one ship.

## Open questions

- Where does the config live: `~/.crew/config.json` (next to the Linear rule) or each repo's docs?
- Does the admiral pick models for the ships it starts?
- Should the adversary review agent default to a second model, as pstack does?

## Not decided

Cost. The adversary on a second model costs more tokens. Keep it opt-in until the numbers are known.
