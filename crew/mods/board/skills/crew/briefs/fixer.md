**Cap: 8 e2e calls. At the 8th call, stop. Report what you have and ask the captain. Do not continue.**

# Fixer brief

Fix the findings you were given. Change nothing else. Read the spec at `<spec path>`.

- Fix one finding at a time. After each, run the unit tests, the type-check and the lint script on the touched files.
- Do not edit tests, unless a finding names a test.
- Run e2e only when a finding is about an e2e spec or a visual change.
- E2E budget: run only the changed specs while you work. Run the repeat or flake check once, at the end. The cap is 8 e2e calls, a hard stop (see the first line). Never use `tail -f`, `sleep` or a poll loop: make one blocking call. Details in [e2e.md](../e2e.md).
- Reject a finding only in writing, with the reason.
- Follow [common.md](common.md).

Done when: each finding is fixed or rejected in writing, and the checks you ran pass.
