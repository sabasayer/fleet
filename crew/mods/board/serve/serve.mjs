#!/usr/bin/env node
// Web view of the crew board. Reads the status files, never writes them.
// Needs Node 22.18 or newer (it loads the mod's .ts files directly).
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'

import { age, isStale, isStatusFile, parseAgent, sortChain } from '../hooks/board.ts'
import { drawShip, hatSvg, shipSvg } from '../hooks/ship.ts'

const args = process.argv.slice(2)
const flag = name => args.includes(`--${name}`)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)

  return i === -1 ? fallback : (args[i + 1] ?? fallback)
}

const home = process.env.HOME ?? ''
const given = args.flatMap((a, i) => (a === '--root' && args[i + 1] ? [args[i + 1]] : []))
const roots = [...new Set([...(given.length ? given : [process.env.CREW_BOARD_ROOT || `${home}/.crew`]), '/tmp/crew'])].map(r =>
  r.startsWith('~/') ? home + r.slice(1) : r,
)
const port = Number(option('port', '7777'))
const isLocal = flag('local-only')
const token = isLocal ? '' : option('token', randomBytes(9).toString('base64url'))
const FRAMES = 4

async function scanRoot(root) {
  const folders = await readdir(root, { withFileTypes: true }).catch(() => [])

  return Promise.all(
    folders
      .filter(f => f.isDirectory())
      .map(async folder => {
        const dir = `${root}/${folder.name}`
        const names = (await readdir(dir).catch(() => [])).filter(isStatusFile)
        const agents = await Promise.all(
          names.map(async n =>
            parseAgent(n, await readFile(`${dir}/${n}`, 'utf8').catch(() => '{'), await stat(`${dir}/${n}`).then(s => s.mtimeMs, () => 0)),
          ),
        )
        const mtimeMs = await stat(dir).then(s => s.mtimeMs, () => 0)

        return { name: folder.name, agents: sortChain(agents), newestMs: Math.max(mtimeMs, ...agents.map(a => a.updatedMs)) }
      }),
  )
}

async function scan() {
  const now = Date.now()
  const found = (await Promise.all(roots.map(scanRoot))).flat().filter(t => t.agents.length > 0)
  const tickets = found.filter((t, i) => found.findIndex(o => o.name === t.name) === i)

  return { tickets: tickets.sort((a, b) => b.newestMs - a.newestMs), now }
}

async function payload(isFull) {
  const { tickets, now } = await scan()

  return {
    now,
    tickets: tickets.map(t => {
      const isSailing = t.agents.some(a => a.state === 'running' && !isStale(a, now))

      return {
        name: t.name,
        isSailing,
        ships: Array.from({ length: isSailing ? FRAMES : 1 }, (_, n) =>
          shipSvg(drawShip(t.agents, n, isSailing, isFull, now), n, isSailing, 6).source,
        ),
        agents: t.agents.map(a => ({
          role: a.role,
          state: a.state,
          phase: a.phase ?? '',
          summary: a.summary ?? '',
          done: a.done ?? null,
          total: a.total ?? null,
          isStale: isStale(a, now),
          ago: age(now - a.updatedMs),
          hat: isFull ? hatSvg(a.role, 3).source : '',
        })),
      }
    }),
  }
}

const isAllowed = given => {
  if (!token) return true
  const a = Buffer.from(String(given ?? ''))
  const b = Buffer.from(token)

  return a.length === b.length && timingSafeEqual(a, b)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  if (!isAllowed(url.searchParams.get('t'))) {
    res.writeHead(403, { 'content-type': 'text/plain' }).end('Open the link that /crew-board serve printed. It has the token.')

    return
  }
  if (url.pathname === '/api/board') {
    const body = JSON.stringify(await payload(url.searchParams.get('style') !== 'simple'))
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(body)

    return
  }
  if (url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(PAGE)

    return
  }
  res.writeHead(404).end()
})

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Pick another with --port.` : String(error))
  process.exit(1)
})

server.listen(port, isLocal ? '127.0.0.1' : '0.0.0.0', () => {
  const hosts = isLocal
    ? ['localhost']
    : Object.values(networkInterfaces())
        .flat()
        .filter(i => i && i.family === 'IPv4' && !i.internal)
        .map(i => i.address)
  const urls = (hosts.length ? hosts : ['localhost']).map(host => `http://${host}:${port}/${token ? `?t=${token}` : ''}`)
  console.log(`crew-board ${urls.join('\ncrew-board ')}`)
})

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Crew board</title>
<style>
:root { color-scheme: light dark; --bg:#fff; --fg:#1d1d1f; --dim:#6e6e73; --line:#e3e3e8; --card:#f5f5f7;
  --queued:#8a8a8a; --running:#0f9db0; --blocked:#b8860b; --done:#2e9b53; --failed:#d93a3f; }
@media (prefers-color-scheme: dark) { :root { --bg:#111214; --fg:#ececf0; --dim:#9a9aa3; --line:#2a2b30; --card:#1a1b1f;
  --running:#33c3d6; --blocked:#e5c04b; --done:#4fbf6f; --failed:#e5484d; } }
* { box-sizing: border-box }
body { margin:0; padding:16px; background:var(--bg); color:var(--fg); font:15px/1.4 system-ui, sans-serif }
main { max-width:760px; margin:0 auto }
h1 { font-size:13px; font-weight:600; color:var(--dim); margin:0 0 12px; display:flex; justify-content:space-between }
.ticket { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px; margin-bottom:14px }
.ticket h2 { font-size:16px; margin:0 0 8px; color:#a259c9 }
.ship { overflow-x:auto; padding-bottom:4px }
.ship svg { display:block; height:auto; max-width:none; image-rendering:pixelated }
.summary { margin:6px 0 10px; font-weight:600 }
.summary span { margin-left:12px; font-weight:400 }
.agent { display:grid; grid-template-columns:auto 1fr; gap:2px 10px; padding:8px 0; border-top:1px solid var(--line); align-items:center }
.agent .hat svg { display:block }
.name { font-weight:600 }
.state { margin-left:8px; font-size:13px }
.bar { height:6px; background:var(--line); border-radius:3px; overflow:hidden; margin-top:4px }
.bar i { display:block; height:100%; background:currentColor; border-radius:3px }
.bar.moving i { width:25%; animation:slide 1.6s linear infinite }
@keyframes slide { from { margin-left:-25% } to { margin-left:100% } }
.phase { color:var(--dim); font-size:13px; grid-column:2 }
.stale { color:var(--failed); font-weight:700 }
.queued { color:var(--queued) } .running { color:var(--running) } .blocked { color:var(--blocked) }
.done { color:var(--done) } .failed, .unreadable, .unknown { color:var(--failed) }
.empty { color:var(--dim); text-align:center; padding:40px 0 }
</style>
</head>
<body>
<main>
  <h1><span>Crew board</span><span id="clock">connecting...</span></h1>
  <div id="root"></div>
</main>
<script>
const params = new URLSearchParams(location.search)
const only = params.get('ticket')?.toLowerCase() ?? ''
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c])
const ICON = { queued:'○', running:'▶', blocked:'⏸', done:'✔', failed:'✖' }
let data = null
let step = 0

function bar(a) {
  if (a.done != null && a.total) return '<div class="bar"><i style="width:' + Math.min(100, Math.round(100 * a.done / a.total)) + '%"></i></div>'
  if (a.state === 'done') return '<div class="bar"><i style="width:100%"></i></div>'
  if (a.state === 'running') return '<div class="bar moving"><i></i></div>'

  return '<div class="bar"></div>'
}

function agent(a) {
  const cls = a.isStale ? 'stale' : a.state
  const count = a.done != null && a.total != null ? ' ' + a.done + '/' + a.total : ''
  const text = (a.state === 'done' || a.state === 'failed') && a.summary ? a.summary : a.phase

  return '<div class="agent ' + cls + '">'
    + '<div class="hat">' + (a.hat || '<span>' + (ICON[a.state] ?? '?') + '</span>') + '</div>'
    + '<div><span class="name" style="color:var(--fg)">' + esc(a.role) + '</span><span class="state">' + (ICON[a.state] ?? '?') + ' ' + esc(a.state) + count + '</span>'
    + '<span class="state" style="color:var(--dim)"> ' + esc(a.ago) + ' ago</span>' + (a.isStale ? '<span class="state stale">STALE</span>' : '') + bar(a) + '</div>'
    + (text ? '<div class="phase" style="color:var(--dim)">' + esc(text) + '</div>' : '') + '</div>'
}

function ticket(t) {
  const n = t.agents.length
  const done = t.agents.filter(a => a.state === 'done').length
  const counts = ['running', 'blocked', 'failed', 'queued']
    .map(s => [s, t.agents.filter(a => a.state === s).length]).filter(([, c]) => c)
    .map(([s, c]) => '<span class="' + s + '">' + ICON[s] + ' ' + c + '</span>').join('')

  return '<section class="ticket"><h2>' + esc(t.name) + '</h2>'
    + '<div class="ship" data-ship="' + esc(t.name) + '">' + t.ships[step % t.ships.length] + '</div>'
    + '<div class="summary">' + done + '/' + n + ' done' + counts + '</div>' + t.agents.map(agent).join('') + '</section>'
}

function draw() {
  const tickets = data.tickets.filter(t => !only || t.name.toLowerCase() === only)
  document.getElementById('root').innerHTML = tickets.length ? tickets.map(ticket).join('') : '<div class="empty">No crew run found.</div>'
}

async function poll() {
  try {
    const res = await fetch('/api/board?' + new URLSearchParams({ t: params.get('t') ?? '', style: params.get('style') ?? '' }))
    if (!res.ok) throw new Error(res.status)
    data = await res.json()
    draw()
    document.getElementById('clock').textContent = 'updated ' + new Date().toLocaleTimeString()
  } catch {
    document.getElementById('clock').textContent = 'offline, retrying...'
  }
}

setInterval(() => {
  if (!data) return
  step++
  for (const t of data.tickets) {
    if (t.ships.length < 2) continue
    const el = document.querySelector('[data-ship="' + CSS.escape(t.name) + '"]')
    if (el) el.innerHTML = t.ships[step % t.ships.length]
  }
}, 500)
poll()
setInterval(poll, 2000)
</script>
</body>
</html>`
