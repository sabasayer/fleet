import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { startServer } from '../src/server.ts'

test('a second copy on a taken port says fleet already runs and exits 0', async () => {
  const home = mkdtempSync(join(tmpdir(), 'fleet-already-'))
  const first = await startServer({ port: 0, env: { ...process.env, CREW_BOARD_ROOT: home, CREW_FLEET_HOME: home } })
  try {
    const result = spawnSync(process.execPath, ['bin/crew-fleet.ts', '--port', String(first.port)], {
      encoding: 'utf8',
      env: { ...process.env, CREW_BOARD_ROOT: home, CREW_FLEET_HOME: home },
      timeout: 15000,
    })
    assert.equal(result.status, 0)
    assert.equal(result.stdout.trim(), `crew-fleet: fleet already runs at http://127.0.0.1:${first.port}`)
  } finally {
    await first.close()
  }
})
