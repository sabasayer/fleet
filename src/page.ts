const style = `
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: #0d1b2a; color: #e8e4d8; font: 14px/1.4 ui-monospace, Menlo, monospace; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) auto; }
#stage { position: relative; min-width: 0; height: 100vh; overflow: hidden; }
#sea { position: absolute; inset: 0; width: 100%; height: 100%; display: block; image-rendering: pixelated; }
#ui { position: absolute; inset: 0; pointer-events: none; }
#side:empty { display: none; }
#side { width: 360px; height: 100vh; overflow: auto; padding: 12px 12px 12px 0; display: flex; flex-direction: column; gap: 10px; }
.hud-block { background: #0d1b2aee; border: 2px solid #2c4a66; padding: 10px 12px; flex: none; }
.needs-panel { border-color: #e5c04b; }
.needs-panel h3 { color: #e5c04b; }
.hud-block h3 { margin: 0 0 6px; font-size: 13px; color: #9fc3e6; text-transform: uppercase; letter-spacing: 1px; }
.hud-block p { margin: 4px 0; }
.row { cursor: pointer; padding: 3px 4px; border-left: 3px solid transparent; overflow-wrap: anywhere; }
.row:hover { background: #1b3550; }
.row.hot { border-left-color: #e5c04b; }
.row.hot.failed { border-left-color: #e5484d; }
.row.cur { background: #1b3550; }
.bar { display: flex; gap: 2px; margin-top: 2px; }
.bar span { width: 14px; height: 6px; }
.open { cursor: default; margin-top: 6px; border-top: 1px solid #2c4a66; }
.open h4 { margin: 6px 0 2px; }
.crew td { padding: 1px 8px 1px 0; vertical-align: top; }
.open a { color: #9fc3e6; }
.jump { margin-top: 8px; }
.jump button { font: inherit; background: #1b3550; color: #e8e4d8; border: 2px solid #4f7aa3; padding: 3px 10px; cursor: pointer; }
.jump button:disabled { opacity: 0.5; cursor: default; }
.jump-msg { font-size: 12px; }
.jump-msg.good { color: #6fcf97; }
.jump-msg.warn { color: #e5c04b; }
.jump-msg.bad { color: #e5484d; }
.jump-cmd { margin: 4px 0; padding: 4px 6px; background: #08121d; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; }
.buttons { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.buttons button { font: inherit; font-size: 12px; background: #2c4a66; color: #e8e4d8; border: 2px solid #4f7aa3; padding: 3px 8px; cursor: pointer; }
.buttons button:hover { background: #3b5f84; }
.buttons button:disabled { opacity: 0.5; cursor: default; }
.zone-step { background: #c9d6e3; width: 8px !important; }
.slot { margin-top: 6px; padding: 4px 6px; border: 1px dashed #4f7aa3; color: #7d8fa3; font-size: 12px; }
.hud { position: absolute; background: #0d1b2aee; border: 2px solid #2c4a66; padding: 10px 12px; }
#crumbs { top: 12px; left: 12px; }
#crumbs a { color: #9fc3e6; cursor: pointer; text-decoration: underline; }
#newship-open { position: absolute; left: 12px; bottom: 12px; font: inherit; background: #2c4a66; color: #e8e4d8; border: 2px solid #4f7aa3; padding: 6px 12px; cursor: pointer; }
#newship-open:hover { background: #3b5f84; }
#modal:empty { display: none; }
#modal { position: fixed; inset: 0; background: #000a; display: flex; align-items: center; justify-content: center; z-index: 10; }
.modal-box { width: min(520px, 92vw); display: flex; flex-direction: column; gap: 10px; }
.modal-box label { display: flex; flex-direction: column; gap: 3px; font-size: 12px; }
.modal-box label.check { flex-direction: row; align-items: center; gap: 6px; }
.modal-box label.check input { width: auto; }
.modal-box input { font: inherit; background: #08121d; color: #e8e4d8; border: 2px solid #4f7aa3; padding: 5px 6px; }
.modal-box button { font: inherit; font-size: 12px; background: #2c4a66; color: #e8e4d8; border: 2px solid #4f7aa3; padding: 3px 10px; cursor: pointer; }
.modal-box button:disabled { opacity: 0.5; cursor: default; }
.dim { color: #7d8fa3; }
.needs { color: #0d1b2a; background: #e5c04b; padding: 0 5px; font-weight: bold; }
.fail { color: #fff; background: #e5484d; padding: 0 5px; font-weight: bold; }
.label { position: absolute; font-size: 12px; white-space: nowrap; text-shadow: 1px 1px 0 #000; }
.lane-head { position: absolute; left: 12px; display: flex; gap: 6px; white-space: nowrap; pointer-events: auto; cursor: pointer; font-weight: bold; letter-spacing: 1px; }
.lane-head > * { flex: 0 0 auto; }
.lane-head > .head-name, .lane-head > .head-count { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.lane-head > .head-name { flex: 0 1 auto; }
.lane-head > .head-count { flex: 0 100 auto; }
.label .ship-id, .label .clamp { overflow: hidden; text-overflow: ellipsis; }
.label .clamp { display: -webkit-box; -webkit-box-orient: vertical; white-space: normal; }
`

export const page = (token: string) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="fleet-token" content="${token}">
<title>fleet</title>
<style>${style}</style>
</head>
<body>
<div id="stage">
<canvas id="sea"></canvas>
<div id="ui"></div>
<div id="crumbs" class="hud"></div>
<button type="button" id="newship-open">+ new ship</button>
</div>
<aside id="side"></aside>
<div id="modal"></div>
<script type="module" src="/web/main.js"></script>
</body>
</html>
`
