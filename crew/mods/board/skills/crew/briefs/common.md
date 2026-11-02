# Rules for every agent

- Write your status with `crew-status`, as [status.md](../status.md) says. Write it on a state change only: `running`, `blocked`, `done` or `failed`.
- Never make a call only for status. Add it to the end of your next real command, like `<command>; crew-status ...`. Each call is one turn, and each turn re-reads your whole context.
- Write scripts, logs and reports in the run folder or the spec folder. Never write them in the project repo.
- Never open an image (PNG or JPG). Read text. To judge a visual diff, run `crew-visual-diff <test-results folder>`. It prints the image size, the changed pixels, the ratio and the changed area. Only the browser agent opens an image, and only for a problem.
- Need a captain decision, a gate, or any wait over 1 hour? Do not stay idle. Write a handoff note, then end your run with the question. A long idle makes the next turn re-write the whole context, which costs 2 million tokens or more.
- The handoff note is `~/.crew/<ticket>/handoff-<role>.md`. It lists what is done, what is next, and which files matter. The first mate starts a fresh agent from the spec and this note.
- Started from a handoff note? Read the spec and the note first. Do not redo what the note lists as done.
- Keep a decision list in your final report. Each line says what you did and why. Include each test you changed or dropped, and each finding you rejected.
- Stop and report when you are blocked. Do not retry the same step more than twice.
