/**
 * Run a dump/restore tool with a file on one end.
 *
 * The only subtle part of this package, and the reason it is a module of its own:
 * **use `spawn`, never `execFile`.**
 *
 * `execFile` accumulates stdout in memory up to `maxBuffer` and SIGTERMs the child
 * past it — even when stdout is also piped to a file. The signal reaches the tool
 * (or a wrapper around it) which can exit **0**, so a TRUNCATED dump gets reported
 * as a complete one. Measured in this repo: a 2,275,439-byte dump landed as 20,480
 * bytes and passed a `pg_restore -l` check, because the custom-format table of
 * contents sits at the FRONT of the file and lists every table of a dump whose data
 * blocks were cut off.
 *
 * Hence the two rules here: `spawn` (which buffers nothing), and a signalled child
 * is a FAILURE regardless of exit code.
 *
 * @module
 */

import { spawn } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'

/** How long a dump or restore may run before it is killed. */
const TOOL_TIMEOUT_MS = 30 * 60_000

/** Max stderr kept for the error message. Diagnostics, never the payload. */
const MAX_STDERR = 8192

/**
 * Run `command`, streaming its stdout into `destPath`.
 *
 * @param command - The executable, e.g. `pg_dump`.
 * @param args - Arguments. Credentials belong in `env`, never here — argv is
 *   world-readable in the process list.
 * @param destPath - Absolute path the dump is written to.
 * @param env - Extra environment for the child (where credentials go).
 * @returns Bytes written.
 * @throws {Error} If the tool is missing, exits non-zero, is killed by a signal,
 *   or the file cannot be written. Never resolves on a partial dump.
 */
export async function dumpToFile(
  command: string,
  args: readonly string[],
  destPath: string,
  env: NodeJS.ProcessEnv = {},
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const out = createWriteStream(destPath)
    let written = 0
    let stderr = ''
    let settled = false

    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      reject(error)
    }

    const child = spawn(command, [...args], {
      timeout: TOOL_TIMEOUT_MS,
      killSignal: 'SIGKILL',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    })

    child.stdout.on('data', (chunk: Buffer) => {
      written += chunk.length
    })
    child.stdout.pipe(out)
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_STDERR) stderr += chunk.toString('utf8')
    })
    child.on('error', (error) =>
      fail(
        new Error(
          `could not run ${command}: ${error.message}. It must be installed and on PATH ` +
            `for this provider to capture anything.`,
          { cause: error },
        ),
      ),
    )
    out.on('error', (error) => fail(error))

    child.on('close', (code, signal) => {
      // Flush before reporting a byte count — a write error here means the file on
      // disk is not what the child produced.
      out.end(() => {
        if (settled) return
        // A signalled child is a failure even when the exit code says 0.
        if (signal) {
          return fail(
            new Error(
              `${command} was killed by ${signal} after ${written} bytes. The dump is ` +
                `TRUNCATED and must not be treated as complete.`,
            ),
          )
        }
        if (code !== 0) {
          return fail(new Error(`${command} exited ${code}: ${stderr.trim() || 'no output'}`))
        }
        if (written === 0) {
          return fail(
            new Error(`${command} produced 0 bytes — refusing to archive an empty dump.`),
          )
        }
        settled = true
        resolve(written)
      })
    })
  })
}

/**
 * Run `command`, streaming `srcPath` into its stdin.
 *
 * @param command - The executable, e.g. `psql`.
 * @param args - Arguments. Credentials belong in `env`.
 * @param srcPath - Absolute path of the dump to feed in.
 * @param env - Extra environment for the child.
 * @throws {Error} If the tool is missing, exits non-zero, or is killed by a signal.
 */
export async function restoreFromFile(
  command: string,
  args: readonly string[],
  srcPath: string,
  env: NodeJS.ProcessEnv = {},
): Promise<void> {
  return await new Promise<void>((resolve, reject) => {
    let stderr = ''
    let settled = false
    const fail = (error: Error): void => {
      if (settled) return
      settled = true
      reject(error)
    }

    const child = spawn(command, [...args], {
      timeout: TOOL_TIMEOUT_MS,
      killSignal: 'SIGKILL',
      stdio: ['pipe', 'ignore', 'pipe'],
      env: { ...process.env, ...env },
    })

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_STDERR) stderr += chunk.toString('utf8')
    })
    child.on('error', (error) =>
      fail(new Error(`could not run ${command}: ${error.message}`, { cause: error })),
    )

    const src = createReadStream(srcPath)
    src.on('error', (error) => fail(error))
    // EPIPE when the child dies early; the close handler reports the real reason.
    child.stdin.on('error', () => {})
    src.pipe(child.stdin)

    child.on('close', (code, signal) => {
      if (signal) return fail(new Error(`${command} was killed by ${signal} mid-restore.`))
      if (code !== 0) {
        return fail(new Error(`${command} exited ${code}: ${stderr.trim() || 'no output'}`))
      }
      settled = true
      resolve()
    })
  })
}
