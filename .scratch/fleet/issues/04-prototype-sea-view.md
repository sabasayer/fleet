# Prototype: the sea view

Type: prototype
Status: resolved
Blocked by: 02

## Question

How should the sea view look and behave? Decide the layout of fleets on the sea and the three zoom levels (armada, fleet, ship). Decide what each level shows (goal, status, each crew member's phase) and how the "needs captain" signal looks on a ship and in the list on every level. Use fake ship data and the tooling chosen in ticket 02.

## Answer

Prototype: `prototype/sea-view.html` on branch [`prototype/sea-view`](https://github.com/sabasayer/fleet/blob/prototype/sea-view/prototype/sea-view.html). Open the file and use `?variant=D`.

The captain picked variant D ("for now"). It mixes parts of A, B and C after the captain's feedback:

- **Lanes (from B).** Each fleet is one horizontal lane. Each ship has its own row in the lane, with its title on the left. The harbour is on the right edge.
- **One stone per crew member.** Each row shows a stone for each crew member in chain order. The stone colour is the member's state. The ship sits on the stone of the member who works now. When all members are done, the ship is at the harbour. At fleet and ship zoom, role names show under the stones.
- **Zoom levels.** Armada shows all lanes with small ships. Fleet shows one lane with role names. Ship shows one row with the crew faces. Click goes down a level, `Esc` goes up, and a breadcrumb shows where you are.
- **Right column, top: the needs-captain panel (from A).** It has a gold border and lists every ship that waits for the captain, with the reason.
- **Right column, below: the ships panel (from C).** It lists every ship, the ones that need the captain first. Each row has a small bar of crew states. A ship that waits shows a "Waiting for you: <reason>" line: gold for a gate or a question, red for a failure. Click a row to open the goal, the MR count, the crew table and "jump back".
- **The needs-captain signal on the sea.** A blinking gold `!` floats above the ship. The flag turns gold, or red when a member has failed.
- **The ship sprite.** A three-quarter top-down hull with the crew on deck. It reuses crew-board's hats, faces and state colours. The plain hull, mast and flag are new.
- **The sea.** Calm lane colour with a few faint, slow wave dashes. No foam dots: the captain found them busy, and in A they lined up into columns.

Rejected: the camera-zoom open sea (A) was messy and did not show crew progress. The armada views of A and C did not look good. The island chart (C) is gone, but C's panel stays.

What this means for other tickets:
- The ship file must hold a short, readable reason when the ship waits for the captain, for example "Gate: approve the MR" or "Question: may we raise the limit?". Without it the captain cannot rank the ships by priority.
- The ship file must hold the crew chain in order, with each member's state, so fleet can draw the stones.
- Open: what fills the empty space under the lane at ship zoom. The side panel may be enough.
