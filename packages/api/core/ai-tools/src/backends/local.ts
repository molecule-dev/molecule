/**
 * Local filesystem execution backend — wraps fs/promises + child_process.
 * Used by the polish pipeline and any CLI-based agent tools.
 *
 * @module
 */

import { readFile, writeFile, unlink, readdir, mkdir } from 'fs/promises'
import { execFile } from 'child_process'
import { dirname } from 'path'

import type { ExecutionBackend } from '../types.js'

/**
 * Create an ExecutionBackend that operates on the local filesystem.
 *
 * @param projectRoot - Absolute path to the project root directory
 */
export function createLocalBackend(projectRoot: string): ExecutionBackend {
  return {
    projectRoot,

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
      return entries.map(e => ({
        name: e.name,
        type: (e.isDirectory() ? 'directory' : 'file') as 'file' | 'directory',
      }))
    },

    run(command: string, opts?: { cwd?: string; timeout?: number }) {
      return new Promise((resolve) => {
        // Use shell: true for command strings (grep pipelines, find, etc.)
        // Input is sanitized via shellQuote at the tool level
        execFile('sh', ['-c', command], {
          cwd: opts?.cwd || projectRoot,
          timeout: opts?.timeout || 30000,
          maxBuffer: 10 * 1024 * 1024,
          encoding: 'utf8',
        }, (error, stdout, stderr) => {
          if (error && 'code' in error && typeof error.code === 'number') {
            resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: error.code })
          } else if (error) {
            resolve({ stdout: stdout || '', stderr: stderr || error.message, exitCode: 1 })
          } else {
            resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: 0 })
          }
        })
      })
    },
  }
}
