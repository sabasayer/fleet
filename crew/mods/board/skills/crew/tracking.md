# Task tracking

If the `track-work` skill is installed, it shows this work as a task in mr-triage. Call it with `git -C <path>` for git commands.

- **Create.** At the end of Fetch, call `track-work` with: `repo` (the remote path, like `group/project`, never a folder name), `branch`, `title` and the Linear URL if there is one. Start the title with the Linear ID, like `ABC-123: short title`.
- **MR open.** Call it again with `mr_url`. mr-triage then moves the task to MR review by itself.
- **States you may set.** `reviewing` when the review agents start. `local_testing` when the captain says they tested it. Nothing else.
- **States you never set.** `paused`, `released`, `testing` and `done` are the user's.
- **Several MRs.** One task for each branch. A ticket with `<ticket>-mr<N>` folders has one task for each MR branch.
- **If it fails.** When mr-triage is not running, or `track-work` is not installed, say so once and go on. Never start mr-triage. Never stop the run because of it.
