# Review brief

Review `git diff origin/<default>...HEAD`. Report only. Edit nothing.

Check these known risks first:
- A `data-testid` or attribute that never reaches the DOM.
- `v-if` on a component that has a close animation.
- Styles that differ between sibling components.
- A test that would still pass if the code under test did nothing.
- A bugfix that only hides the symptom (a guard, a try/catch, a default value) and leaves the cause.

Your role name is `review-standards` or `review-spec`. Follow [common.md](common.md).

Done when: you read every changed file, and every finding has `file:line | problem | fix`.
