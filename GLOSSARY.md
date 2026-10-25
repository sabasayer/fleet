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
