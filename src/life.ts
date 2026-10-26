import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const STAGES = ['sailing', 'in_review', 'merged', 'released', 'testing', 'done'] as const
export type Stage = (typeof STAGES)[number]
export type AfterState = 'merged' | 'released' | 'testing' | 'done' | 'abandoned'
export type MrState = Stage | 'abandoned'
export type LifeState = MrState | 'paused' | 'failed'
export const ACTIONS = ['mark_merged', 'mark_released', 'start_testing', 'done', 'bug_found', 'pause', 'resume', 'mark_failed', 'undock'] as const
export type Action = (typeof ACTIONS)[number]

export type StoredMr = { state: AfterState; sha: string | null; changed: string }
export type Stored = {
  version: 1
  mrs: Record<string, StoredMr>
  paused: boolean
  failed: boolean
  docked: string | null
  backToSea: number | null
}
export type MrInput = { n: number; url: string | null; crew: { state: string }[] }
export type Life = {
  stage: MrState
  state: LifeState
  paused: boolean
  failed: boolean
  endedAt: number | null
  mrs: { n: number; state: MrState; sha: string | null; changed: number | null }[]
  actions: Action[]
}

const AFTER_STATES: AfterState[] = ['merged', 'released', 'testing', 'done', 'abandoned']
const SHIP_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/

export const isShipName = (name: unknown): name is string => typeof name === 'string' && SHIP_NAME.test(name)
export const isAction = (name: unknown): name is Action => ACTIONS.includes(name as Action)

export const emptyStored = (): Stored => ({ version: 1, mrs: {}, paused: false, failed: false, docked: null, backToSea: null })

export function normalizeStored(raw: any): Stored {
  const out = emptyStored()
  if (!raw || typeof raw !== 'object') return out
  for (const [n, mr] of Object.entries<any>(raw.mrs && typeof raw.mrs === 'object' ? raw.mrs : {})) {
    if (mr && AFTER_STATES.includes(mr.state)) {
      out.mrs[n] = { state: mr.state, sha: typeof mr.sha === 'string' ? mr.sha : null, changed: String(mr.changed ?? '') }
    }
  }
  out.paused = raw.paused === true
  out.failed = raw.failed === true
  out.docked = typeof raw.docked === 'string' ? raw.docked : null
  out.backToSea = Number.isInteger(raw.backToSea) ? raw.backToSea : null

  return out
}

export function mrState(mr: MrInput, stored: Stored): MrState {
  const kept = stored.mrs[String(mr.n)]
  if (kept) return kept.state
  const crewDone = mr.crew.length > 0 && mr.crew.every(m => m.state === 'done')

  return crewDone && Boolean(mr.url) ? 'in_review' : 'sailing'
}

export function shipStage(mrs: MrInput[], stored: Stored): MrState {
  if (mrs.length === 0) return 'sailing'
  const states = mrs.map(mr => mrState(mr, stored))
  const live = states.filter((s): s is Stage => s !== 'abandoned')
  if (live.length === 0) return 'abandoned'
  if (stored.backToSea !== null && mrs.length <= stored.backToSea) return 'sailing'

  return live.reduce((a, b) => (STAGES.indexOf(b) < STAGES.indexOf(a) ? b : a))
}

const flagActions = (state: LifeState): Action[] => (state === 'failed' ? ['resume'] : state === 'paused' ? ['resume', 'mark_failed'] : ['pause', 'mark_failed'])

export function actionsFor(state: LifeState): Action[] {
  if (state === 'abandoned') return []
  if (state === 'done') return ['undock']
  if (state === 'paused' || state === 'failed') return flagActions(state)
  const step: Partial<Record<Stage, Action[]>> = {
    in_review: ['mark_merged'],
    merged: ['mark_released'],
    released: ['start_testing'],
    testing: ['done', 'bug_found'],
  }

  return [...(step[state] ?? []), ...flagActions(state)]
}

const ms = (iso: string | null) => {
  const t = Date.parse(iso ?? '')

  return Number.isNaN(t) ? null : t
}

export function lifeOf(mrs: MrInput[], stored: Stored): Life {
  const stage = shipStage(mrs, stored)
  const state: LifeState = stored.failed ? 'failed' : stored.paused ? 'paused' : stage
  const rows = mrs.map(mr => ({
    n: mr.n,
    state: mrState(mr, stored),
    sha: stored.mrs[String(mr.n)]?.sha ?? null,
    changed: ms(stored.mrs[String(mr.n)]?.changed ?? null),
  }))
  const changes = rows.map(r => r.changed).filter((t): t is number => t !== null)
  const latest = changes.length > 0 ? Math.max(...changes) : null
  const endedAt = stage === 'done' ? (ms(stored.docked) ?? latest) : stage === 'abandoned' ? latest : null

  return { stage, state, paused: stored.paused, failed: stored.failed, endedAt, mrs: rows, actions: actionsFor(state) }
}

export function applyAction(mrs: MrInput[], stored: Stored, action: Action, now: string): Stored {
  const life = lifeOf(mrs, stored)
  if (!life.actions.includes(action)) throw new Error(`${action} does not apply to a ship that is ${life.state}`)
  const next: Stored = { ...stored, mrs: { ...stored.mrs } }
  const move = (from: MrState, to: AfterState) => {
    for (const mr of mrs) if (mrState(mr, stored) === from) next.mrs[String(mr.n)] = { state: to, sha: stored.mrs[String(mr.n)]?.sha ?? null, changed: now }
  }

  if (action === 'mark_merged') move('in_review', 'merged')
  else if (action === 'mark_released') move('merged', 'released')
  else if (action === 'start_testing') move('released', 'testing')
  else if (action === 'done') {
    move('testing', 'done')
    next.docked = now
  } else if (action === 'undock') {
    move('done', 'testing')
    next.docked = null
    next.backToSea = null
  } else if (action === 'bug_found') next.backToSea = mrs.length
  else if (action === 'pause') next.paused = true
  else if (action === 'mark_failed') {
    next.failed = true
    next.paused = false
  } else {
    next.paused = false
    next.failed = false
  }

  return next
}

const storedPath = (home: string, ship: string) => join(home, 'ships', `${ship}.json`)

export function readStored(home: string, ship: string): Stored {
  if (!isShipName(ship)) return emptyStored()
  try {
    return normalizeStored(JSON.parse(readFileSync(storedPath(home, ship), 'utf8')))
  } catch {
    return emptyStored()
  }
}

export function writeStored(home: string, ship: string, stored: Stored) {
  if (!isShipName(ship)) throw new Error('bad ship name')
  mkdirSync(join(home, 'ships'), { recursive: true })
  const path = storedPath(home, ship)
  const temp = `${path}.${process.pid}.tmp`
  writeFileSync(temp, `${JSON.stringify({ ship, ...stored }, null, 2)}\n`)
  renameSync(temp, path)
}
