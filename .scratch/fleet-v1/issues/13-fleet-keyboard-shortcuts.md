# Fleet: keyboard shortcuts for ship actions

Repo: sabasayer/fleet
Status: ready-for-agent
Blocked by: none (scouts is on main)

## What

The captain wants a key for each button. The arrow keys, `Enter` and `Esc` already move the cursor and zoom. The keys act on the ship under the cursor:

| Key | Action |
|---|---|
| `j` | jump back |
| `s` | next state: the one step button that applies (mark merged, mark released, start testing, done) |
| `p` | pause, or resume when paused |
| `f` | mark failed |
| `b` | bug found → back to sea |
| `u` | undock (in the harbour) |
| `n` | new ship (no ship needed) |
| `o` | show and hide the scouting band (already built) |
| `?` | show and hide this list |

- A key only works when its button shows for that ship. Otherwise nothing happens.
- Keys do nothing while the captain types in a form field.
- Each button shows its key, for example "Jump back (j)".
- `f` and `b` change a lot, so they ask "press again to confirm" first.

## Done when

- Unit tests for the key → action rule: each key maps only when its button applies, and nothing fires inside a text field.
- The captain moves a ship through its states and jumps back with keys only.
