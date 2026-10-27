export const page = (token: string) => `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>fleet</title></head>
<body>
<h1>fleet</h1>
<div id="root">loading</div>
<script>
const token = ${JSON.stringify(token)}
const root = document.getElementById('root')
const el = (tag, text) => Object.assign(document.createElement(tag), { textContent: text })

function render(state) {
  root.replaceChildren(...state.fleets.map(fleet => {
    const section = document.createElement('section')
    section.append(el('h2', fleet.name))
    const list = document.createElement('ul')
    for (const ship of fleet.ships) {
      const item = el('li', ship.ship + ' - ' + ship.title)
      if (ship.needsCaptain) item.append(el('strong', ' [needs captain: ' + ship.needsCaptain.reason + ']'))
      const mrs = document.createElement('ul')
      for (const mr of ship.mrs) {
        const row = el('li', 'MR ' + mr.n + ': ' + mr.crew.map(c => c.role + ' ' + c.state + (c.stale ? ' (stale)' : '')).join(', '))
        mrs.append(row)
      }
      item.append(mrs)
      list.append(item)
    }
    section.append(list)
    return section
  }))
  if (!state.fleets.length) root.textContent = 'no ships'
}

async function poll() {
  try {
    render(await (await fetch('/api/state')).json())
  } catch (e) {
    root.textContent = 'server not reachable'
  }
}
poll()
setInterval(poll, 2000)
</script>
</body>
</html>
`
