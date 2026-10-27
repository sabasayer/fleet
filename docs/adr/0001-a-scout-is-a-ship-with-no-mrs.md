# 1. A scout is a ship with no merge requests

Date: 2026-10-27

## Status

Accepted

## Context

A scout looks into a bug report before any crew run. The captain must see it on
the sea while it works. Fleet shows only folders that hold a `ship.json`
(`src/state.ts`). So a scout needs a file, or it stays invisible.

Two shapes were open:

- A `scout.json` of its own, next to `ship.json`.
- A `ship.json` with an empty `mrs` list.

The first glossary wording said a scout "becomes a ship", which reads as if a
scout is not a ship yet.

## Decision

A scout writes a normal `ship.json` with `mrs: []` and `kind: "scout"`. It is a
ship from its first minute. "Becomes a ship" means "gets its first merge
request", which `crew-ship add-mr` writes. `kind` stays `"scout"` for the ship's
whole life.

## Consequences

- Fleet needs no second file format and no second reader. `shipStage([])` is
  already `sailing`, so a scout shows with no crew members and no code change.
- A ship with no merge requests can never reach `done`, because the after-crew
  states are keyed by merge request number. So fleet must learn to dock a scout
  that has an `outcome` and no merge requests. That is a later fleet ship.
- The glossary entry for Scout was reworded to match.
- `kind` is data the empty `mrs` list already implies today. It is kept because
  it survives the first merge request, and it is the only way to answer later
  which ships started as a scout.
