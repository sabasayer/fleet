import { randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type Server } from 'node:http'

import { page } from './page.ts'
import { readState } from './state.ts'

const HOST = '127.0.0.1'

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

  const server: Server = createServer((req, res) => {
    const send = (status: number, type: string, body: string) => {
      res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
      res.end(body)
    }
    const url = new URL(req.url ?? '/', `http://${HOST}`)

    if (!sameOrigin(req)) return send(403, 'text/plain', 'forbidden')

    if (req.method === 'GET' && url.pathname === '/') return send(200, 'text/html; charset=utf-8', page(token))
    if (req.method === 'GET' && url.pathname === '/api/state') return send(200, 'application/json', JSON.stringify(readState(env)))
    if (req.method === 'POST') {
      if (!validToken(req)) return send(403, 'text/plain', 'forbidden')
      if (url.pathname === '/api/ping') return send(200, 'application/json', '{"ok":true}')
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
