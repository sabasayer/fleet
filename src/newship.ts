import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { basename, dirname, isAbsolute } from 'node:path'
import { promisify } from 'node:util'

import { defaultClient, herdrVerdict, shellQuote, startInWorkspace, type JumpDeps } from './jump.ts'
import { isShipName } from './life.ts'
import type { Fleet } from './state.ts'

const run = promisify(execFile)

const CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/
export const LIMITS = { fleet: 60, task: 500, folder: 1000 }

export type NewShipDeps = {
  repoRoot: (path: string) => Promise<string | null>
  uuid: () => string
}
export type NewShipResult =
  | { status: 'started'; message: string; ship: string; sessionId: string; fleet: string; folder: string }
  | { status: 'fallback'; message: string; command: string; ship: string; sessionId: string; fleet: string; folder: string }
  | { status: 'unsupported'; message: string; command: string | null }
  | { status: 'error'; message: string }

export const realNewShipDeps: NewShipDeps = {
  uuid: () => randomUUID(),
  repoRoot: async path => {
    const git = async (...args: string[]) => (await run('git', ['-C', path, ...args], { timeout: 10000 })).stdout.trim()
    try {
      const common = await git('rev-parse', '--path-format=absolute', '--git-common-dir')
      if (basename(common) === '.git') return dirname(common)

      return await git('rev-parse', '--show-toplevel')
    } catch {
      return null
    }
  },
}

type Text = { ok: true; value: string } | { ok: false; message: string }

function text(value: unknown, label: string, max: number): Text {
  if (typeof value !== 'string') return { ok: false, message: `${label} is missing.` }
  const trimmed = value.trim()
  if (!trimmed) return { ok: false, message: `${label} is empty.` }
  if (CONTROL.test(value)) return { ok: false, message: `${label} has a line break or a control character.` }
  if (trimmed.length > max) return { ok: false, message: `${label} is longer than ${max} characters.` }

  return { ok: true, value: trimmed }
}

const SLUG_MAX = 40

const slug = (task: string) => {
  const last = /^https?:\/\//i.test(task) ? (task.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '') : task

  return last
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
}

export function shipName(task: string, uuid: string, prefix = '') {
  const short = uuid.replaceAll('-', '').slice(0, 4)
  const fallback = `${prefix}new-${uuid.replaceAll('-', '').slice(0, 8)}`
  const slugged = slug(task)
  const base = `${prefix}${slugged}`.slice(0, SLUG_MAX).replace(/-+$/, '')
  const name = slugged ? `${base}-${short}` : fallback

  return isShipName(name) ? name : fallback
}

export const crewPrompt = (task: string, fleet: string) => `/crew ${task} fleet: ${fleet}`

export const scoutPrompt = (task: string, fleet: string) => `/scout ${task} fleet: ${fleet}`

export const startArgv = (uuid: string, ship: string, prompt: string) => ['claude', '--session-id', uuid, '-n', ship, prompt]

export const startCommand = (folder: string, argv: string[]) => `cd ${shellQuote(folder)} && ${argv.map((arg, i) => (i === 0 ? arg : shellQuote(arg))).join(' ')}`

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export async function startNewShip(input: any, fleets: Pick<Fleet, 'id' | 'name'>[], jumpDeps: JumpDeps, deps: NewShipDeps = realNewShipDeps): Promise<NewShipResult> {
  const fleetText = text(input?.fleet, 'Fleet', LIMITS.fleet)
  if (!fleetText.ok) return { status: 'error', message: fleetText.message }
  const taskText = text(input?.task, 'Task', LIMITS.task)
  if (!taskText.ok) return { status: 'error', message: taskText.message }
  const folderText = text(input?.folder, 'Repo folder', LIMITS.folder)
  if (!folderText.ok) return { status: 'error', message: folderText.message }
  if (!isAbsolute(folderText.value)) return { status: 'error', message: 'Repo folder must be an absolute path.' }
  if (!jumpDeps.isDir(folderText.value)) return { status: 'error', message: 'Repo folder does not exist.' }
  const folder = await deps.repoRoot(folderText.value)
  if (!folder) return { status: 'error', message: 'Repo folder is not a git repo.' }

  const known = fleets.find(f => f.id === fleetText.value) ?? fleets.find(f => f.name === fleetText.value)
  const fleet = known?.id ?? fleetText.value
  const fleetName = known?.name ?? fleetText.value
  const sessionId = deps.uuid()
  const scout = input?.scout === true
  const ship = shipName(taskText.value, sessionId, scout ? 'scout-' : '')
  const prompt = scout ? scoutPrompt(taskText.value, fleet) : crewPrompt(taskText.value, fleet)
  const argv = startArgv(sessionId, ship, prompt)
  const command = startCommand(folder, argv)
  const moved = folder === folderText.value ? '' : ` Used the main checkout ${folder}.`
  const common = { ship, sessionId, fleet, folder }

  const { herdr, message: unsupportedMessage } = await herdrVerdict(jumpDeps)
  if (herdr === 'unsupported') return { status: 'unsupported', message: unsupportedMessage, command }
  const client = herdr === 'ok' ? await defaultClient(jumpDeps) : null
  if (!client) return { status: 'fallback', message: 'herdr did not answer. Run this command in a terminal.', command, ...common }

  try {
    await startInWorkspace(client, { name: ship, fleetName }, folder, argv)
    await jumpDeps.openGhostty()
  } catch (error) {
    return { status: 'error', message: `Could not start the ship in herdr: ${message(error)}` }
  }

  return { status: 'started', message: `Started ${ship} in the "${fleetName}" workspace.${moved}`, ...common }
}
