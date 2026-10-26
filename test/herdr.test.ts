import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'

import { checkSchema, connectHerdr, socketPaths } from '../src/herdr.ts'

const tmp = mkdtempSync(join(tmpdir(), 'fleet-herdr-'))
const servers: Server[] = []

function fake(name: string, onLine: (request: any, reply: (message: object) => void) => void) {
  const path = join(tmp, `${name}.sock`)
  const server = createServer(socket => {
    let buffer = ''
    socket.on('data', chunk => {
      buffer += chunk
      for (let i = buffer.indexOf('\n'); i >= 0; i = buffer.indexOf('\n')) {
        const line = buffer.slice(0, i)
        buffer = buffer.slice(i + 1)
        onLine(JSON.parse(line), message => socket.write(`${JSON.stringify(message)}\n`))
      }
    })
  })
  servers.push(server)

  return new Promise<string>(resolve => server.listen(path, () => resolve(path)))
}

after(() => servers.forEach(server => server.close()))

test('sends one JSON line and resolves with the result of the matching id', async () => {
  const path = await fake('ok', (request, reply) => {
    reply({ id: 'other', result: { type: 'wrong' } })
    reply({ id: request.id, result: { type: 'agent_list', agents: [], echo: [request.method, request.params] } })
  })
  const result = await connectHerdr(path)('agent.list', { a: 1 })
  assert.deepEqual(result.echo, ['agent.list', { a: 1 }])
})

test('rejects with the herdr error code', async () => {
  const path = await fake('err', (request, reply) => reply({ id: request.id, error: { code: 'agent_not_found', message: 'nope' } }))
  await assert.rejects(connectHerdr(path)('agent.focus', { target: 'x' }), { code: 'agent_not_found', message: 'nope' })
})

test('rejects when the socket does not exist', async () => {
  await assert.rejects(connectHerdr(join(tmp, 'missing.sock'))('ping'), { code: 'unreachable' })
})

test('rejects when herdr stays silent', async () => {
  const path = await fake('silent', () => {})
  await assert.rejects(connectHerdr(path, 50)('ping'), { code: 'timeout' })
})

test('lists the default socket first, then named sessions, only if they exist', () => {
  const dir = join(tmp, 'config')
  mkdirSync(join(dir, 'sessions', 'b'), { recursive: true })
  mkdirSync(join(dir, 'sessions', 'a'), { recursive: true })
  mkdirSync(join(dir, 'sessions', 'dead'), { recursive: true })
  for (const path of ['herdr.sock', 'sessions/a/herdr.sock', 'sessions/b/herdr.sock']) writeFileSync(join(dir, path), '')
  assert.deepEqual(
    socketPaths(dir).map(ref => [ref.path.slice(dir.length + 1), ref.isDefault]),
    [['herdr.sock', true], ['sessions/a/herdr.sock', false], ['sessions/b/herdr.sock', false]],
  )
})

const schema = (protocol: number, methods: string[]) => ({
  protocol,
  schemas: { request: { oneOf: methods.map(method => ({ properties: { method: { const: method } } })) } },
})
const all = ['agent.list', 'agent.focus', 'agent.start', 'workspace.list', 'workspace.create', 'tab.list', 'tab.rename']

test('schema check accepts a supported version', () => {
  assert.deepEqual(checkSchema(schema(16, all)), { ok: true })
})

test('schema check names the problem for an old protocol or a missing method', () => {
  assert.match((checkSchema(schema(15, all)) as any).message, /protocol 15/)
  assert.match((checkSchema(schema(16, all.slice(1))) as any).message, /agent\.list/)
  assert.equal(checkSchema(null).ok, false)
})
