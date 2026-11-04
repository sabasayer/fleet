import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { startServer } from '../src/server.ts'

const setup = () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fleet-token-'))

  return { home: join(tmp, 'home'), env: { CREW_BOARD_ROOT: join(tmp, 'crew'), CREW_FLEET_HOME: join(tmp, 'home') } }
}

test('two servers with the same fleet home share one token', async () => {
  const { env } = setup()
  const first = await startServer({ port: 0, env })
  await first.close()
  const second = await startServer({ port: 0, env })
  await second.close()
  assert.match(first.token, /^[0-9a-f]{48}$/)
  assert.equal(second.token, first.token)
})

test('the token file has mode 0600', async () => {
  const { env, home } = setup()
  const server = await startServer({ port: 0, env })
  await server.close()
  assert.equal(statSync(join(home, 'token')).mode & 0o777, 0o600)
  assert.equal(readFileSync(join(home, 'token'), 'utf8'), server.token)
})

test('a token file with looser mode is set to 0600 and kept', async () => {
  const { env, home } = setup()
  const first = await startServer({ port: 0, env })
  await first.close()
  chmodSync(join(home, 'token'), 0o644)
  const second = await startServer({ port: 0, env })
  await second.close()
  assert.equal(second.token, first.token)
  assert.equal(statSync(join(home, 'token')).mode & 0o777, 0o600)
})

test('a token file with bad content is replaced by a valid token', async () => {
  const { env, home } = setup()
  const first = await startServer({ port: 0, env })
  await first.close()
  writeFileSync(join(home, 'token'), 'not a token')
  const second = await startServer({ port: 0, env })
  await second.close()
  assert.match(second.token, /^[0-9a-f]{48}$/)
  assert.notEqual(second.token, 'not a token')
  assert.equal(readFileSync(join(home, 'token'), 'utf8'), second.token)
  assert.equal(statSync(join(home, 'token')).mode & 0o777, 0o600)
})
