# A scout has no run folder

A scout is a ship file with no merge request. Crew makes the run folder when
merge request 1 opens, so a scout has no run folder and writes no status file.
Fleet reads the ship file only.

We kept it that way. A scout is short and often ends in nothing. A run folder
for every bug report that turns out to be a config problem is litter, and the
alternative, a run folder that crew deletes again, is worse: a half-written
folder on disk is a thing another agent can read.

## Consequences

- A scout has no crew members, so its row has no progress bar and no stones.
- A scout has no gate. The captain is in the session, so there is nobody to ask.
- **A scout cannot raise a beacon.** The beacon reads status files. A scout that
  needs the captain cannot say so on the sea. The captain sees it in the terminal
  tab instead. This is the real cost, and we accepted it.
- Fleet writes the dock time itself, in `~/.fleet/ships/<ship>.json`. The outcome
  line carries no time, and there is no status file to read one from.
