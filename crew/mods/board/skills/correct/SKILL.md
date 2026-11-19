---
name: correct
description: Turn a repeated agent mistake into a check that stops it. Use when the captain corrects the same mistake twice, or says "correct".
disable-model-invocation: true
---

# /correct

One mistake, one fix, one table row. Run it in the main session. Start no agent.

## Steps

1. Name the mistake in one sentence. Take it from the captain's last correction or from the `decisions.jsonl` of the run. Read nothing else.
2. Pick the highest level that can stop it:
   1. Architecture: change the structure so the mistake cannot happen.
   2. Types: make the wrong state not compile.
   3. Lint or CI: a rule whose error message names the fix.
   4. Test.
   5. Docs: last. Only when nothing above fits.
3. Prove the check fails on a real past case. Run it on the old bad code. A check you never saw fail does not count.
4. Add one row to the project's rules table: `rule | what enforces it | proof command`. Keep the table where the project keeps docs.
5. Tell the captain the level you picked and why in two lines.

## Rules

- Never add a text rule when a lower level works.
- Never add the same rule twice. Search the table first.
