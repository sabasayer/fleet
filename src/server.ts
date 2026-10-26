import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server } from 'node:http'

import { applyAction, isAction, isShipName, readStored, writeStored } from './life.ts'
import { page } from './page.ts'
import { fleetHome, readState } from './state.ts'

const HOST = '127.0.0.1'
const WEB = new URL('../web/', import.meta.url)
const MAX_BODY = 4096

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > MAX_BODY) reject(new Error('too large'))
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })

export type Running = { port: number; token: string; close: () => Promise<void> }

export async function startServer({ port, env = process.env }: { port: number; env?: NodeJS.ProcessEnv }): Promise<Running> {
  const token = randomBytes(24).toString('hex')
  let own = new Set<string>()

  const sameOrigin = (req: IncomingMessage) => {
    const origin = req.headers.origin
    const host = req.headers.host

    return own.has(host ?? '') && (origin === undefined || origin === `http://${host}`)
  }

  const validToken = (req: IncomingMessage) => {
    const sent = Buffer.from(String(req.headers['x-fleet-token'] ?? ''))
    const want = Buffer.from(token)

    return sent.length === want.length && timingSafeEqual(sent, want)
  }

  const shipAction = (body: string, send: (status: number, type: string, body: string) => void) => {
    let input: any
    try {
      input = JSON.parse(body)
    } catch {
      return send(400, 'text/plain', 'bad json')
    }
    if (!isShipName(input?.ship) || !isAction(input?.action)) return send(400, 'text/plain', 'bad ship or action')
    const ship = readState(env).fleets.flatMap(f => f.ships).find(s => s.ship === input.ship)
    if (!ship) return send(404, 'text/plain', 'unknown ship')
    const home = fleetHome(env)
    try {
      writeStored(home, ship.ship, applyAction(ship.mrs, readStored(home, ship.ship), input.action, new Date().toISOString()))
    } catch (error) {
      return send(409, 'text/plain', (error as Error).message)
    }
    const life = readState(env).fleets.flatMap(f => f.ships).find(s => s.ship === ship.ship)?.life

    send(200, 'application/json', JSON.stringify({ ok: true, life }))
  }

  const server: Server = createServer((req, res) => {
    const send = (status: number, type: string, body: string) => {
      res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
      res.end(body)
    }
    const url = new URL(req.url ?? '/', `http://${HOST}`)

    if (!sameOrigin(req)) return send(403, 'text/plain', 'forbidden')

    if (req.method === 'GET' && url.pathname === '/') return send(200, 'text/html; charset=utf-8', page(token))
    const asset = req.method === 'GET' ? /^\/web\/([a-z]+\.js)$/.exec(url.pathname)?.[1] : undefined
    if (asset) {
      try {
        return send(200, 'text/javascript; charset=utf-8', readFileSync(new URL(asset, WEB), 'utf8'))
      } catch {
        return send(404, 'text/plain', 'not found')
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/state') return send(200, 'application/json', JSON.stringify(readState(env)))
    if (req.method === 'POST') {
      if (!validToken(req)) return send(403, 'text/plain', 'forbidden')
      if (url.pathname === '/api/ping') return send(200, 'application/json', '{"ok":true}')
      if (url.pathname === '/api/ship') {
        readBody(req).then(
          body => shipAction(body, send),
          () => send(400, 'text/plain', 'bad request'),
        )

        return
      }
    }
    send(404, 'text/plain', 'not found')
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, HOST, resolve)
  })
  const actual = (server.address() as { port: number }).port
  own = new Set([`${HOST}:${actual}`, `localhost:${actual}`])

  return { port: actual, token, close: () => new Promise(resolve => (server.close(() => resolve()), server.closeAllConnections())) }
}
