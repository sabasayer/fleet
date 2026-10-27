# Idea: scouts

Seed for the next map, after fleet v1. The captain asked for it on 2026-10-27.

A scout is a ship with no merge request yet. See `GLOSSARY.md` and
`docs/adr/0001-a-scout-is-a-ship-with-no-mrs.md`.

## Decided

- Not part of fleet v1. Chart a small new map once v1 is in use.
- The word is "scout".
- A scout that finds work gets its first merge request: same ship name, same
  terminal tab, fresh context. One scout leads to at most one ship.
- A scout that finds nothing leaves a one-line outcome, for example
  "not a bug: config issue on acc".

Settled in the grilling of 2026-10-27, built in the crew repo (ship `scouts-crew`):

- A scout writes a normal `ship.json` with `mrs: []`, `kind: "scout"` and
  `outcome: null`. Fleet reads it today with no change.
- Crew gets a `/scout` skill, not a mode of `/crew`. It ends by running `/clear`
  and then `/crew` in the same tab.
- `crew-ship scout <ship> --title T --fleet F [--task LINK]` creates the file.
  `crew-ship outcome <ship> "<line>"` sets the outcome. `add-mr` clears it.
- A scout takes no repo. The repo is decided when the work is found.
- The findings go in `~/.crew/<ship>/scout.md`, next to `ship.json`. It outlives
  the spec folder.
- A scout writes no status files. There is no run folder before the first MR.

## Open, for fleet

- How a scout shows on the sea: its own zone left of "crew at work", or a small
  boat on the ship's row. A scout has no crew members, so the "crew at work"
  part is empty.
- **Docking a scout.** A ship with no merge requests can never reach `done`:
  the after-crew states are keyed by merge request number. Fleet must dock a
  ship that has an `outcome` and an empty `mrs` list. `mark_failed` is wrong in
  meaning; "not a bug" is not a failure.
- How the captain starts one: a "scout" choice in the new-ship form. The command
  shape is `claude --session-id <uuid> -n <ship> "/scout <report> fleet: <fleet>"`,
  the same shape fleet already uses for `/crew`.
