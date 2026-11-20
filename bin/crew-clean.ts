#!/usr/bin/env node
import { parseArgs } from 'node:util'

import { cleanWorktree } from '../src/clean.ts'
import { readState } from '../src/state.ts'
import { PAST_REVIEW } from '../src/watch.ts'

const { values } = parseArgs({ options: { yes: { type: 'boolean', default: false } } })

const seen = new Set<string>()
for (const ship of readState(process.env).fleets.flatMap(fleet => fleet.ships)) {
  for (const [i, mr] of ship.mrs.entries()) {
    const state = ship.life.mrs[i].state
    if (!PAST_REVIEW.includes(state) || !mr.branch || seen.has(mr.worktree)) continue
    seen.add(mr.worktree)
    const result = await cleanWorktree(mr.worktree, mr.branch, values.yes)
    if (result.status === 'gone') continue
    console.log(`${result.status.padEnd(12)} ${ship.ship} (${state})  ${mr.worktree}${result.status === 'kept' ? `  - ${result.reason}` : ''}`)
  }
}
if (!values.yes) console.log('\nDry run. Run with --yes to remove the would_remove worktrees.')
