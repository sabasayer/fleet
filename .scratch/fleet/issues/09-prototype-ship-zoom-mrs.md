# Prototype: ship zoom with several MRs

Type: prototype
Status: open
Blocked by:

## Question

This ticket refines the look of the v1 UI. It does not block the v1 build tickets in `.scratch/fleet-v1/`: the spec already says what each case does, and this ticket decides how it looks. The captain will take it later, together with the other prototypes.


What does ship zoom show? Build on the sea view (variant G) and settle these:

- **Several MRs.** How do a ship's MRs show, each with its own state? The ship's state is its least advanced MR (see the ship lifecycle ticket). This includes a feature across several repos, where the MRs have different repos. This may also fill the empty space under the lane at ship zoom.
- **Stale crews.** Fleet copies crew-board's stale check. How does "this crew has gone quiet" look on the sea, in the lane and in the panel? How does it differ from "needs captain"?
- **Automatic steps that cannot run.** How does fleet show why a step waits for a person? For example: `glab` or `gh` is missing, so the captain marks "merged" by hand. Or the release check failed or timed out (60-second limit).
