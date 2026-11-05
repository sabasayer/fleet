# Fleet: mark a sailing ship in review by hand

Type: build (lean)
Status: done
Blocked by:
Closes: GitHub issue #28

## Goal

A ship moves to `in_review` on its own only when every crew role is `done` and it has an MR link. Sometimes an agent forgets a role, so the ship stays `sailing` while its MR is already in review. The captain can then move it by hand.

## Scope

1. **New action `mark_in_review`** in `src/life.ts`. `actionsFor('sailing')` offers it before the flag actions (`pause`, `mark_failed`).
2. **Show it only when it can work.** The ship has at least one MR with a link: the link in `ship.json`, or a link fleet found by branch (`found` in the stored state). With no link, the panel does not show the button.
3. **What it does.** Every MR that has a link and is `sailing` gets the stored state `in_review`. An MR with no link stays `sailing`, so the ship's stage stays `sailing` too (the lowest stage wins).
4. After the move, the normal flow goes on: the watcher can mark it merged, and the panel offers `mark_merged`.
5. A button label in the panel, in the style of the other actions, for example "mark in review".

Not in scope: a crew role change (fleet never writes crew files), other manual moves, a button with no MR link.

## Acceptance

- Tests in `test/life.test.ts` and the server or panel tests:
  - a sailing ship with a linked MR offers `mark_in_review`;
  - a ship with no link does not offer it;
  - the action moves linked MRs to `in_review`, and a found link counts;
  - with two MRs, one without a link, the ship stays `sailing`.
- A server test: `POST` the action for a sailing ship with a link returns OK and the stage is `in_review` after.
- `npm test` passes.

Decisions came from the captain on 2026-11-05: one forward move only (sailing to in review); show it only with an MR link (own or found); move every linked MR.

## Result

- `src/life.ts`: new action `mark_in_review`. `actionsFor` takes a third argument, `hasLinkedSailingMr`. `lifeOf` works it out.
- The action sets every sailing MR that has a link to stored `in_review`. MRs with no link stay `sailing`.
- A found link counts, because `state.ts` already merges `found` into the MR url.
- `web/life.js`: label "mark in review", key `s`.
- Tests: `test/life.test.ts`, new `test/mark-in-review-server.test.ts`. `npm test`: 275 pass, 0 fail.

Choices where the ticket was silent:
- `in_review` is now a valid stored MR state (`AfterState`, `normalizeStored`).
- `observeMr` now lets the watcher mark an `in_review` MR as merged. Without this, point 4 would fail.
- The button shows only if at least one MR is both linked and still sailing.
- Two old tests (`life.test.ts`, `scout.test.ts`) now expect `mark_in_review` for a linked sailing MR.
