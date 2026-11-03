# Fleet: search and filter ships

Type: build (lean)
Status: done
Blocked by:

## Goal

The captain finds a crew run fast by its ticket ID, MR number or title. The captain can show only the ships in one state, for example only the ones that need him.

## Scope

**Search**

- A text box at the top of the right column. `/` moves the focus into it. `Esc` clears it and leaves the box. Other keys do nothing while you type (fleet already works this way for form fields).
- A ship matches when the text is part of any of these, ignoring case: the ship name, the title, the task link (so a Linear ID like `ENG-3067` matches), each MR's number (`561` or `!561`), each MR's URL and each MR's branch.
- Search includes harbour ships, including the ones the harbour hides after 3 days.
- While search or a filter is on, the right column shows one result list of the matching ships. Each row looks like a ships-panel row. A click, or `Enter` on the row under the cursor, zooms to that ship, as a panel click does today. On the sea, ships that do not match are dimmed.

**Filter**

- One row of chips under the search box. Only one chip is on at a time. Each chip shows its count, for example `merged (4)`. The counts follow the search text.
- Chips:
  - `all`: no filter (default).
  - `needs you`: the ship has the needs-captain flag.
  - `running`: the ship is `sailing` and does not need the captain. Scouts that are still scouting count here.
  - `stale`: at least one crew member is stale (the `stale` field from `src/board.ts`).
  - `in review`: stage `in_review`.
  - `merged`: stage `merged` or `released`. Both mean "merged, waiting for the captain's test".
  - `testing`: stage `testing`.
  - `done`: stage `done`, including turned-back scouts.
  - `paused/failed`: paused, failed or abandoned.
- Search and the chip work together: a ship must match both.
- Neither the text nor the chip is kept over a reload.
- No keys for the chips.

**Demo data**

- Add demo ships in `fixtures/demo` (and its fleet home in `fixtures/demo-home`, if the state lives there) so that every chip has at least one ship in `npm run demo`, including one stale crew and one merged ship.

**Docs**

- README: a short "Search and filter" section, and `/` in the key table.

Not in scope: number keys for chips, saving the filter, search inside crew members' summaries.

## Acceptance

- Unit tests for the match rule (name, title, Linear ID in the task link, `!561`, branch, no match) and for each chip's rule and the counts.
- A UI test in the style of the existing `test/*-ui.test.ts` files: search text narrows the list, a chip narrows it, both together, `Esc` clears.
- `npm test` passes.

Decisions came from the captain on 2026-11-03. Two calls were made by the first mate where the captain's list was silent: `released` counts under `merged`, and `abandoned` counts under `paused/failed`.

## Result

What changed:

- New `web/search.js`: match rule, chip rules, counts, chip row, search keys. Unit tests in `test/search.test.ts`, including the result list in the panel.
- `web/panel.js`: with search or a chip on, the right column shows one "results" list. Rows are the usual ship rows. Harbour ships use the harbour row.
- `web/main.js`: search state, `/` focus, `Esc`, arrows and `Enter` inside the box, chip clicks, dimming on the sea.
- `web/sea.js`: ships that do not match draw at 25% opacity.
- `src/page.ts`: search box and chip row at the top of the right column. The ship list scrolls under it.
- `web/keys.js`: `/` key and key list entry.
- `fixtures/demo`: new ship PORTAL-111 with a stale crew member. Every chip now has at least one ship.
- README: "Search and filter" section and `/` in the key table.

Choices where the ticket was silent:

- `Esc` clears the text and leaves the box. It keeps the chip.
- In the box, `↑` and `↓` move a highlight over the results. It starts on the first row. `Enter` opens the highlighted row and leaves the box, so the ship keys work.
- A harbour row opens its detail in place, as it does today. A sea row zooms to the ship.
- Chip rules use the stage for stage chips and the state for `paused/failed`. A paused ship in review shows under both `in review` and `paused/failed`. `stale` ships also show under `running` when they are sailing.
- Search covers all fleets, whatever the zoom level. Result rows show the fleet name.
- Clicking a chip that is already on keeps it on. Click `all` to clear.
- The search box hides with the right column when there are no ships.
