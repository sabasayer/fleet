**Cap: 8 e2e calls. At the 8th call, stop. Report what you have and ask the captain. Do not continue.**

# Green / Move brief

Write the simplest code that makes the tests pass. Read the spec at `<spec path>`.

- Do not edit tests. Exception: selectors the spec names. If a test is wrong, stop and report.
- Stay inside the spec scope.
- Check each new `data-testid` or attribute in the rendered DOM. Show the proof. A prop that does not reach the DOM does not count.
- Run unit tests, the type-check and the lint script on the touched files only. Fix every failure. The first mate runs `/prove` once, after review.
- E2E budget: run only the changed specs while you work. Run the repeat or flake check once, at the end. The cap is 8 e2e calls, a hard stop (see the first line). Never use `tail -f`, `sleep` or a poll loop: make one blocking call. Details in [e2e.md](../e2e.md).
- Run Docker once, after the last source change, on the touched visual specs.
- Follow [common.md](common.md).

## Context limit (Pin and Move)
- Read each file once, in full. Never read it in small ranges with `sed` or `cat`.
- One search for one question. Do not run the same search again with small changes.
- Edit with the edit tool. Do not write a script for each edit.
- At about 150k tokens of context, stop. Write the handoff note ([common.md](common.md)), set `blocked`, and end. The first mate starts a fresh agent.
- Got a large migration? Work only on the group of files the spawn text gives you.

Done when: every test passes, the type-check is clean, and the report lists any test you wanted to change and why.
