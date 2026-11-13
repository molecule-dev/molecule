/**
 * Local filesystem execution backend — wraps fs/promises + child_process.
 * Used by the polish pipeline and any CLI-based agent tools.
 *
 * @module
 */

import { spawn } from 'child_process'
import { accessSync, constants } from 'fs'
import { mkdir, readdir, readFile, unlink, writeFile } from 'fs/promises'
import { delimiter, dirname, join } from 'path'

import type { ExecutionBackend } from '../types.js'

/**
 * The shell a command runs in: bash, as in a sandbox (its backend runs `bash -c`, and a background
 * command runs its script with `bash`), so a command's text means the same here as there and in
 * either mode. `sh` only where no bash is installed.
 */
const COMMAND_SHELL = (() => {
  for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
    try {
      accessSync(join(dir, 'bash'), constants.X_OK)
      return 'bash'
    } catch (_error) {
      // Not in this PATH entry; the next one may have it.
    }
  }
  return 'sh'
})()

/**
 * Create an ExecutionBackend that operates on the local filesystem.
 *
 * @param projectRoot - Absolute path to the project root directory
 * @returns A backend wired to `fs/promises` and guarded subprocess calls.
 */
export function createLocalBackend(projectRoot: string): ExecutionBackend {
  return {
    projectRoot,
    // Marks this backend as operating directly on the HOST filesystem —
    // buildTools() uses it to warn loudly when path/symlink guards are off.
    hostFs: true,

    async readFile(path: string) {
      return readFile(path, 'utf8')
    },

    async writeFile(path: string, content: string) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content, 'utf8')
    },

    async deleteFile(path: string) {
      await unlink(path)
    },

    async readDir(path: string) {
      const entries = await readdir(path, { withFileTypes: true })
      return entries.map((e) => ({
        name: e.name,
        type: (e.isDirectory() ? 'directory' : 'file') as 'file' | 'directory',
      }))
    },

    run(command: string, opts?: { cwd?: string; timeout?: number; budgetMs?: number }) {
      return new Promise((resolve) => {
        // A native runner owns children. execFile's timeout killed only sh,
        // leaving the runner/browser alive. Use the OS process group, with a
        // graceful signal followed by a bounded forceful cleanup of that group.
        const grouped = process.platform !== 'win32'
        const child = spawn(COMMAND_SHELL, ['-c', command], {
          cwd: opts?.cwd || projectRoot,
          detached: grouped,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        let stdout = '',
          stderr = '',
          closed = false,
          code = 1
        let stopped: 'timeout' | 'output' | undefined
        let force: ReturnType<typeof setTimeout> | undefined
        const finish = (): void => {
          if (closed && !force)
            resolve({ stdout, stderr, exitCode: stopped === 'timeout' ? 124 : stopped ? 1 : code })
        }
        const signal = (value: NodeJS.Signals): void => {
          try {
            if (grouped && child.pid) process.kill(-child.pid, value)
            else child.kill(value)
          } catch (_error) {
            /* the owned group already exited */
          }
        }
        const stop = (why: 'timeout' | 'output'): void => {
          if (stopped) return
          stopped = why
          signal('SIGTERM')
          force = setTimeout(() => {
            signal('SIGKILL')
            force = undefined
            finish()
          }, 1000)
        }
        const timeout = Math.min(opts?.timeout || 30_000, opts?.budgetMs || Infinity)
        const deadline = setTimeout(() => stop('timeout'), timeout)
        const collect = (text: string, channel: 'stdout' | 'stderr'): void => {
          if (stopped) return
          if (stdout.length + stderr.length + text.length > 10 * 1024 * 1024) {
            stderr += '\nCommand exceeded the 10 MB output limit.'
            stop('output')
            return
          }
          if (channel === 'stdout') stdout += text
          else stderr += text
        }
        child.stdout.setEncoding('utf8').on('data', (text: string) => collect(text, 'stdout'))
        child.stderr.setEncoding('utf8').on('data', (text: string) => collect(text, 'stderr'))
        child.on('error', (error) => {
          stderr += error.message
        })
        child.on('close', (exitCode) => {
          closed = true
          code = exitCode ?? 1
          clearTimeout(deadline)
          finish()
        })
      })
    },
  }
}
