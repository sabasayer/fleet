#!/usr/bin/env node
import { parseArgs } from 'node:util'

import { startServer } from '../src/server.ts'
import { startWatcher } from '../src/watch.ts'

const { values } = parseArgs({ options: { port: { type: 'string', default: '4932' } } })
const port = Number(values.port)
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`crew-fleet: bad port: ${values.port}`)
  process.exit(1)
}

const server = await startServer({ port, watcher: startWatcher() }).catch(error => {
  if (error?.code !== 'EADDRINUSE') throw error
  console.log(`crew-fleet: fleet already runs at http://127.0.0.1:${port}`)
  process.exit(0)
})
console.log(`crew-fleet: http://127.0.0.1:${server.port}`)
