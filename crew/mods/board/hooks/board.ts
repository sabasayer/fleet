import type { Agent, Board, Ticket } from '../types'

export const STALE_MS = 15 * 60_000
export const OLD_MS = 30 * 24 * 3600_000
export const LEGACY_ROOT = '/tmp/crew'

const CHAIN = ['gate-spec', 'spec', 'spike', 'red', 'pin', 'gate-tests', 'green', 'move', 'review', 'fixer', 'browser', 'gate-captain']

export function chainIndex(role: string) {
  const i = CHAIN.findIndex(name => role === name || role.startsWith(`${name}-`))

  return i === -1 ? CHAIN.length : i
}

export function sortChain(agents: Agent[]) {
  return [...agents].sort(
    (a, b) =>
      (a.order ?? Infinity) - (b.order ?? Infinity) ||
      chainIndex(a.role) - chainIndex(b.role) ||
      a.role.localeCompare(b.role),
  )
}

export const isStatusFile = (name: string) => name.endsWith('.json') && name !== 'ship.json'

export function parseAgent(file: string, text: string, mtimeMs: number): Agent {
  const fallback = file.replace(/\.json$/, '')
  try {
    const j = JSON.parse(text)
    const updated = Date.parse(j.updated)

    return {
      role: String(j.role ?? fallback),
      state: String(j.state ?? 'unknown'),
      phase: j.phase == null ? undefined : String(j.phase),
      done: typeof j.done === 'number' ? j.done : undefined,
      total: typeof j.total === 'number' ? j.total : undefined,
      summary: j.summary ? String(j.summary) : undefined,
      order: typeof j.order === 'number' ? j.order : undefined,
      updatedMs: Number.isNaN(updated) ? mtimeMs : updated,
    }
  } catch {
    return { role: fallback, state: 'unreadable', updatedMs: mtimeMs, broken: true }
  }
}

export const isStale = (a: Agent, now: number) => a.state === 'running' && now - a.updatedMs > STALE_MS

export function age(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`

  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`
}

export function bar(a: Agent, width: number, tick: number) {
  if (a.done != null && a.total) {
    const filled = Math.min(width, Math.round((width * a.done) / a.total))

    return '█'.repeat(filled) + '░'.repeat(width - filled)
  }
  if (a.state === 'done') return '█'.repeat(width)
  if (a.state !== 'running') return '░'.repeat(width)
  const at = tick % width

  return '░'.repeat(at) + '██' + '░'.repeat(Math.max(0, width - at - 2))
}

export function resolveRoot(env: string | undefined, option: unknown, home: string | undefined) {
  const raw = (env || String(option ?? '')).trim() || `${home || ''}/.crew`
  const path = raw.startsWith('~/') ? `${home || ''}${raw.slice(1)}` : raw

  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

export const inFocus = (folder: string, only: string) => {
  const name = folder.toLowerCase()

  return name === only || name.startsWith(`${only}-mr`)
}

export const oldRuns = (tickets: Ticket[], now: number) => tickets.filter(t => now - t.newestMs > OLD_MS)

export type Alert = { ticket: string; role: string; kind: 'blocked' | 'failed' | 'stale'; text: string }

const flag = (a: Agent, now: number) => (isStale(a, now) ? 'stale' : a.state === 'blocked' || a.state === 'failed' ? a.state : '')

export function alerts(before: Board | null, after: Board): Alert[] {
  if (!before) return []
  const seen = new Map<string, string>()
  for (const t of before.tickets) for (const a of t.agents) seen.set(`${t.name}/${a.role}`, flag(a, before.now))

  return after.tickets.flatMap(t =>
    t.agents.flatMap(a => {
      const kind = flag(a, after.now)
      if (!kind || seen.get(`${t.name}/${a.role}`) === kind) return []
      const what = kind === 'blocked' ? 'waits for you' : kind === 'failed' ? 'failed' : 'is stale, no update for 15 minutes'
      const detail = (kind === 'failed' ? a.summary : undefined) || a.phase

      return [{ ticket: t.name, role: a.role, kind, text: `${t.name}: ${a.role} ${what}${detail ? ` - ${detail}` : ''}` } satisfies Alert]
    }),
  )
}
