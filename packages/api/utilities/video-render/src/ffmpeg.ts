/**
 * FFmpeg invocation seam.
 *
 * The worker shells out to `ffmpeg` via {@link FfmpegRunner}. The default
 * runner uses `node:child_process.spawn` directly with an argv array
 * (NEVER a shell string) — filenames and parameters are passed as discrete
 * arguments so they cannot be interpreted as shell metacharacters.
 *
 * The ffmpeg binary is configurable: {@link getFfmpegBinaryPath} resolves an
 * explicit override ({@link setFfmpegBinaryPath}) first, then the `FFMPEG_PATH`
 * environment variable, then the literal `'ffmpeg'` (resolved on `$PATH`). When
 * the binary can't be spawned (`ENOENT`), {@link toActionableSpawnError} rewrites
 * the opaque `spawn ffmpeg ENOENT` into an actionable message that names the path
 * and the fix, so a missing binary fails loudly instead of cryptically.
 *
 * Tests inject a fake runner via {@link setFfmpegRunner} and assert against
 * the captured argv + lifecycle hooks.
 *
 * @module
 */

import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'

/**
 * Subset of `child_process.ChildProcess`'s `stderr` we care about — enough
 * to listen for the textual progress lines ffmpeg writes to stderr.
 */
export interface FfmpegStderr {
  on(event: 'data', listener: (chunk: Buffer | string) => void): void
}

/**
 * The minimal child-process surface the worker observes. Real
 * `ChildProcess`es satisfy this; tests provide a `EventEmitter`-shaped fake.
 */
export interface FfmpegProcess {
  stderr: FfmpegStderr | null
  on(event: 'close', listener: (code: number | null) => void): void
  on(event: 'error', listener: (error: Error) => void): void
  /** Sends SIGTERM (or another signal) to the child. */
  kill(signal?: NodeJS.Signals | number): boolean
}

/**
 * Function that spawns ffmpeg with a fully-formed argv. The first element of
 * `args` is NOT the ffmpeg binary — implementations supply that themselves.
 *
 * Implementations MUST NOT pass `args` through a shell.
 */
export type FfmpegRunner = (args: readonly string[]) => FfmpegProcess

/** Explicit override for the ffmpeg binary path, set via {@link setFfmpegBinaryPath}. */
let configuredBinaryPath: string | undefined

/**
 * Set (or clear) an explicit path to the ffmpeg binary used by
 * {@link defaultFfmpegRunner}. Takes precedence over the `FFMPEG_PATH`
 * environment variable. Pass `undefined` to clear the override and fall back
 * to `FFMPEG_PATH` / `'ffmpeg'` again.
 *
 * @param path - Absolute path to the ffmpeg binary, or `undefined` to reset.
 */
export function setFfmpegBinaryPath(path: string | undefined): void {
  configuredBinaryPath = path
}

/**
 * Resolve the ffmpeg binary path the default runner will spawn. Precedence:
 * explicit override ({@link setFfmpegBinaryPath}) → `FFMPEG_PATH` env var →
 * `'ffmpeg'` (resolved on `$PATH`).
 *
 * @returns The ffmpeg binary path/name to spawn.
 */
export function getFfmpegBinaryPath(): string {
  if (configuredBinaryPath !== undefined && configuredBinaryPath.length > 0) {
    return configuredBinaryPath
  }
  const fromEnv = process.env['FFMPEG_PATH']
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return fromEnv
  }
  return 'ffmpeg'
}

/**
 * Translate a spawn failure into an actionable {@link Error}. A raw
 * `spawn ffmpeg ENOENT` says nothing about the fix; this rewrites it to name
 * the resolved binary path and how to point at a real one. Non-`ENOENT`
 * errors are returned unchanged.
 *
 * @param error - The error thrown/emitted by `child_process.spawn`.
 * @param binaryPath - The binary path that failed to spawn.
 * @returns An {@link Error} with an actionable message (ENOENT) or the original.
 */
export function toActionableSpawnError(error: unknown, binaryPath: string): Error {
  const err = error instanceof Error ? error : new Error(String(error))
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    return new Error(
      `ffmpeg not found at '${binaryPath}'. Install ffmpeg (e.g. \`apt-get install -y ffmpeg\`) ` +
        `or set the FFMPEG_PATH environment variable to its absolute path.`,
      { cause: err },
    )
  }
  return err
}

/**
 * Wrap a spawned child so that an asynchronously-emitted `ENOENT` spawn
 * error reaches listeners as an actionable message (see
 * {@link toActionableSpawnError}) rather than a raw `spawn ffmpeg ENOENT`.
 * `close` events + `stderr` + `kill` pass through unchanged.
 *
 * Forwarding through a fresh {@link EventEmitter} keeps the wrapper's `on`
 * type-compatible with the {@link FfmpegProcess} overloads without casts, and
 * guarantees the child always has an `error` listener (so a spawn failure is
 * never an unhandled `error` that crashes the process).
 */
function wrapFfmpegProcess(
  child: ChildProcessWithoutNullStreams,
  binaryPath: string,
): FfmpegProcess {
  const emitter = new EventEmitter()
  child.on('close', (code: number | null) => emitter.emit('close', code))
  child.on('error', (error: Error) =>
    emitter.emit('error', toActionableSpawnError(error, binaryPath)),
  )
  return {
    stderr: child.stderr,
    on: emitter.on.bind(emitter),
    kill: (signal?: NodeJS.Signals | number): boolean => child.kill(signal),
  }
}

/**
 * Default runner — spawns the configured `ffmpeg` binary directly
 * ({@link getFfmpegBinaryPath}), passing each argv element as a discrete
 * argument (no shell interpretation). A missing binary surfaces as an
 * actionable error via {@link toActionableSpawnError} — both when `spawn`
 * throws synchronously and when the child emits `error` asynchronously.
 *
 * @param args - The argv to pass after the binary name.
 * @returns The spawned {@link FfmpegProcess}.
 */
export const defaultFfmpegRunner: FfmpegRunner = (args) => {
  const binaryPath = getFfmpegBinaryPath()
  let child: ChildProcessWithoutNullStreams
  try {
    // Critical: { shell: false } (the default) — never pass user-controlled
    // strings through a shell. Each argv element is a discrete argument.
    child = spawn(binaryPath, [...args], { shell: false })
  } catch (error) {
    // spawn can throw synchronously (e.g. EACCES); translate before it bubbles.
    throw toActionableSpawnError(error, binaryPath)
  }
  return wrapFfmpegProcess(child, binaryPath)
}

let activeRunner: FfmpegRunner = defaultFfmpegRunner

/**
 * Returns the active ffmpeg runner — the default `child_process.spawn`-based
 * runner unless overridden by {@link setFfmpegRunner}.
 *
 * @returns The active {@link FfmpegRunner}.
 */
export function getFfmpegRunner(): FfmpegRunner {
  return activeRunner
}

/**
 * Replace the active ffmpeg runner. Tests pass a stub; production code
 * generally leaves this as the default. Pass `undefined` to reset.
 *
 * @param runner - The runner to use, or `undefined` to reset.
 */
export function setFfmpegRunner(runner: FfmpegRunner | undefined): void {
  activeRunner = runner ?? defaultFfmpegRunner
}

/**
 * ffmpeg reports progress as `time=HH:MM:SS.SS` lines on stderr. Parse and
 * convert to seconds. Returns `undefined` when no progress line is present
 * in the chunk.
 *
 * @param chunk - A chunk of stderr text.
 * @returns The current decoded position in seconds, if found.
 */
export function parseFfmpegProgressSeconds(chunk: string): number | undefined {
  // Match the LAST `time=` token in the chunk — ffmpeg streams updates so
  // a single chunk may contain multiple lines. We want the most recent.
  const matches = [...chunk.matchAll(/time=(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/g)]
  if (matches.length === 0) return undefined
  const last = matches[matches.length - 1]!
  const hours = Number(last[1])
  const minutes = Number(last[2])
  const seconds = Number(last[3])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return undefined
  }
  return hours * 3600 + minutes * 60 + seconds
}
