# Research: pixel-art tooling and rendering for an AI-built sea view

Type: research
Status: resolved
Blocked by:

## Question

What is the best way for an AI agent to build a pixel-art sea view in the browser that the captain can zoom (armada, fleet, ship)?

Compare:
- Making the art: claude-pxl (https://github.com/crsolver/claude-pxl; see also `~/Private/context-hub/gamedev/tools.md`), an Aseprite MCP server, and sprites drawn in code (like the crew-board pixel ship in `~/Private/crew/mods/board`).
- Rendering: plain Canvas 2D or PixiJS (or another option if it is clearly better) for a pannable, zoomable 2D map with animated sprites and crisp pixels.

Judge on: how well an AI agent can make and change it, the visual quality, the dependency weight, and reuse of the crew-board ship and hats.

Output: a recommendation with the reasons, plus the main limits.

## Answer

Findings: [research/pixel-tooling.md](https://github.com/sabasayer/fleet/blob/research/pixel-tooling/.scratch/fleet/research/pixel-tooling.md) on branch `research/pixel-tooling`.

- Live sprites (ships, crew members, hats, faces, flags) are drawn in code from small TypeScript pixel grids. Fleet copies and adapts crew-board's `hooks/ship.ts`, so `npx fleet` runs alone.
- Static art (sea tiles, islands, harbour, hulls) is made with claude-pxl at build time. The PNG and JSON files are committed.
- No Aseprite MCP server: it needs the paid app, adds 48 to 123 tools, and makes binary files.
- Rendering: Canvas 2D with HTML on top for labels and buttons. Crisp pixels come from whole-number zoom steps and `devicePixelRatio`. PixiJS only if the map needs hundreds of sprites or water shaders.
- Open for the prototype: the crew-board ship is a side view. The sky view needs a new hull. A three-quarter top-down view keeps the faces visible.
