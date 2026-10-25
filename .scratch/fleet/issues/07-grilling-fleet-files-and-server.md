# Grilling: fleet's own files and its server

Type: grilling
Status: open
Blocked by:

## Question

Where does fleet keep its own state per ship (the states after crew from the ship lifecycle ticket), and what is its format? Where does the optional project config live, and what does it hold (display name, colour, the release check command)? How often does fleet ask the repo host (`glab` / `gh`) for merged MRs, and run release checks? What does the server look like: `npx fleet`, the port, how the page gets updates, how it reads `~/.crew`? crew-board already has a web view (`/crew-board serve`, `mods/board/serve/serve.mjs`, port 7777) and alerts for blocked, failed and stale agents: should fleet reuse any of that, or stay apart?
