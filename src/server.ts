import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server } from 'node:http'

import { realNewShipDeps, startNewShip, type NewShipDeps } from './newship.ts'
import { jump, realJumpDeps, type JumpDeps, type JumpResult } from './jump.ts'
import { applyAction, isAction, isShipName, readStored, writeStored } from './life.ts'
import { page } from './page.ts'
import { fleetHome, readState, turnedBackScout } from './state.ts'
import type { Watcher } from './watch.ts'

const HOST = '127.0.0.1'
const STARTING_TTL_MS = 30 * 60 * 1000

type Starting = { ship: string; fleet: string; sessionId: string; startedAt: number }

const safeDecode = (text: string) => {
  try {
    return decodeURIComponent(text)
  } catch {
    return ''
  }
}
const WEB = new URL('../web/', import.meta.url)
const MAX_BODY = 4096
const MAX_NEW_SHIP_BODY = 16384

const readBody = (req: IncomingMessage, max = MAX_BODY) =>
  new Promise<string>((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > max) reject(new Error('too large'))
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })

export type Running = { port: number; token: string; close: () => Promise<void> }

export async function startServer({ port, env = process.env, watcher, jumpDeps = realJumpDeps(env), newShipDeps = realNewShipDeps, clock = Date.now }: { port: number; env?: NodeJS.ProcessEnv; watcher?: Watcher; jumpDeps?: JumpDeps; newShipDeps?: NewShipDeps; clock?: () => number }): Promise<Running> {
  const token = randomBytes(24).toString('hex')
  let own = new Set<string>()
  const jumping = new Map<string, Promise<JumpResult>>()
  let starting: Starting[] = []

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

  const stateWithChecks = () => {
    const state = readState(env, clock())
    const seen = new Set(state.fleets.flatMap(f => f.ships.map(s => s.session?.id?.toLowerCase())))
    starting = starting.filter(e => state.now - e.startedAt < STARTING_TTL_MS && !seen.has(e.sessionId.toLowerCase()))
    const withStarting = { ...state, starting }
    if (!watcher) return withStarting
    for (const ship of state.fleets.flatMap(f => f.ships)) {
      const stateOf = (n: number) => ship.life.mrs.find(m => m.n === n)?.state
      ;(ship as any).checks = watcher.seen(ship.ship).filter(c => stateOf(c.n) === (c.kind === 'merge' ? 'in_review' : 'merged'))
    }

    return withStarting
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
      writeStored(home, ship.ship, applyAction(ship.mrs, readStored(home, ship.ship), input.action, new Date().toISOString(), turnedBackScout(ship)))
    } catch (error) {
      return send(409, 'text/plain', (error as Error).message)
    }
    if (input.action === 'mark_merged') void watcher?.backfill(ship.ship).catch(() => undefined)
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
    if (req.method === 'GET' && url.pathname === '/api/state') return send(200, 'application/json', JSON.stringify(stateWithChecks()))
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
      if (url.pathname === '/api/ships/new') {
        readBody(req, MAX_NEW_SHIP_BODY).then(
          body => {
            let input: unknown
            try {
              input = JSON.parse(body)
            } catch {
              return send(400, 'text/plain', 'bad json')
            }
            startNewShip(input, readState(env).fleets, jumpDeps, newShipDeps).then(
              result => {
                if (result.status === 'started') starting.push({ ship: result.ship, fleet: result.fleet, sessionId: result.sessionId, startedAt: clock() })
                send(200, 'application/json', JSON.stringify(result))
              },
              () => send(500, 'application/json', JSON.stringify({ status: 'error', message: 'start failed' })),
            )
          },
          () => send(400, 'text/plain', 'bad request'),
        )

        return
      }
      const target = /^\/api\/ships\/([^/]+)\/jump$/.exec(url.pathname)?.[1]
      if (target) {
        const name = safeDecode(target)
        const entry = readState(env).fleets.flatMap(fleet => fleet.ships.map(ship => ({ fleet, ship }))).find(e => e.ship.ship === name)
        if (!entry) return send(404, 'text/plain', 'not found')
        const running = jumping.get(name) ?? jump(
          { name, fleetName: entry.fleet.name, sessionId: entry.ship.session?.id ?? null, worktrees: entry.ship.mrs.map(mr => mr.worktree) },
          jumpDeps,
        )
        jumping.set(name, running)
        running.then(
          result => send(200, 'application/json', JSON.stringify(result)),
          () => send(500, 'application/json', JSON.stringify({ status: 'error', message: 'jump failed' })),
        ).finally(() => jumping.delete(name))
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
