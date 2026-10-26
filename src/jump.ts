import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { promisify } from 'node:util'

import { checkSchema, connectHerdr, herdrDir, socketPaths, type HerdrClient, type SocketRef } from './herdr.ts'

const run = promisify(execFile)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LiveSession = { sessionId: string; cwd: string; pid?: number; id?: string; kind?: string }
export type JumpShip = { name: string; fleetName: string; sessionId: string | null; worktrees: string[] }
export type JumpResult =
  | { status: 'focused'; message: string }
  | { status: 'resumed'; message: string }
  | { status: 'outside_herdr'; message: string; cwd: string; pid: number | null }
  | { status: 'fallback'; reason: 'herdr_down' | 'cannot_verify'; message: string; command: string }
  | { status: 'unsupported'; message: string; command: string | null }
  | { status: 'error'; message: string }

export type JumpDeps = {
  schema: () => Promise<unknown>
  sockets: () => SocketRef[]
  connect: (path: string) => HerdrClient
  liveSessions: () => Promise<LiveSession[] | null>
  openGhostty: () => Promise<void>
  isDir: (path: string) => boolean
}

const shellQuote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`

export const resumeCommand = (cwd: string, sessionId: string) => `cd ${shellQuote(cwd)} && claude --resume ${sessionId}`

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

async function findPane(deps: JumpDeps, sessionId: string) {
  let defaultClient: HerdrClient | null = null
  for (const { path, isDefault } of deps.sockets()) {
    const client = deps.connect(path)
    let agents: any[]
    try {
      agents = (await client('agent.list')).agents ?? []
    } catch {
      continue
    }
    if (isDefault) defaultClient = client
    const pane = agents.find(agent => agent?.agent_session?.value?.toLowerCase() === sessionId)
    if (pane) return { pane, client, defaultClient }
  }

  return { pane: null, client: null, defaultClient }
}

async function startInWorkspace(client: HerdrClient, ship: JumpShip, cwd: string, argv: string[]) {
  const { workspaces = [] } = await client('workspace.list')
  let workspace = workspaces.find((entry: any) => entry.label === ship.fleetName)
  let tabId: string | undefined
  let tabExists = false

  if (workspace) {
    const { tabs = [] } = await client('tab.list', { workspace_id: workspace.workspace_id })
    const tab = tabs.find((entry: any) => entry.label === ship.name)
    tabId = tab?.tab_id
    tabExists = Boolean(tab)
  } else {
    const created = await client('workspace.create', { label: ship.fleetName, cwd, focus: false })
    workspace = created.workspace
    tabId = created.tab?.tab_id
  }

  const started = await client('agent.start', {
    name: ship.name,
    argv,
    cwd,
    workspace_id: workspace.workspace_id,
    ...(tabId ? { tab_id: tabId } : {}),
    focus: true,
  })
  const agent = started.agent
  if (!tabExists) await client('tab.rename', { tab_id: agent.tab_id, label: ship.name })
  await client('agent.focus', { target: agent.terminal_id })
}

export async function jump(ship: JumpShip, deps: JumpDeps): Promise<JumpResult> {
  const sessionId = ship.sessionId?.toLowerCase() ?? ''
  if (!UUID.test(sessionId)) return { status: 'error', message: 'This ship has no valid session ID yet.' }

  let herdr: 'ok' | 'missing' | 'unsupported' = 'ok'
  let unsupportedMessage = ''
  try {
    const verdict = checkSchema(await deps.schema())
    if (!verdict.ok) {
      herdr = 'unsupported'
      unsupportedMessage = verdict.message
    }
  } catch {
    herdr = 'missing'
  }

  const cwd = [...ship.worktrees].reverse().find(path => path.startsWith('/') && deps.isDir(path)) ?? null
  const commandOrNull = cwd ? resumeCommand(cwd, sessionId) : null

  let found: Awaited<ReturnType<typeof findPane>> | null = null
  if (herdr === 'ok') {
    found = await findPane(deps, sessionId)
    if (found.pane) {
      try {
        await found.client!('agent.focus', { target: found.pane.terminal_id })
        await deps.openGhostty()
      } catch (error) {
        return { status: 'error', message: `Could not focus the pane: ${message(error)}` }
      }

      return { status: 'focused', message: 'Brought the ship\'s pane to the front.' }
    }
  }

  const live = await deps.liveSessions()
  const alive = live?.find(entry => entry.sessionId?.toLowerCase() === sessionId)
  if (alive) {
    if (herdr === 'unsupported') {
      return { status: 'unsupported', message: `${unsupportedMessage} The session is running, so fleet cannot focus it.`, command: null }
    }

    return {
      status: 'outside_herdr',
      message: 'This session is running outside herdr. Fleet will not resume it.',
      cwd: alive.cwd,
      pid: alive.pid ?? null,
    }
  }

  if (herdr === 'unsupported') return { status: 'unsupported', message: unsupportedMessage, command: live ? commandOrNull : null }
  if (!cwd) return { status: 'error', message: 'The ship\'s worktree folder does not exist, so fleet cannot resume it.' }

  if (live === null) {
    return {
      status: 'fallback',
      reason: 'cannot_verify',
      message: 'Fleet could not check whether the session still runs, so it did not resume it. Run the command only if you know the session is closed.',
      command: commandOrNull!,
    }
  }

  if (herdr === 'missing' || !found?.defaultClient) {
    return { status: 'fallback', reason: 'herdr_down', message: 'herdr did not answer. Run this command in a terminal.', command: commandOrNull! }
  }

  try {
    await startInWorkspace(found.defaultClient, ship, cwd, ['claude', '--resume', sessionId])
    await deps.openGhostty()
  } catch (error) {
    return { status: 'error', message: `Could not resume in herdr: ${message(error)}` }
  }

  return { status: 'resumed', message: `Resumed the session in the "${ship.fleetName}" workspace.` }
}

async function liveSessions(): Promise<LiveSession[] | null> {
  try {
    const { stdout } = await run('claude', ['agents', '--json'], { timeout: 10000, maxBuffer: 16 * 1024 * 1024 })
    const list = JSON.parse(stdout)

    return Array.isArray(list) ? list : null
  } catch {
    return null
  }
}

export function realJumpDeps(env = process.env): JumpDeps {
  return {
    schema: async () => JSON.parse((await run('herdr', ['api', 'schema', '--json'], { timeout: 10000, maxBuffer: 64 * 1024 * 1024 })).stdout),
    sockets: () => socketPaths(herdrDir(env)),
    connect: path => connectHerdr(path),
    liveSessions,
    openGhostty: async () => {
      await run('open', ['-a', 'Ghostty'], { timeout: 10000 })
    },
    isDir: path => {
      try {
        return statSync(path).isDirectory()
      } catch {
        return false
      }
    },
  }
}
