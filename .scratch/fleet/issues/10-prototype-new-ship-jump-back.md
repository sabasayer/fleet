# Prototype: new ship and jump-back feedback

Type: prototype
Status: open
Blocked by:

## Question

What does the captain see after clicking? Build on the sea view (variant G) and settle these:

- **The new-ship form.** It has three fields: the fleet (pick one or type a new name), the repo folder (pick one or paste a path), and the task (free text or a link). See the jump-back and new-ship ticket.
- **The gap after "start".** Fleet opens the herdr tab, but the ship shows on the sea only once the first mate writes `ship.json`. What does the screen show in that time, and if it never comes?
- **The jump-back outcomes.** What does each of the four cases show?
  - the session is alive in herdr: focus the pane;
  - the session is gone: resume it in a new tab;
  - the session runs outside herdr: show its folder and PID;
  - there is no herdr: show the command with a copy button.
- **An empty sea.** What shows on first run, or when only old runs exist, which have no `ship.json`?
