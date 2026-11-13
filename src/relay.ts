import { findPane, herdrVerdict, type JumpDeps } from './jump.ts'

export type RelayShip = { sessionId: string | null; worktrees: string[] }
export type RelayResult =
  | { status: 'sent' }
  | { status: 'read'; text: string }
  | { status: 'not_found'; message: string }
  | { status: 'error'; message: string }

export const MAX_SEND = 4000
export const MAX_LINES = 400

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CONTROL_BUT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029]/
const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

async function livePane(ship: RelayShip, deps: JumpDeps) {
  const sessionId = ship.sessionId?.toLowerCase() ?? ''
  if (!UUID.test(sessionId)) return { error: { status: 'not_found', message: 'This ship has no session ID.' } as const }
  if ((await herdrVerdict(deps)).herdr !== 'ok') return { error: { status: 'error', message: 'herdr is not running or not supported.' } as const }
  const found = await findPane(deps, sessionId, ship.worktrees)
  if (!found.pane || !found.client) return { error: { status: 'not_found', message: 'No open pane runs this ship. Jump back first.' } as const }

  return { pane: found.pane, client: found.client }
}

export async function sendToShip(ship: RelayShip, text: unknown, deps: JumpDeps): Promise<RelayResult> {
  if (typeof text !== 'string' || !text.trim()) return { status: 'error', message: 'Text is empty.' }
  if (text.length > MAX_SEND) return { status: 'error', message: `Text is longer than ${MAX_SEND} characters.` }
  if (CONTROL_BUT_NEWLINE.test(text)) return { status: 'error', message: 'Text has a control character.' }
  const live = await livePane(ship, deps)
  if ('error' in live) return live.error
  try {
    await live.client('pane.send_input', { pane_id: live.pane.pane_id, text, keys: ['Enter'] })
  } catch (error) {
    return { status: 'error', message: `Could not send: ${message(error)}` }
  }

  return { status: 'sent' }
}

export async function readShip(ship: RelayShip, lines: unknown, deps: JumpDeps): Promise<RelayResult> {
  const count = Number.isInteger(lines) && (lines as number) > 0 ? Math.min(lines as number, MAX_LINES) : 80
  const live = await livePane(ship, deps)
  if ('error' in live) return live.error
  try {
    const out = await live.client('pane.read', { pane_id: live.pane.pane_id, source: 'recent', lines: count })

    return { status: 'read', text: String(out?.read?.text ?? '') }
  } catch (error) {
    return { status: 'error', message: `Could not read: ${message(error)}` }
  }
}
