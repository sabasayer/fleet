import { serverError } from './actions.js'
const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

export function describe(result) {
  if (result.status === 'outside_herdr') {
    const who = result.pid ? `PID ${result.pid}` : 'no PID'
    return `${result.message} Folder: ${result.cwd}. ${who}.`
  }

  return result.message
}

export function jumpHtml(ship, jump) {
  const mine = jump?.ship === ship.ship ? jump : null
  const busy = Boolean(mine?.busy)
  const disabled = busy || !ship.session
  const result = mine?.result
  const kind = result && (result.status === 'error' || result.status === 'unsupported' ? 'bad' : result.status === 'fallback' ? 'warn' : 'good')
  const note = !ship.session ? '<p class="dim">No session yet.</p>' : ''
  const message = result ? `<p class="jump-msg ${kind}">${escapeHtml(describe(result))}</p>` : ''
  const command = result?.command
    ? `<pre class="jump-cmd">${escapeHtml(result.command)}</pre><button type="button" data-copy="${escapeHtml(result.command)}">${mine.copied ? 'Copied' : 'Copy command'}</button>`
    : ''

  return `<div class="jump">
    <button type="button" data-jump="${escapeHtml(ship.ship)}"${disabled ? ' disabled' : ''}>${busy ? 'Jumping…' : 'Jump back'}</button>
    ${note}${message}${command}
  </div>`
}

export async function requestJump(ship, token, doFetch = fetch) {
  try {
    const res = await doFetch(`/api/ships/${encodeURIComponent(ship)}/jump`, { method: 'POST', headers: { 'x-fleet-token': token } })
    if (res.status === 200) return await res.json()

    return { status: 'error', message: serverError(res.status) }
  } catch {
    return { status: 'error', message: 'Server not reachable.' }
  }
}
