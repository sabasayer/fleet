# Idea: scouts

Seed for the next map, after fleet v1. The captain asked for it on 2026-10-27.

A scout is a Claude session that looks into a bug report or a bug's cause before any crew run. See `GLOSSARY.md`.

## Decided

- Not part of fleet v1. Chart a small new map once v1 is in use.
- The word is "scout".
- A scout that finds work becomes the ship: same name, same Claude session. Its findings feed into `/crew`. One scout leads to at most one ship (a ship can already have several MRs across repos).
- A scout that finds nothing to fix goes to the harbour with a one-line outcome (for example "not a bug: config issue on acc").

## Open

- Who writes the scout's file. Fleet never writes crew files, so crew (a `/scout` skill, or a mode of `/crew`) must write it, probably with `crew-ship`.
- How a scout shows on the sea: its own zone left of "crew at work", or a small boat on the ship's row.
- How the captain starts one: a "scout" choice in the new-ship form, a command in Claude, or both.
- How the findings reach the crew: in the ship file, in the spec folder, or only in the session.
- How the scout records its outcome when it finds nothing.
