import { cssVars, DARK, LIGHT } from '../web/theme.js'

export const style = `
:root { color-scheme: dark light; ${cssVars(DARK)} }
@media (prefers-color-scheme: light) { :root { ${cssVars(LIGHT)} } }
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.4 ui-monospace, Menlo, monospace; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) auto; }
#stage { position: relative; min-width: 0; height: 100vh; overflow: hidden; }
#scroll { position: absolute; inset: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; }
#world { position: relative; width: 100%; height: 100%; }
#sea { position: absolute; inset: 0; width: 100%; height: 100%; display: block; image-rendering: pixelated; }
#ui { position: absolute; inset: 0; pointer-events: none; }
#right { width: 360px; height: 100vh; padding: 12px 12px 12px 0; display: flex; flex-direction: column; gap: 10px; }
#right.empty { display: none; }
#search-box { display: flex; flex-direction: column; gap: 6px; }
#search-text { font: inherit; background: var(--field); color: var(--ink); border: 2px solid var(--line); padding: 5px 6px; width: 100%; }
#chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { font-size: 12px; padding: 1px 6px; border: 1px solid var(--line); cursor: pointer; color: var(--accent); }
.chip:hover { background: var(--hover); }
.chip.on { background: var(--active); color: var(--ink); }
#side { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
.row.pick { border-left-color: var(--accent); }
.hud-block { background: var(--hud); border: 2px solid var(--edge); padding: 10px 12px; flex: none; }
.needs-panel { border-color: var(--gold); }
.needs-panel h3 { color: var(--gold); }
.hud-block h3 { margin: 0 0 6px; font-size: 13px; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; }
.hud-block p { margin: 4px 0; }
.row { cursor: pointer; padding: 3px 4px; border-left: 3px solid transparent; overflow-wrap: anywhere; }
.row:hover { background: var(--hover); }
.row.hot { border-left-color: var(--gold); }
.row.hot.failed { border-left-color: var(--state-failed); }
.row.cur { background: var(--hover); }
.bar { display: flex; gap: 2px; margin-top: 2px; }
.bar span { width: 14px; height: 6px; }
.open { cursor: default; margin-top: 6px; border-top: 1px solid var(--edge); }
.open h4 { margin: 6px 0 2px; }
.crew td { padding: 1px 8px 1px 0; vertical-align: top; }
.open a { color: var(--accent); }
.jump { margin-top: 8px; }
.jump button { font: inherit; background: var(--hover); color: var(--ink); border: 2px solid var(--line); padding: 3px 10px; cursor: pointer; }
.jump button:disabled { opacity: 0.5; cursor: default; }
.jump-msg { font-size: 12px; }
.jump-msg.good { color: var(--good); }
.jump-msg.warn { color: var(--gold); }
.jump-msg.bad { color: var(--state-failed); }
.jump-cmd { margin: 4px 0; padding: 4px 6px; background: var(--field); white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; }
.buttons { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.buttons button { font: inherit; font-size: 12px; background: var(--active); color: var(--ink); border: 2px solid var(--line); padding: 3px 8px; cursor: pointer; }
.buttons button:hover { background: var(--active-hover); }
.buttons button.asking { background: var(--ask-bg); border-color: var(--ask-line); }
.buttons button:disabled { opacity: 0.5; cursor: default; }
.zone-step { background: var(--step); width: 8px !important; }
.slot { margin-top: 6px; padding: 4px 6px; border: 1px dashed var(--line); color: var(--dim); font-size: 12px; }
.hud { position: absolute; background: var(--hud); border: 2px solid var(--edge); padding: 10px 12px; }
#crumbs { top: 12px; left: 12px; }
#crumbs a { color: var(--accent); cursor: pointer; text-decoration: underline; }
#newship-open { position: absolute; left: 12px; bottom: 12px; font: inherit; background: var(--active); color: var(--ink); border: 2px solid var(--line); padding: 6px 12px; cursor: pointer; }
#newship-open:hover { background: var(--active-hover); }
#modal:empty { display: none; }
#modal { position: fixed; inset: 0; background: var(--scrim); display: flex; align-items: center; justify-content: center; z-index: 10; }
.modal-box { width: min(520px, 92vw); max-height: 92vh; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.modal-box label { display: flex; flex-direction: column; gap: 3px; font-size: 12px; }
.modal-box label.check { flex-direction: row; align-items: center; gap: 6px; }
.modal-box label.check input { width: auto; }
.modal-box input, .modal-box textarea { font: inherit; background: var(--field); color: var(--ink); border: 2px solid var(--line); padding: 5px 6px; }
.modal-box button { font: inherit; font-size: 12px; background: var(--active); color: var(--ink); border: 2px solid var(--line); padding: 3px 10px; cursor: pointer; }
.modal-box button:disabled { opacity: 0.5; cursor: default; }
.dim { color: var(--dim); }
.needs { color: var(--needs-ink); background: var(--gold); padding: 0 5px; font-weight: bold; }
.fail { color: var(--fail-ink); background: var(--state-failed); padding: 0 5px; font-weight: bold; }
.label { position: absolute; font-size: 12px; white-space: nowrap; text-shadow: var(--label-shadow); }
.lane-head { position: absolute; left: 12px; display: flex; gap: 6px; white-space: nowrap; pointer-events: auto; cursor: pointer; font-weight: bold; letter-spacing: 1px; }
.lane-head.compact { min-height: 40px; align-items: center; }
.lane-head > * { flex: 0 0 auto; }
.lane-head > .head-name, .lane-head > .head-count { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.lane-head > .head-name { flex: 0 1 auto; }
.lane-head > .head-count { flex: 0 100 auto; }
.label .ship-id, .label .clamp { overflow: hidden; text-overflow: ellipsis; }
.label .clamp { display: -webkit-box; -webkit-box-orient: vertical; white-space: normal; }
@media (max-width: 759px) {
  body { height: 100dvh; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 55fr) minmax(0, 45fr); }
  #stage { height: 100%; }
  #right { width: auto; height: 100%; min-height: 0; padding: 8px 12px 12px; }
  #right.empty { display: none; }
  #chips { flex-wrap: nowrap; overflow-x: auto; }
  #crumbs { top: 8px; left: 8px; right: 8px; }
  #newship-open { left: 8px; bottom: 8px; }
}
@media (max-width: 759px), (pointer: coarse) {
  .chip { flex: none; display: inline-flex; align-items: center; min-height: 40px; padding: 0 12px; }
  #search-text { min-height: 40px; font-size: 16px; }
  .row { min-height: 40px; padding: 8px 4px; }
  .jump button, .buttons button, .modal-box button, #newship-open { min-height: 40px; min-width: 40px; }
  .modal-box input, .modal-box textarea { min-height: 40px; font-size: 16px; }
  .modal-box label.check { min-height: 40px; }
  .modal-box label.check input { width: 24px; height: 24px; min-height: 0; }
  .modal-box { max-height: 92dvh; }
  .open a { display: inline-block; min-height: 40px; line-height: 40px; }
  #crumbs { padding: 4px 8px; display: flex; flex-wrap: wrap; align-items: center; gap: 0 4px; }
  #crumbs a { display: inline-flex; align-items: center; min-height: 40px; min-width: 40px; padding: 0 4px; }
  #crumbs .keys { display: none; }
}
`

const rect = (x: number, y: number, w: number, h: number, fill: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${[
  rect(0, 0, 16, 16, '#4f8fd9'),
  rect(7, 1, 1, 9, '#5c3a1c'),
  rect(8, 2, 1, 1, '#e8e4d8'), rect(8, 3, 2, 1, '#e8e4d8'), rect(8, 4, 3, 1, '#e8e4d8'), rect(8, 5, 4, 1, '#e8e4d8'), rect(8, 6, 5, 1, '#e8e4d8'), rect(8, 7, 6, 1, '#e8e4d8'),
  rect(4, 4, 3, 4, '#e8e4d8'),
  rect(2, 9, 12, 1, '#8b5a2b'), rect(3, 10, 10, 1, '#8b5a2b'), rect(4, 11, 8, 1, '#8b5a2b'),
  rect(0, 12, 16, 2, '#0d1b2a'),
].join('')}</svg>`

const iconHref = `data:image/svg+xml,${encodeURIComponent(icon)}`

export const page = (token: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="fleet-token" content="${token}">
<title>fleet</title>
<link rel="icon" type="image/svg+xml" href="${iconHref}">
<style>${style}</style>
</head>
<body>
<div id="stage">
<div id="scroll"><div id="world">
<canvas id="sea"></canvas>
<div id="ui"></div>
</div></div>
<div id="crumbs" class="hud"></div>
<button type="button" id="newship-open">+ new ship (n)</button>
</div>
<aside id="right">
<div id="search-box" class="hud-block"><input id="search-text" type="search" placeholder="search ships (/)" autocomplete="off" spellcheck="false" aria-label="Search ships"><div id="chips"></div></div>
<div id="side"></div>
</aside>
<div id="modal"></div>
<script type="module" src="/web/main.js"></script>
</body>
</html>
`
