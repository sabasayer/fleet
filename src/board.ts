export const STALE_MS = 15 * 60_000

const CHAIN = ['gate-spec', 'spec', 'spike', 'red', 'pin', 'gate-tests', 'green', 'move', 'review', 'fixer', 'browser', 'gate-captain']

export type CrewMember = {
  role: string
  state: string
  phase?: string
  done?: number
  total?: number
  summary?: string
  order?: number
  updatedMs: number
  stale: boolean
}

function chainIndex(role: string) {
  const i = CHAIN.findIndex(name => role === name || role.startsWith(`${name}-`))

  return i === -1 ? CHAIN.length : i
}

export function sortChain<T extends { role: string; order?: number }>(members: T[]) {
  return [...members].sort(
    (a, b) =>
      (a.order ?? Infinity) - (b.order ?? Infinity) ||
      chainIndex(a.role) - chainIndex(b.role) ||
      a.role.localeCompare(b.role),
  )
}

export const isStatusFile = (name: string) => name.endsWith('.json') && name !== 'ship.json'

export function parseCrewMember(file: string, text: string, mtimeMs: number, now: number): CrewMember {
  const fallback = file.replace(/\.json$/, '')
  let member: Omit<CrewMember, 'stale'>
  try {
    const j = JSON.parse(text)
    const updated = Date.parse(j.updated)
    member = {
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
    member = { role: fallback, state: 'unreadable', updatedMs: mtimeMs }
  }

  return { ...member, stale: member.state === 'running' && now - member.updatedMs > STALE_MS }
}
