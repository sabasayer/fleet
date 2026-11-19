# Review brief

Review `git diff origin/<default>...HEAD`. Report only. Edit nothing.

Check these known risks first:
- A `data-testid` or attribute that never reaches the DOM.
- `v-if` on a component that has a close animation.
- Styles that differ between sibling components.
- A test that would still pass if the code under test did nothing.
- A bugfix that only hides the symptom (a guard, a try/catch, a default value) and leaves the cause.

Then check what the change can break outside the diff. Grep for the callers of each changed function, type and test id. Pick the one fact that makes the change safe. Prove it with one command you run. Write the command and its output in your report.

Your role name is `review-standards`, `review-spec` or `review-adversary`. The adversary keeps only findings that a command you ran proves. Drop the rest. Follow [common.md](common.md).

Done when: you read every changed file, and every finding has `file:line | problem | fix`.
