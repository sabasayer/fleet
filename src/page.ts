const style = `
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: #0d1b2a; color: #e8e4d8; font: 14px/1.4 ui-monospace, Menlo, monospace; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) auto; }
#stage { position: relative; min-width: 0; height: 100vh; overflow: hidden; }
#sea { position: absolute; inset: 0; width: 100%; height: 100%; display: block; image-rendering: pixelated; }
#ui { position: absolute; inset: 0; pointer-events: none; }
#side:empty { display: none; }
#side { width: 360px; height: 100vh; overflow: auto; }
.hud { position: absolute; background: #0d1b2aee; border: 2px solid #2c4a66; padding: 10px 12px; }
#crumbs { top: 12px; left: 12px; }
#crumbs a { color: #9fc3e6; cursor: pointer; text-decoration: underline; }
.dim { color: #7d8fa3; }
.needs { color: #0d1b2a; background: #e5c04b; padding: 0 5px; font-weight: bold; }
.fail { color: #fff; background: #e5484d; padding: 0 5px; font-weight: bold; }
.label { position: absolute; font-size: 12px; white-space: nowrap; text-shadow: 1px 1px 0 #000; }
.lane-head { position: absolute; left: 12px; pointer-events: auto; cursor: pointer; font-weight: bold; letter-spacing: 1px; }
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
</div>
<aside id="side"></aside>
<script type="module" src="/web/main.js"></script>
</body>
</html>
`
