# Prototype: ship zoom with several MRs

Type: prototype
Status: parked
Blocked by: 04

## Question

This ticket refines the look of the v1 UI. It builds on the real code, not the throwaway prototype. The spec already says what each case does; this ticket decides how it looks.

What does ship zoom show? Build on the sea view (variant G) and settle these:

- **Several MRs.** How do a ship's MRs show, each with its own state? The ship's state is its least advanced MR (see the ship lifecycle ticket). This includes a feature across several repos, where the MRs have different repos. This may also fill the empty space under the lane at ship zoom.
- **Stale crews.** Fleet copies crew-board's stale check. How does "this crew has gone quiet" look on the sea, in the lane and in the panel? How does it differ from "needs captain"?
- **Automatic steps that cannot run.** How does fleet show why a step waits for a person? For example: `glab` or `gh` is missing, so the captain marks "merged" by hand. Or the release check failed or timed out (60-second limit).

## Seen in use (2026-10-27)

The overlap is now a bug ticket: [Fleet: the sea fits long crews and any window width](11-fleet-sea-fits-long-crews.md). This ticket keeps only the several-MRs question.

## Parked (2026-11-03)

No real ship has used two MRs yet, so this waits. The captain chose a new word: a **convoy** (see `GLOSSARY.md`). It replaces "one ship with several MRs".

Proposed, not yet confirmed by the captain:

1. The first mate makes a convoy when it starts a second MR for the same ticket. A ship alone is not a convoy.
2. One ship is one MR. The "least advanced MR" rule in `src/life.ts` goes away.
3. Every ship in a convoy jumps back to the same first-mate session.
4. On the sea, convoy ships sail close together in the fleet's lane, joined by a line or flag. The panel shows the convoy name with its ships under it.
5. A bug found in testing is a new ship in the same convoy.

Start again when the first real multi-MR run comes. Stale crews and "why does this step wait" become their own tickets.
