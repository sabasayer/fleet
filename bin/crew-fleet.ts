#!/usr/bin/env node
import { parseArgs } from 'node:util'

import { startServer } from '../src/server.ts'

const { values } = parseArgs({ options: { port: { type: 'string', default: '4932' } } })
const port = Number(values.port)
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`crew-fleet: bad port: ${values.port}`)
  process.exit(1)
}

const server = await startServer({ port })
console.log(`crew-fleet: http://127.0.0.1:${server.port}`)
