# Grilling: a ship's life after crew stops

Type: grilling
Status: resolved
Blocked by:

## Question

What states does a ship go through after its crew stops at "pipeline green": MR in review, merged, released, tested in the released environment, done? Who or what moves each state (the captain, the first mate, fleet, a later agent)? When does a ship leave the sea for the harbour? How does this relate to the mr-triage task states (`released`, `testing`, `done`) without fleet depending on mr-triage? How does it work for a ship with several MRs?

## Answer

**Owner.** Fleet owns a ship's life after crew stops. It keeps its own state per ship, apart from crew's files. Crew's files stay read-only to fleet.

**States.**
- `sailing`: the crew is at work. "Needs captain" is a flag on top, not a state.
- `in_review`: every crew member is done, and the MR is open.
- `merged`: the MR is merged.
- `released`: the change is live where it can be tested.
- `testing`: someone tests it in a test environment (the captain, a QA member, later an agent).
- `done`: the ship sails into the harbour.
- Other states: `paused`, `failed`, `abandoned` (the MR closed without a merge).

**Who moves each state.**

| From → to | Who |
|---|---|
| `sailing` → `in_review` | Automatic: every crew member is `done` and an MR link exists |
| `in_review` → `merged` | Automatic: fleet asks the repo host (`glab` / `gh`) for ships in `in_review`. A person marks it when no CLI works. |
| `in_review` → `abandoned` | Automatic: the MR closed without a merge |
| `merged` → `released` | The project's release check, if it has one. Otherwise a person, by hand. Fleet never guesses from the main pipeline. |
| `released` → `testing` → `done` | The captain, in the fleet UI |
| any → `paused` and back | The captain |
| → `failed` | The captain only. A failed crew member does not fail the ship. |

**Release check.** "Released" means something else per project. Examples: an ArgoCD sync to acc for Founda work, or a new LAN build for a game. A project can set one shell command. Fleet runs it for each merged ship and passes the ship's facts (merge commit SHA, repo, MR link). Exit code 0 means `released`. No command means a person marks it.

**Several MRs.** The ship's state is the state of its least advanced MR. The ship is `done` only when every MR is `done`. Zooming in to the ship shows each MR's state.

**A bug found in testing.** The crew starts a new MR on the same ship. The ship goes back to `sailing`, and the old MR keeps its own state.

**Harbour.** A ship leaves the open sea only at `done`. After its crew stops, a ship at sea looks different (sails down, crew still), so "waiting on others" differs from "crew at work". The harbour shows done ships for some days, then hides them.

**Test environment.** Fleet does not care where the test happens. It needs no setting per project for this.
