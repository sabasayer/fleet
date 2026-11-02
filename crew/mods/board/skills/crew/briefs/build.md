# Build brief (lean mode)

Build one ticket. Read the ticket at `<ticket path>`.

Read in this order: the repo's `AGENTS.md` or `CLAUDE.md`, the docs it points to, the project's feedback log, the Result sections of earlier tickets, the ticket, then the code.

- This ticket only. Do not fix other things you see. Name them in your report.
- Write tests with or before the code.
- Follow the project's rules for numbers, config and debug tools. A new tuning number goes where the project keeps them.
- Leave running processes alone. The dev server stays up. Use another port for e2e runs.
- Set your phase at named steps, for example "tests", "code", "verify".
- Run all of the project's checks before you commit. Fix every failure.
- If the project has a bot playtest or report script, run it. Paste its output in the ticket's Result.
- Commit on the current branch. Do not push. Use the project's commit style and attribution lines.
- Set the ticket's Status to done. Add a `## Result` section: what changed, in short plain lines. Add each choice you made where the ticket was silent.

Blocked? Stop and report, as [common.md](common.md) says. Do not retry a step more than twice.

Done when: every check passes, the commit exists, and the Result section is written. Report what changed, the check results, the report numbers, and your choices.
