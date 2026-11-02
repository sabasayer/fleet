---
name: prove
description: Run the CI-equivalent checks before a branch ships. Use when work is ready to hand off, or when another skill needs proof that local and CI agree.
---

# /prove

CI is the judge. Run what CI runs, in the same way. Done means every check below has output you saw.

Read the repo's `package.json` scripts and README. Do not guess script names.

## Checks

1. Unit tests, lint, type-check: all green.
2. E2E: run every spec the diff touches.
3. Visual: run every touched visual spec in the CI Linux image, never natively. Native runs skip screenshot checks.
   - Use the repo's e2e script for visual runs. It moves `.env` and picks the rebuild when it can.
   - Without such a script: move the local `.env` out of the repo first, and restore it after. Use the CI image the project docs name. Run all specs in one call. If it finds no tests, run one spec per call.
   - Read the Playwright text output first. It gives the diff pixel count. Then run `crew-visual-diff <test-results folder>` when it exists: it gives the changed area as text. Open an image only for a problem you cannot judge from text, or for a new baseline.
   - Change a baseline only when the spec says so.
4. Old-selector audit: `git grep` the whole repo for the old class names and test ids the change removes. Zero hits outside the files you meant to change.
5. Reach: list each changed UI and how a person opens it in the dev server. A UI with no path needs a mock.

## Claims

Every claim in your report carries the command that shows it. "Fails on main too" means you ran it on main. An agent's claim without a command is unverified: run the command, then repeat the claim.

## Report

One line per check: `pass` or `fail`, plus the command. List unverified claims last.
