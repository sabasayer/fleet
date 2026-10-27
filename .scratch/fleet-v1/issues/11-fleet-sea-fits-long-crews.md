# Fleet: the sea fits long crews and any window width

Repo: sabasayer/fleet
Status: ready-for-agent
Blocked by: the `scouts-fleet` crew ship (it changes `web/sea.js` and `web/layout.js`)

## What

Seen in use on 2026-10-27, with real crews of 11 members (ENG-711, scouts-crew, scouts-fleet) at fleet and ship zoom:

- The role names under the stones overlap each other.
- The ship sprite covers the ship's title and ID on the left.
- The "need you" badge covers the start of "crew at work".
- Long titles wrap into three lines and run into the ship.

Make the sea layout follow the space it has, not fixed sizes:

- The stones share the width of the "crew at work" part. The ship and the stones stay to the right of the label column.
- When role names do not fit, shorten them, show them only for the current member and the cursor, or turn them; never let them overlap.
- Labels keep to their column: the ID and one or two lines of title, cut with "…".
- Check at 1280, 1440 and 1920 px wide, and on a Retina screen.

## Done when

- A unit test for the layout math: no two role labels overlap, and the ship never starts left of the label column, for 3, 8 and 12 members at those widths.
- The captain checks it in the browser with real ships.
