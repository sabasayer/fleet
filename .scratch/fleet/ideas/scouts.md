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

Settled in the grilling of 2026-10-29, built in the fleet repo (ship `scouts-fleet`):

- Fleet derives the phase from `kind`, the MR list and `outcome`, in that order.
  `kind` on its own is the wrong test: a scout that finds work keeps `kind`.
- A scouting scout sails in a band cut from the left of the crew band, 15% of
  the lane. The four zone edges do not move. Press `s` to turn the band on or
  off. It is on by itself when a scout is at sea. The key is not kept over a
  reload.
- The boat has no sail and no crew stones. It flies a small flag in the fleet
  colour, so it reads at a glance (the captain asked for the flag on 2026-10-30).
- A turned-back scout docks on its own. Fleet writes the dock time in
  `~/.fleet/ships/<ship>.json`, because the outcome line carries none.
- The harbour row shows the outcome in place of the MR count, and has no state
  buttons. To put a scout back on the sea, crew runs `crew-ship add-mr`.
- The lane head reads `N ships · 1 scout`. A scout is not in the ship count.
- The new ship form has a `Scout first` checkbox. It runs
  `/scout <task> fleet: <fleet>` and prefixes the tab name with `scout-`.
- A scout cannot raise a beacon. It writes no status files, and the beacon reads
  them. Recorded in `docs/adr/0001-a-scout-has-no-run-folder.md`.

## Nothing open
