# Fleet

Fleet lets the captain watch many crew runs at once, grouped by project, and go back to any of them.

## Language

**Armada**:
Every fleet the captain has, seen together.
_Avoid_: Grand fleet

**Fleet**:
The ships of one project.

**Project**:
A scope of work the captain names: a whole repo, a multi-feature effort in one repo, or one feature across several repos.
_Avoid_: Linear project (a project is not tied to any task manager)

**Ship**:
One unit of work (a feature, bugfix or task) that a crew carries to the end. It may produce several merge requests.
_Avoid_: Run, ticket (a ship is not tied to any task manager)

**Crew member**:
One agent role on a ship, such as red, green or review-spec.
_Avoid_: Agent, worker

**Captain**:
The human who owns every fleet and approves every gate.
_Avoid_: User, admiral

**First mate**:
The Claude session that runs one ship's chain and talks to the captain.

**Scout**:
A Claude session that looks into a bug report or a bug's cause before any crew run. It either becomes a ship (same name, same session) or goes to the harbour with a one-line outcome.
_Avoid_: Investigation, triage (they name the activity, not the thing on the sea)

## A ship's life

**Sailing**:
A ship whose crew is still at work.

**Needs captain**:
A flag on a sailing ship: a gate waits for the captain, or a crew member failed.
_Avoid_: Blocked (a crew member's word, not a ship's)

**Released**:
A ship whose change is live where it can be tested. Each project says what that means.
_Avoid_: Deployed, pipeline green

**Release check**:
A project's own test that tells whether a merged change is released.

**Testing**:
A ship whose released change someone tests in a test environment.

**Harbour**:
Where done ships go, off the open sea.
_Avoid_: Archive, dock

