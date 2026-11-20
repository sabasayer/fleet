import { execFile } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { promisify } from 'node:util'

const run = promisify(execFile)

export type CleanResult = { status: 'removed' } | { status: 'would_remove' } | { status: 'gone' } | { status: 'kept'; reason: string }
export type CleanDeps = {
  git: (cwd: string, args: string[]) => Promise<string>
  busyFolders: () => Promise<string[]>
  remove: (commonDir: string, worktree: string) => Promise<void>
}

export const realCleanDeps: CleanDeps = {
  git: async (cwd, args) => (await run('git', ['-C', cwd, ...args], { timeout: 30000 })).stdout.trim(),
  // No time limit: deleting a large node_modules takes minutes, and a killed remove leaves a half-deleted folder.
  remove: async (commonDir, worktree) => void (await run('git', ['-C', commonDir, 'worktree', 'remove', worktree], { maxBuffer: 16 * 1024 * 1024 })),
  busyFolders: async () => {
    try {
      const { stdout } = await run('lsof', ['-a', '-d', 'cwd', '-Fn'], { timeout: 20000, maxBuffer: 16 * 1024 * 1024 })
      return stdout.split('\n').filter(line => line.startsWith('n')).map(line => line.slice(1))
    } catch (error: any) {
      // lsof exits 1 when it cannot read some processes, but still prints the rest.
      if (typeof error?.stdout === 'string' && error.stdout) return error.stdout.split('\n').filter((line: string) => line.startsWith('n')).map((line: string) => line.slice(1))
      throw error
    }
  },
}

const message = (error: unknown) => (error instanceof Error ? error.message.split('\n')[0] : String(error))

// Removes only the folder. The branch stays, so no commit is lost.
export async function cleanWorktree(folder: string, branch: string, apply: boolean, deps: CleanDeps = realCleanDeps): Promise<CleanResult> {
  if (!existsSync(folder)) return { status: 'gone' }
  const worktree = realpathSync(folder)
  try {
    const gitDir = await deps.git(worktree, ['rev-parse', '--path-format=absolute', '--git-dir'])
    const commonDir = await deps.git(worktree, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
    if (realpathSync(await deps.git(worktree, ['rev-parse', '--show-toplevel'])) !== worktree) return { status: 'kept', reason: 'not the root of a worktree' }
    if (gitDir === commonDir) return { status: 'kept', reason: 'main checkout' }
    const current = await deps.git(worktree, ['branch', '--show-current'])
    if (current !== branch) return { status: 'kept', reason: `on branch ${current || '(detached)'}, not ${branch}` }
    if (await deps.git(worktree, ['status', '--porcelain'])) return { status: 'kept', reason: 'uncommitted changes' }
    if ((await deps.busyFolders()).some(path => path === worktree || path.startsWith(`${worktree}/`))) return { status: 'kept', reason: 'a process runs in it' }
    if (!apply) return { status: 'would_remove' }
    await deps.remove(commonDir, worktree)
  } catch (error) {
    return { status: 'kept', reason: message(error) }
  }

  return { status: 'removed' }
}
