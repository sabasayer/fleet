import { existsSync, readdirSync } from 'node:fs'
import { createConnection } from 'node:net'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type HerdrClient = (method: string, params?: object) => Promise<any>

export class HerdrError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export const REQUIRED_METHODS = ['agent.list', 'agent.focus', 'agent.start', 'workspace.list', 'workspace.create', 'tab.list', 'tab.rename']
export const MIN_PROTOCOL = 16

export const herdrDir = (env = process.env) => env.HERDR_CONFIG_DIR || join(homedir(), '.config', 'herdr')

export type SocketRef = { path: string; isDefault: boolean }

export function socketPaths(dir: string, exists = existsSync, list = readdirSync): SocketRef[] {
  const paths = [{ path: join(dir, 'herdr.sock'), isDefault: true }]
  let sessions: string[] = []
  try {
    sessions = list(join(dir, 'sessions')) as string[]
  } catch {}
  for (const name of sessions.sort()) paths.push({ path: join(dir, 'sessions', name, 'herdr.sock'), isDefault: false })

  return paths.filter(ref => exists(ref.path))
}

export function connectHerdr(path: string, timeoutMs = 3000): HerdrClient {
  let counter = 0

  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = `fleet_${++counter}`
      const socket = createConnection(path)
      let buffer = ''
      const finish = (fn: () => void) => {
        clearTimeout(timer)
        socket.destroy()
        fn()
      }
      const timer = setTimeout(() => finish(() => reject(new HerdrError('timeout', `herdr did not answer ${method}`))), timeoutMs)

      socket.setEncoding('utf8')
      socket.on('connect', () => socket.write(`${JSON.stringify({ id, method, params })}\n`))
      socket.on('error', error => finish(() => reject(new HerdrError('unreachable', error.message))))
      socket.on('close', () => finish(() => reject(new HerdrError('closed', 'herdr closed the socket'))))
      socket.on('data', chunk => {
        buffer += chunk
        let newline = buffer.indexOf('\n')
        while (newline >= 0) {
          const line = buffer.slice(0, newline)
          buffer = buffer.slice(newline + 1)
          newline = buffer.indexOf('\n')
          let message: any
          try {
            message = JSON.parse(line)
          } catch {
            continue
          }
          if (message.id !== id) continue
          if (message.error) return finish(() => reject(new HerdrError(String(message.error.code), String(message.error.message))))
          return finish(() => resolve(message.result))
        }
      })
    })
}

export function checkSchema(schema: any): { ok: true } | { ok: false; message: string } {
  const protocol = schema?.protocol
  const methods = new Set<string>(
    (schema?.schemas?.request?.oneOf ?? []).map((entry: any) => entry?.properties?.method?.const).filter(Boolean),
  )
  const missing = REQUIRED_METHODS.filter(method => !methods.has(method))
  if (typeof protocol !== 'number' || protocol < MIN_PROTOCOL) {
    return { ok: false, message: `herdr protocol ${protocol ?? 'unknown'} is not supported. Fleet needs protocol ${MIN_PROTOCOL} or newer.` }
  }
  if (missing.length > 0) return { ok: false, message: `herdr does not offer these methods: ${missing.join(', ')}.` }

  return { ok: true }
}
