# Idea: scouts

Seed for the next map, after fleet v1. The captain asked for it on 2026-10-27.

A scout is a Claude session that looks into a bug report or a bug's cause before any crew run. See `GLOSSARY.md`.

## Decided

- Not part of fleet v1. Chart a small new map once v1 is in use.
- The word is "scout".
- A scout that finds work becomes the ship: same name, same Claude session. Its findings feed into `/crew`. One scout leads to at most one ship (a ship can already have several MRs across repos).
- A scout that finds nothing to fix goes to the harbour with a one-line outcome (for example "not a bug: config issue on acc").

## Decided on 2026-10-27 (for the spec gates)

- **Start:** a mode of `/crew`: `/crew scout: <bug report or link> fleet: <fleet>`. No new skill. Fleet's new-ship form gets a "scout" checkbox that sends this.
- **End:** the scout proposes "build it" or "turn back" with its findings. A new gate, `gate-scout`, waits for the captain. On "build it" the same session goes on into Fetch.
- **Findings:** the scout writes `~/.crew/<ship>/spec/scout.md`. Fetch reads it, and the spec grilling starts from it.
- **Ship file:** `crew-ship` writes a `scout` field in `ship.json`: `state` (`scouting`, `became_ship`, `turned_back`) and `outcome` (one line). A turned-back scout goes to the harbour with its outcome. Fleet still never writes crew files.
- **Sea:** a "scouting" zone left of "crew at work": a small boat, no crew stones. When the scout becomes a ship, it sails into "crew at work" as a normal ship.
- **Name:** the bug's ticket ID if the report has one (e.g. `ENG-812`), else `scout-<short slug>`. The name stays when the scout becomes a ship.

Split: the crew ship builds the `/crew scout:` mode, `gate-scout`, `scout.md` and the `scout` field in `crew-ship`. The fleet ship builds the scouting zone, the boat, the harbour outcome and the form checkbox.
