# Research: pixel-art tooling and rendering for the sea view

Ticket: `issues/02-research-pixel-tooling.md`
Date: 2026-10-25

## Question

What is the best way for an AI agent to build a pixel-art sea view in the browser? The captain zooms it at three levels: armada, fleet and ship.

## Recommendation

1. **Draw the live sprites in code.** Ships, crew members, hats, faces and flags change with live data. Draw them from small pixel grids in TypeScript, the way crew-board does. Copy and adapt the crew-board helpers.
2. **Use pxl (claude-pxl) for the static art.** Use it for the sea tiles, the islands, the harbour and the hull shapes. Run it at build time only. Commit the PNG and JSON it makes. Fleet does not need pxl at runtime.
3. **Do not use an Aseprite MCP server.**
4. **Render with plain Canvas 2D.** Put labels and buttons in normal HTML on top of the canvas. Do not use PixiJS for v1.

## Reasons

### Art: sprites in code (for live parts)

- The look of a ship depends on live data: the number of crew members, each member's state, and each member's role. Code can draw that data directly. A fixed image file cannot.
- crew-board already does this. `~/Private/crew/mods/board/hooks/ship.ts` builds a grid of colours (`Grid = (string | null)[][]`). It has a hat shape per role family (`HAT_SHAPES`, `MINI_SHAPES`). It picks a colour from a hash of the role name. It has a colour per state (`STATE_COLOR`) and faces that change with state (`drawFace`). Painting such a grid on a canvas takes one `fillRect` per pixel, or one per run of the same colour. crew-board already merges runs for its SVG output (`pixelRects`).
- An AI agent edits a grid in code easily. The diff is readable. Tests can check the grid, as `ship.test.ts` already does.
- No dependency.

### Art: pxl (for static parts)

- pxl is "pixel art as code". You write a `.px.js` file. `pxl build` makes PNGs, sprite sheets with JSON, and GIFs. Source: the claude-pxl README.
- It is built for agents. Its `SKILL.md` gives a loop: write, build, look at the preview PNG, patch, build again. `pxl ascii` prints the exact pixels with rulers. This costs fewer tokens than an image. Build errors give `file:line:col` and "did you mean" hints.
- It has the tools a sea needs: palettes with shade ramps, dithering, noise, tilemaps, seeded random scatter, and animations with a `phase` value for seamless loops.
- `sheet()` writes a sprite sheet in TexturePacker hash format. Many tools read this format.
- MIT licence. No runtime dependencies. Needs Node 22.18 or newer.
- The captain tried it on 2026-10-16. A 6-frame galleon (32x30 pixels) worked on the first build. Source: `~/Private/context-hub/gamedev/tools.md`.
- `pxl serve` gives a live viewer. The captain can watch the agent paint. This helps with art review.

### Art: why not an Aseprite MCP server

- Every server needs the Aseprite app installed. Examples: `diivi/aseprite-mcp` (Python 3.13, 123 tools, 822 stars) and `willibrandon/pixel-mcp` (Go, Aseprite 1.3+, 48 tools, 154 stars). Both are MIT.
- Aseprite itself is not free software. Its EULA lets you compile the source "for your own personal purpose". It forbids giving copies to others. So the art pipeline would need a paid or self-built app on each machine.
- The agent draws with many small tool calls (put pixel, draw line). The result is a binary `.aseprite` file. You cannot read its diff. It is hard to change one detail later.
- 48 to 123 tools add a lot of text to the agent's context.
- pxl does the same job with a text file, no app and no MCP server.

### Rendering: why Canvas 2D

- Fleet shows tens of ships, not thousands. Canvas 2D handles that with ease.
- Crisp pixels are simple. Set `ctx.imageSmoothingEnabled = false`. MDN says this property "is useful for games and other apps that use pixel art" and keeps the pixels sharp when you enlarge images.
- The three zoom levels map well to whole-number scales, for example 1x, 3x and 6x. Whole-number scales and whole-number positions keep every pixel square. MDN also says whole-number coordinates avoid extra anti-aliasing work.
- Pan and zoom is one transform per frame (`ctx.setTransform`) plus mouse and wheel handlers. This is a small amount of code that the agent owns.
- Speed tips from MDN fit this app well. Draw each ship frame once to an offscreen canvas and reuse it. Use `requestAnimationFrame`. Put the slow-changing sea on its own canvas layer.
- No dependency.

### Rendering: why not PixiJS (for v1)

- PixiJS v8 (now 8.22.0, MIT) is good. It has WebGL and WebGPU renderers. It reads TexturePacker sheets (`Spritesheet`) and plays them (`AnimatedSprite`). Crisp pixels need `scaleMode = 'nearest'` on each texture source.
- But it is heavy for this job. The full `pixi.js` import is about 925 KB, or 265 KB gzipped (bundlephobia, version 8.22.0). Tree-shaking can cut this, but it is still large next to zero.
- Pan and zoom needs another package, `pixi-viewport`. Its last npm publish was in November 2024.
- Its gains (thousands of sprites, shaders, filters) are not needed for tens of ships.
- **When to switch:** move to PixiJS if the map must draw many hundreds of animated sprites at once, or if the captain wants shader effects on the water. Sprites drawn to canvases and pxl sheets both load into PixiJS, so the art work is not lost.

### Rendering: HTML on top

- Text drawn inside a pixel canvas is blurry, or it needs a pixel font. Normal HTML text is sharp and easy to read.
- Buttons such as "jump back" and "new ship" are easier and more accessible as HTML.
- Clicks on a ship need a simple rectangle check on the canvas. Each ship is one rectangle, so this is small.

## Limits

- **The crew-board ship is a side view. Fleet is seen from the sky.** The hull, mast and sails in `drawShip` will not fit a top-down map. The parts you can reuse are: the grid type, the hat shapes and colours, the role hash, the state colours, the face moods and the run-merging code. From straight above you see hat tops, not faces. A "three-quarter" top-down view (as in classic RPGs) shows both the deck and the faces. The sea view prototype (ticket 04) should decide this.
- **The ship code is copied, not shared.** Fleet must not import from the crew repo, because `npx fleet` must run alone. The two copies can drift apart. A shared package is a later choice.
- **pxl is young.** The repo shows 442 stars, 2 commits on `main`, no releases and 1 open issue. It is not on npm, but `npx github:crsolver/claude-pxl` works. Because fleet only commits its output, a broken pxl does not break fleet. The captain can still read and fix the `.px.js` file by hand.
- **The pxl sheet JSON schema is not written down** in its docs. Only "TexturePacker hash format" is stated. Check one real output before you write a loader.
- **Canvas 2D gives no scene tree and no events.** The agent writes the camera, the hit tests and the draw loop. This is small for this app, but it is code to own and test.
- **Free zoom (not whole-number steps) blurs or distorts pixels.** Keep zoom on whole-number steps, or snap to them when the animation ends.
- **Screen density.** On a Retina screen, size the canvas by `devicePixelRatio`. Otherwise the browser scales it and the pixels go soft.

## Sources

- claude-pxl README: https://github.com/crsolver/claude-pxl
- claude-pxl `SKILL.md`: https://raw.githubusercontent.com/crsolver/claude-pxl/main/SKILL.md
- claude-pxl `reference.md`: https://raw.githubusercontent.com/crsolver/claude-pxl/main/reference.md
- Captain's pxl notes: `~/Private/context-hub/gamedev/tools.md`
- crew-board ship code: `~/Private/crew/mods/board/hooks/ship.ts`
- diivi/aseprite-mcp: https://github.com/diivi/aseprite-mcp
- willibrandon/pixel-mcp: https://github.com/willibrandon/pixel-mcp
- Aseprite EULA: https://raw.githubusercontent.com/aseprite/aseprite/main/EULA.txt
- Aseprite source repo (licence notes): https://github.com/aseprite/aseprite
- MDN, `imageSmoothingEnabled`: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
- MDN, Optimizing canvas: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- MDN, `image-rendering`: https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering
- PixiJS repo: https://github.com/pixijs/pixijs
- PixiJS textures guide: https://pixijs.com/8.x/guides/components/textures
- PixiJS `SCALE_MODE`: https://pixijs.download/release/docs/rendering.SCALE_MODE.html
- PixiJS `Spritesheet`: https://pixijs.download/release/docs/assets.Spritesheet.html
- pixi-viewport: https://github.com/pixijs-userland/pixi-viewport
- Bundle size: https://bundlephobia.com/package/pixi.js@8.22.0
- npm registry (`npm view pixi.js`, `npm view pixi-viewport`), checked 2026-10-25
