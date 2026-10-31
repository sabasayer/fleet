# Fleet: longer instructions in the new-ship form

Repo: sabasayer/fleet
Status: ready-for-agent
Blocked by: none (scouts is on main)

## What

The Task field is one line of up to 500 characters, and the server rejects line breaks. The captain wants to add more instructions when starting a ship.

- Make Task a multi-line box with a limit of about 4000 characters. Allow line breaks; keep every other control character blocked.
- The text still reaches herdr as one argv item, so no shell reads it. The copy-command fallback must quote a multi-line task correctly; test it through `/bin/sh`.
- Check that `/crew` still finds `fleet: <fleet>` when the task has several lines.

## Done when

- Tests cover a multi-line task in argv and in the copy command.
- The captain starts a ship with a few lines of instructions, and the first mate gets all of them.
