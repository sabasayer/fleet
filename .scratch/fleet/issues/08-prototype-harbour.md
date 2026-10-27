# Prototype: the harbour and a ship whose crew stopped

Type: prototype
Status: resolved
Blocked by:

## Question

How does a ship look at sea once its crew stops (`in_review`, `merged`, `released`, `testing`), so that "waiting on others" differs from "crew at work"? How do `paused`, `failed` and `abandoned` look? How does the harbour look, where is it on the sea, and how many days do done ships stay before fleet hides them? Build on the sea view prototype.

## Answer

Prototype: variants E, F and G in [`.scratch/fleet/prototype/sea-view.html`](../prototype/sea-view.html). Open the file with `?variant=G`. All three build on the sea view (variant D).

The captain picked **G**. **F** is a good second choice. The captain accepted the rest as built ("all good for now").

**The harbour (G).**
- Done ships leave the sea. They are listed in a "harbour" part of the right panel, not drawn on the sea. The captain's reason: the harbour can get busy, so the sea should not show every done ship.
- Each harbour row shows the title, the fleet, "docked N days ago" and the MR count. It opens like any other ship row.
- Done ships stay for a set number of days, then hide. The panel shows "+N hidden". The prototype has a 1, 3 or 7 day switch, with 3 days as the default.
- Second choice (F): one shared harbour strip at the bottom of the sea, with done ships in their fleet's colour. Only that fleet's ships show at fleet zoom.
- Rejected (E): a dock at the end of each lane.

**The route after the crew (G).**
- The lane has two parts: "crew at work" on the left, with the crew stones, then lighter, still water split into four labelled zones: in review, merged, released, testing.
- A ship whose crew stopped sits in its stage's zone.

**How a ship looks once its crew stops.**
- While the crew works: the sail is up, the flag flies at the top, and the running crew hop.
- Once the crew stops (`in_review`, `merged`, `released`, `testing`): the sail is rolled up, the flag is at half-mast, and the crew sit still. A coloured tag under the title says who it waits on: "in review", "merged", "released · test it", "testing". The panel gives the long form, for example "in review · waiting on reviewers".
- `paused`: dimmed, with an anchor at the bow. Tag "paused by you".
- `failed`: red flag and red tag. It stays at sea until the captain acts.
- `abandoned`: a grey wreck with a broken mast, half see-through. It hides after the same number of days as done ships.
- `released` is a soft cue ("ready for you to test"), not a gold "needs captain" flag.
- The "needs captain" `!` and panel entry show only for ships whose crew is at work.

**The state buttons.**
- An open ship in the panel has buttons that match the lifecycle ticket: "mark merged" (when no CLI works), "mark released" (when there is no release check), "start testing", "done → harbour", "bug found → back to sea", "pause", "resume", "mark failed", "back to sea", "undock".
- Each button moves the ship with the same animation as the zoom. "done" folds the ship out of its lane and into the harbour.
- The panel shows "fleet checks the MR host" where the step is automatic.
- Keyboard navigation moves only between ships at sea.

**Open, for later.** The default number of days (3 in the prototype) may change once the captain uses it. A busy harbour may need a search or a group per fleet in the panel.
