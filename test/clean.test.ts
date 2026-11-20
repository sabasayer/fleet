import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { cleanWorktree, realCleanDeps, type CleanDeps } from '../src/clean.ts'

const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString().trim()

function repoWithWorktree() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fleet-clean-')))
  const main = join(root, 'main')
  execFileSync('git', ['init', '-q', '-b', 'main', main])
  git(main, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'first')
  const worktree = join(root, 'wt')
  git(main, 'worktree', 'add', '-q', '-b', 'eng-1-fix', worktree)

  return { main, worktree }
}

const idle = (over: Partial<CleanDeps> = {}): CleanDeps => ({ ...realCleanDeps, busyFolders: async () => [], ...over })

test('removes a clean worktree on the MR branch and keeps the branch', async () => {
  const { main, worktree } = repoWithWorktree()
  assert.deepEqual(await cleanWorktree(worktree, 'eng-1-fix', true, idle()), { status: 'removed' })
  assert.equal(existsSync(worktree), false)
  assert.equal(git(main, 'branch', '--list', 'eng-1-fix'), 'eng-1-fix')
})

test('a dry run reports the removal and changes nothing', async () => {
  const { worktree } = repoWithWorktree()
  assert.deepEqual(await cleanWorktree(worktree, 'eng-1-fix', false, idle()), { status: 'would_remove' })
  assert.equal(existsSync(worktree), true)
})

test('never removes a main checkout', async () => {
  const { main } = repoWithWorktree()
  const result = await cleanWorktree(main, 'main', true, idle())
  assert.deepEqual(result, { status: 'kept', reason: 'main checkout' })
  assert.equal(existsSync(main), true)
})

test('keeps a worktree with uncommitted or untracked files', async () => {
  const { worktree } = repoWithWorktree()
  writeFileSync(join(worktree, 'notes.txt'), 'wip')
  assert.deepEqual(await cleanWorktree(worktree, 'eng-1-fix', true, idle()), { status: 'kept', reason: 'uncommitted changes' })
  assert.equal(existsSync(worktree), true)
})

test('keeps a worktree that is on another branch now', async () => {
  const { worktree } = repoWithWorktree()
  git(worktree, 'switch', '-q', '-c', 'other')
  assert.deepEqual(await cleanWorktree(worktree, 'eng-1-fix', true, idle()), { status: 'kept', reason: 'on branch other, not eng-1-fix' })
})

test('keeps a worktree that a process still runs in', async () => {
  const { worktree } = repoWithWorktree()
  const busy = idle({ busyFolders: async () => [join(worktree, 'server')] })
  assert.deepEqual(await cleanWorktree(worktree, 'eng-1-fix', true, busy), { status: 'kept', reason: 'a process runs in it' })
  const neighbour = idle({ busyFolders: async () => [`${worktree}-2`] })
  assert.deepEqual(await cleanWorktree(worktree, 'eng-1-fix', true, neighbour), { status: 'removed' })
})

test('a missing folder is gone, and a folder outside git is kept', async () => {
  assert.deepEqual(await cleanWorktree('/no/such/folder', 'b', true, idle()), { status: 'gone' })
  const plain = mkdtempSync(join(tmpdir(), 'fleet-plain-'))
  assert.equal((await cleanWorktree(plain, 'b', true, idle())).status, 'kept')
  assert.equal(existsSync(plain), true)
})

test('a plain folder inside a checkout is not a worktree', async () => {
  const { main } = repoWithWorktree()
  const inner = join(main, '.claude', 'worktrees', 'old')
  mkdirSync(inner, { recursive: true })
  assert.deepEqual(await cleanWorktree(inner, 'main', true, idle()), { status: 'kept', reason: 'not the root of a worktree' })
  assert.equal(existsSync(inner), true)
})
