# Sea view experiments for later

The sea view prototype picked variant D (lanes, crew stones, side panels, keyboard and animated zoom). The UI can change at any time. This file keeps the other ways to try. Each one is a cheap prototype that answers one question.

The test for each experiment is the same: does it help the captain see what is going on, and get to the right ship faster than D?

A good way to judge them: time how long it takes to answer "what needs me, and which one first?" and to get from the armada to a given ship.

## Other ways to draw it

- **3D sea.** A real camera (three.js or similar) flies from the armada to a fleet to a ship. Question: does a moving camera in 3D space help the captain keep their bearings better than D's 2D tweens? Cost: a large dependency, and harder for an agent to change.
- **Low-poly 3D ships.** Flat-shaded ships and islands, like low-poly games. Question: does it read better than pixel art when the ships are small (armada zoom)?
- **Isometric pixel art.** 2:1 tiles with depth, no real 3D. Question: do we get the depth of 3D and keep the cheap pixel pipeline?
- **Richer pixel art.** A 16-bit look with animated water tiles and real hulls made with claude-pxl. Question: does better art make the state easier to read, or only nicer to look at?
- **No art.** A dense table or terminal-style list. Question: is the sea worth it at all, or does the captain read text faster? This is the baseline to beat.

## Other layouts

- **Board by state.** Columns: needs you, running, in review, harbour. Ships move between columns. Question: is "where is the work" more useful than "which project is it in"?
- **Timeline.** Each ship is a bar over time, so stale ships stand out. Question: does time help the captain see stuck work?
- **Focus mode.** Show only the ships that need the captain, biggest first. Question: is that the view the captain opens most often?
- **Minimap.** A small armada map stays in a corner when zoomed in. Question: does it replace the breadcrumb?
- **Ship zoom content.** Fill the empty space under the lane at ship zoom: the MR list, the last messages from the first mate, a log. Question: what does the captain want to read before jumping back?

## Text, icons and colour

- **More icons, less text.** An icon per role and a shape per state (circle, square, triangle) as well as a colour. Question: is it faster to scan? It also helps a reader who does not see colours well.
- **More text, fewer icons.** Full sentences for each ship ("green failed twice on the CSV test"). Question: does a clear sentence beat a symbol?
- **Colour themes.** Day and night themes, and a palette safe for colour-blind readers. Question: does any state get lost?
- **Stronger "needs you" signal.** A ship that needs the captain sails to the front of its lane, or bobs, or plays a sound. Question: is the blinking `!` enough?

## Faster navigation

- **Command palette.** `Cmd+K`, type part of a ship name, jump to it. Question: is search faster than arrow keys when there are many ships?
- **Number keys and jump keys.** `1` to `9` pick a fleet, `n` goes to the next ship that needs you. Question: can the captain go round the waiting ships without the mouse?
- **Vim keys.** `h j k l` as well as the arrows.
