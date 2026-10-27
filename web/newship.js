const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

export const LIMITS = { fleet: 60, task: 500, folder: 1000 }
export const WAIT_MS = 3 * 60 * 1000

export function fleetChoices(fleets) {
  return fleets.map(f => ({ id: f.id, name: f.name }))
}

const matchingFleets = (fleets, typed) => {
  const wanted = String(typed ?? '').trim()

  return fleets.filter(f => f.id === wanted || f.name === wanted)
}

export function repoChoices(fleets, typed) {
  const match = matchingFleets(fleets, typed)
  const scope = match.length > 0 ? match : fleets
  const configured = scope.flatMap(f => (Array.isArray(f.repos) ? f.repos : []))
  const past = scope.flatMap(f => f.ships.flatMap(s => s.mrs.map(mr => (mr.repo?.startsWith('/') ? mr.repo : mr.worktree))))

  return [...new Set([...configured, ...past].filter(path => typeof path === 'string' && path.startsWith('/')))]
}

export function preselectedRepo(fleets, typed) {
  if (matchingFleets(fleets, typed).length === 0) return ''
  const choices = repoChoices(fleets, typed)

  return choices.length === 1 ? choices[0] : ''
}

export const optionsHtml = values => values.map(v => `<option value="${escapeHtml(v)}"></option>`).join('')

export const datalistHtml = (id, values) => `<datalist id="${id}">${optionsHtml(values)}</datalist>`

export function describeStart(result) {
  return result.message
}

export function newShipFormHtml({ fleets, form, busy, result }) {
  const kind = result && (result.status === 'error' || result.status === 'unsupported' ? 'bad' : result.status === 'fallback' ? 'warn' : 'good')
  const message = result ? `<p class="jump-msg ${kind}">${escapeHtml(describeStart(result))}</p>` : ''
  const command = result?.command
    ? `<pre class="jump-cmd">${escapeHtml(result.command)}</pre><button type="button" data-copy-new="${escapeHtml(result.command)}">${form.copied ? 'Copied' : 'Copy command'}</button>`
    : ''

  return `<form class="modal-box hud-block" id="newship-form" autocomplete="off">
    <h3>New ship</h3>
    <label>Fleet <span class="dim">(pick one or type a new name)</span>
      <input name="fleet" list="newship-fleets" required maxlength="${LIMITS.fleet}" value="${escapeHtml(form.fleet)}"></label>
    ${datalistHtml('newship-fleets', fleets.map(f => f.name))}
    <label>Repo folder <span class="dim">(pick one or paste an absolute path)</span>
      <input name="folder" list="newship-repos" required maxlength="${LIMITS.folder}" value="${escapeHtml(form.folder)}"></label>
    ${datalistHtml('newship-repos', repoChoices(fleets, form.fleet))}
    <label>Task <span class="dim">(text or link)</span>
      <input name="task" required maxlength="${LIMITS.task}" value="${escapeHtml(form.task)}"></label>
    <div class="buttons"><button type="submit"${busy ? ' disabled' : ''}>${busy ? 'Starting…' : 'Start ship'}</button><button type="button" data-newship-close>Close</button></div>
    ${message}${command}
  </form>`
}

export function startingHtml(starting, now) {
  if (starting.length === 0) return ''
  const lines = starting.map(entry =>
    now - entry.startedAt >= WAIT_MS
      ? `<p class="jump-msg warn">${escapeHtml(entry.ship)}: not seen yet. Jump back to check.</p>`
      : `<p class="dim">starting ${escapeHtml(entry.ship)}…</p>`,
  )

  return `<section class="hud-block starting-panel"><h3>new ships</h3>${lines.join('')}</section>`
}

export async function requestNewShip(form, token, doFetch = fetch) {
  try {
    const res = await doFetch('/api/ships/new', {
      method: 'POST',
      headers: { 'x-fleet-token': token, 'content-type': 'application/json' },
      body: JSON.stringify({ fleet: form.fleet, folder: form.folder, task: form.task }),
    })
    if (res.status === 200) return await res.json()

    return { status: 'error', message: `Server answered ${res.status}.` }
  } catch {
    return { status: 'error', message: 'Server not reachable.' }
  }
}
