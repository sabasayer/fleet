import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'

import { observeMr, readStored, writeStored } from './life.ts'
import { fleetHome, readState, type Mr } from './state.ts'

export const POLL_MS = 2 * 60 * 1000
export const CHECK_LIMIT_MS = 60 * 1000
const CLI_LIMIT_MS = 30 * 1000

export type CliResult = { ok: true; stdout: string } | { ok: false; missing: boolean; message: string }
export type CheckResult = { code: number | null; timedOut: boolean; error?: string }
export type CheckOptions = { env: Record<string, string>; cwd: string; timeoutMs: number }
export type Deps = {
  cli: (file: 'glab' | 'gh', args: string[]) => Promise<CliResult>
  check: (command: string, options: CheckOptions) => Promise<CheckResult>
  now: () => number
}
export type Seen = { n: number; kind: 'merge' | 'release'; text: string; at: number }

export const realDeps: Deps = {
  cli: (file, args) =>
    new Promise(resolve =>
      execFile(file, args, { timeout: CLI_LIMIT_MS, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (!error) return resolve({ ok: true, stdout })
        const missing = (error as NodeJS.ErrnoException).code === 'ENOENT'
        resolve({ ok: false, missing, message: missing ? `${file} not found` : `${file} failed: ${(stderr || error.message).trim().split('\n')[0]}` })
      }),
    ),
  check: (command, { env, cwd, timeoutMs }) =>
    new Promise(resolve => {
      let done = false
      const finish = (result: CheckResult) => {
        if (done) return
        done = true
        clearTimeout(timer)
        resolve(result)
      }
      const child = spawn('/bin/sh', ['-c', command], { env: { ...process.env, ...env }, cwd, detached: true, stdio: 'ignore' })
      const timer = setTimeout(() => {
        try {
          process.kill(-child.pid!, 'SIGKILL')
        } catch {}
        finish({ code: null, timedOut: true })
      }, timeoutMs)
      child.on('error', error => finish({ code: null, timedOut: false, error: error.message }))
      child.on('close', code => finish({ code, timedOut: false }))
    }),
  now: () => Date.now(),
}

export const hostCli = (url: string): 'glab' | 'gh' => {
  try {
    return new URL(url).hostname.includes('github') ? 'gh' : 'glab'
  } catch {
    return 'glab'
  }
}

type Seen2 = { state: 'merged' | 'abandoned' | 'open'; sha: string | null }

export function parseHost(file: 'glab' | 'gh', stdout: string): Seen2 | null {
  let j: any
  try {
    j = JSON.parse(stdout)
  } catch {
    return null
  }
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
  if (file === 'gh') {
    const state = String(j?.state).toUpperCase()
    if (state === 'MERGED') return { state: 'merged', sha: str(j.mergeCommit?.oid) }

    return state === 'CLOSED' ? { state: 'abandoned', sha: null } : state === 'OPEN' ? { state: 'open', sha: null } : null
  }
  const state = String(j?.state).toLowerCase()
  if (state === 'merged') return { state: 'merged', sha: str(j.merge_commit_sha) ?? str(j.squash_commit_sha) ?? str(j.sha) }

  return state === 'closed' ? { state: 'abandoned', sha: null } : state === 'opened' || state === 'locked' ? { state: 'open', sha: null } : null
}

export const hostArgs = (file: 'glab' | 'gh', url: string) =>
  file === 'gh' ? ['pr', 'view', url, '--json', 'state,mergeCommit'] : ['mr', 'view', url, '--output', 'json']

export type Watcher = { tick: () => Promise<void>; seen: (ship: string) => Seen[]; stop: () => void }

export function startWatcher({
  env = process.env,
  deps = realDeps,
  intervalMs = POLL_MS,
  checkLimitMs = CHECK_LIMIT_MS,
  auto = true,
}: { env?: NodeJS.ProcessEnv; deps?: Deps; intervalMs?: number; checkLimitMs?: number; auto?: boolean } = {}): Watcher {
  const busy = new Set<string>()
  const results = new Map<string, Seen>()
  const home = fleetHome(env)

  const note = (ship: string, mr: number, kind: Seen['kind'], text: string) => results.set(`${ship}#${mr}#${kind}`, { n: mr, kind, text, at: deps.now() })
  const forget = (ship: string, mr: number, kind: Seen['kind']) => results.delete(`${ship}#${mr}#${kind}`)

  const move = (ship: string, mr: number, to: 'merged' | 'abandoned' | 'released', sha: string | null) => {
    const next = observeMr(readStored(home, ship), mr, to, sha, new Date(deps.now()).toISOString())
    if (next) writeStored(home, ship, next)
  }

  const pollMerge = async (ship: string, mr: Mr) => {
    const file = hostCli(mr.url!)
    const got = await deps.cli(file, hostArgs(file, mr.url!))
    if (!got.ok) return note(ship, mr.n, 'merge', got.message)
    const seen = parseHost(file, got.stdout)
    if (!seen) return note(ship, mr.n, 'merge', `${file} gave output fleet could not read`)
    if (seen.state === 'open') return note(ship, mr.n, 'merge', 'merge check: still open')
    forget(ship, mr.n, 'merge')
    move(ship, mr.n, seen.state, seen.sha)
  }

  const runRelease = async (ship: string, mr: Mr, command: string, sha: string | null) => {
    const result = await deps.check(command, {
      cwd: existsSync(mr.worktree) ? mr.worktree : homedir(),
      timeoutMs: checkLimitMs,
      env: { FLEET_SHA: sha ?? '', FLEET_REPO: mr.repo, FLEET_REMOTE: mr.remote, FLEET_BRANCH: mr.branch, FLEET_MR_URL: mr.url ?? '' },
    })
    if (result.code === 0) {
      forget(ship, mr.n, 'release')
      return move(ship, mr.n, 'released', null)
    }
    note(ship, mr.n, 'release', result.timedOut ? 'release check: stopped after the time limit' : result.error ? `release check: ${result.error}` : 'release check: not yet')
  }

  const once = (key: string, job: () => Promise<unknown>) => {
    if (busy.has(key)) return []
    busy.add(key)

    return [job().catch(() => undefined).finally(() => busy.delete(key))]
  }

  const tick = async () => {
    const jobs: Promise<unknown>[] = []
    for (const fleet of readState(env, deps.now()).fleets) {
      for (const ship of fleet.ships) {
        ship.mrs.forEach((mr, i) => {
          const life = ship.life.mrs[i]
          if (life.state === 'in_review' && mr.url) jobs.push(...once(`${ship.ship}#${mr.n}#merge`, () => pollMerge(ship.ship, mr)))
          else if (life.state === 'merged' && fleet.release_check) {
            jobs.push(...once(`${ship.ship}#${mr.n}#release`, () => runRelease(ship.ship, mr, fleet.release_check!, life.sha)))
          }
        })
      }
    }
    await Promise.all(jobs)
  }

  const timer = auto ? setInterval(() => void tick().catch(() => undefined), intervalMs) : undefined
  timer?.unref()
  if (auto) setTimeout(() => void tick().catch(() => undefined), 0).unref()

  return {
    tick,
    seen: ship => [...results].filter(([k]) => k.startsWith(`${ship}#`)).map(([, v]) => v),
    stop: () => clearInterval(timer),
  }
}
