**Cap: 8 e2e calls. At the 8th call, stop. Report what you have and ask the captain. Do not continue.**

# Red / Pin brief

Write tests only. Write no implementation.

Read first: the spec at `<spec path>`.

## Both modes
- Select by role, `data-testid` or visible text. Never by library class.
- Check what tests exist. Write only the missing ones.
- Each test must fail if the code under test does nothing. Ask this for every test. A test that would still pass is useless: delete it.
- E2E covers journeys and stacking. Component tests cover props, events and states. Never test one thing at both levels.
- E2E budget: run only the changed specs while you work. Run the repeat or flake check once, at the end. The cap is 8 e2e calls, a hard stop (see the first line). Never use `tail -f`, `sleep` or a poll loop: make one blocking call. Details in [e2e.md](../e2e.md).
- Run Docker once, at the end of your phase. You create or check baselines.
- Follow [common.md](common.md).

## Pin mode (migration)
- Every test passes on the old code. Run it and show the output.
- Audit the whole repo with `git grep` for old selectors, not only the files in scope. Rewrite each hit.
- Report each UI with no path on the dev server.

## Context limit (Pin and Move)
- Read each file once, in full. Never read it in small ranges with `sed` or `cat`.
- One search for one question. Do not run the same search again with small changes.
- Edit with the edit tool. Do not write a script for each edit.
- At about 150k tokens of context, stop. Write the handoff note ([common.md](common.md)), set `blocked`, and end. The first mate starts a fresh agent.
- Got a large migration? Work only on the group of files the spawn text gives you.

## Red mode (feature or bugfix)
- Every new test fails for the right reason. Show each failure.
- Bugfix: first write a test that reproduces the bug. It must fail because of the bug itself.

Done when: the report lists each test, its result, and each item in the spec with no test.
