# Research: pixel-art tooling and rendering for an AI-built sea view

Type: research
Status: open
Blocked by:

## Question

What is the best way for an AI agent to build a pixel-art sea view in the browser that the captain can zoom (armada, fleet, ship)?

Compare:
- Making the art: claude-pxl (https://github.com/crsolver/claude-pxl; see also `~/Private/context-hub/gamedev/tools.md`), an Aseprite MCP server, and sprites drawn in code (like the crew-board pixel ship in `~/Private/crew/mods/board`).
- Rendering: plain Canvas 2D or PixiJS (or another option if it is clearly better) for a pannable, zoomable 2D map with animated sprites and crisp pixels.

Judge on: how well an AI agent can make and change it, the visual quality, the dependency weight, and reuse of the crew-board ship and hats.

Output: a recommendation with the reasons, plus the main limits.
