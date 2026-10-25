# Grilling: the ship file contract

Type: grilling
Status: open
Blocked by: 03, 05

## Question

What does the ship file hold (project, title, task link, repos, worktrees, session data, lifecycle state)? Where does it live (the ship folder or each MR folder in `~/.crew`)? When does the first mate write or update it? How does it handle several MRs and several repos? The crew skill owns the contract and fleet only reads it. The sea view needs two things from it: the crew chain in order with each member's state, and a short, readable reason when the ship waits for the captain (see the sea view ticket).
