import { readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { lifeOf, readStored, type Life } from './life.ts'
import { isStatusFile, parseCrewMember, sortChain, type CrewMember } from './board.ts'

export type NeedsCaptain = { role: string; reason: string; kind: 'blocked' | 'failed' }
export type Mr = {
  n: number
  repo: string
  remote: string
  worktree: string
  branch: string
  url: string | null
  crew: CrewMember[]
  needsCaptain: NeedsCaptain | null
}
export type Ship = {
  ship: string
  title: string
  task: string | null
  fleet: string
  created: string
  session: { id: string; updated: string } | null
  mrs: Mr[]
  needsCaptain: NeedsCaptain | null
  life: Life
}
export type FleetInfo = { name: string; color: string; release_check?: string; repos?: string[] }
export type Fleet = FleetInfo & { id: string; ships: Ship[] }
export type State = { now: number; fleets: Fleet[] }

export const crewRoot = (env = process.env) => env.CREW_BOARD_ROOT || join(homedir(), '.crew')
export const fleetHome = (env = process.env) => env.CREW_FLEET_HOME || join(homedir(), '.fleet')

function readJson(path: string): any {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

function readDir(path: string) {
  try {
    return readdirSync(path)
  } catch {
    return []
  }
}

export function readCrew(folder: string, now: number) {
  const members = readDir(folder)
    .filter(isStatusFile)
    .map(file => {
      const path = join(folder, file)
      try {
        return parseCrewMember(file, readFileSync(path, 'utf8'), statSync(path).mtimeMs, now)
      } catch {
        return undefined
      }
    })
    .filter((m): m is CrewMember => m !== undefined)

  return sortChain(members)
}

export function needsCaptain(crew: CrewMember[]): NeedsCaptain | null {
  const pick = (kind: 'blocked' | 'failed') => {
    const m = crew.find(c => c.state === kind)

    return m ? { role: m.role, reason: m.summary || m.phase || kind, kind } : null
  }

  return pick('blocked') ?? pick('failed')
}

export function colorFor(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360

  return `hsl(${h} 55% 50%)`
}

function readFleets(home: string): Record<string, Partial<FleetInfo>> {
  const j = readJson(join(home, 'fleets.json'))

  return j && typeof j === 'object' && !Array.isArray(j) ? j : {}
}

export function readShip(root: string, home: string, folder: string, folders: string[], now: number): Ship | undefined {
  const j = readJson(join(root, folder, 'ship.json'))
  if (!j || typeof j.ship !== 'string' || typeof j.fleet !== 'string' || !Array.isArray(j.mrs)) return undefined
  const prefix = `${j.ship.toLowerCase()}-mr`
  const mrs: Mr[] = j.mrs.map((m: any) => {
    const mrFolder = folders.find(f => f.toLowerCase() === `${prefix}${m.n}`)
    const crew = mrFolder ? readCrew(join(root, mrFolder), now) : []

    return {
      n: m.n,
      repo: m.repo,
      remote: m.remote,
      worktree: m.worktree,
      branch: m.branch,
      url: m.url ?? null,
      crew,
      needsCaptain: needsCaptain(crew),
    }
  })
  const life = lifeOf(mrs, readStored(home, j.ship))
  const sailing = life.state === 'sailing'
  const waiting = mrs.map((m, i) => (life.mrs[i].state === 'sailing' ? m.needsCaptain : null))

  return {
    ship: j.ship,
    title: j.title,
    task: j.task ?? null,
    fleet: j.fleet,
    created: j.created,
    session: j.session ?? null,
    mrs,
    needsCaptain: sailing ? (waiting.find(w => w?.kind === 'blocked') ?? waiting.find(Boolean) ?? null) : null,
    life,
  }
}

export function readState(env = process.env, now = Date.now()): State {
  const root = crewRoot(env)
  const folders = readDir(root)
  const home = fleetHome(env)
  const configs = readFleets(home)
  const byFleet = new Map<string, Ship[]>()
  for (const folder of folders) {
    const ship = readShip(root, home, folder, folders, now)
    if (ship) byFleet.set(ship.fleet, [...(byFleet.get(ship.fleet) ?? []), ship])
  }
  for (const id of Object.keys(configs)) if (!byFleet.has(id)) byFleet.set(id, [])
  const fleets = [...byFleet].map(([id, ships]): Fleet => {
    const config = configs[id] ?? {}

    return {
      id,
      name: config.name || id,
      color: config.color || colorFor(id),
      ...(config.release_check ? { release_check: config.release_check } : {}),
      ...(Array.isArray(config.repos) ? { repos: config.repos.filter((r): r is string => typeof r === 'string' && r.startsWith('/')) } : {}),
      ships: ships.sort((a, b) => a.created.localeCompare(b.created)),
    }
  })

  return { now, fleets: fleets.sort((a, b) => a.name.localeCompare(b.name)) }
}
