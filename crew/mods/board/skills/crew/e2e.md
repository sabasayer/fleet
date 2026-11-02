# E2E runs

Every e2e run must do these things. This holds in any repo.

- Run the specs of this change in one blocking call. The call waits by itself.
- Print one pass or fail result for each spec. For each failure, print the log path and the last lines. Write the log to `logs/` in the run folder.
- Decide the rebuild by itself. Rebuild once when an input of the build changed. Otherwise reuse the last build. The agent never chooses.
- Run visual specs by check 3 of the `prove` skill: CI image, `.env` kept safe, baselines checked only.
- Run one container at a time. Use at most 4 workers.
- Use a free port for every e2e run, and print the port you used. Never use a fixed or default port. If the repo's e2e script picks and prints its own free port, use that. Otherwise ask the OS for one and set it with the repo's port variable. A taken port can make Playwright reuse another agent's server and test its code. One way to ask the OS: `python3 -c 'import socket;s=socket.socket();s.bind(("",0));print(s.getsockname()[1])'`
- Work in the real worktree. Never copy the repo to run tests.
- Run Docker once. Green and Move run it after the last source change. Red and Pin run it at the end of their phase.
- Judge a visual diff by text. Read the Playwright output, then run `crew-visual-diff <test-results folder>`. It lists each `*-actual.png` and `*-expected.png` pair with the changed pixels, the ratio and the changed area. Never open an image.
- Use the repo's own scripts. Write no new wrapper scripts.

## Budget

- While you work, run only the specs you changed. Never run the whole suite.
- Run the repeat or flake check once, at the end, on the changed specs.
- Make at most 8 e2e calls in your run. One run of the e2e script is one call, with or without Docker. The cap is a hard stop. After the 8th call, do not make a 9th. Report what you have and ask the captain.
- Never use `tail -f`, `sleep`, a poll loop or a monitor to wait for a run. Make one blocking call. If it times out, read the log once with `tail -n 40 <log>`, then report. Do not run it again.

## Find the repo's scripts

1. Read the repo's `AGENTS.md` and the doc it points to for e2e and visual runs.
2. Read the `package.json` scripts and the README or e2e docs. Look for a script that runs one spec or a few specs. Look for a Docker or CI-image script for visual specs.
3. Check each script against the list above. Write one line for each: what it covers and what it does not. Also check how it sets its port. Write: "picks its own port", "reads a port variable" or "fixed port". For a fixed port, pass a free one through the variable. If there is no variable, tell the captain the script needs a fix.
4. Use the best script. Do each missing part by hand. For example: move `.env` out yourself, run all specs in one call with the output in a log file, and use one blocking call with a timeout.
5. If the repo has no script, run the repo's own e2e command once in one blocking call. Send the output to a log file, then read the log.

Before a long call, set the phase with `crew-status` ([status.md](status.md), "Long call"). Write it again after.
