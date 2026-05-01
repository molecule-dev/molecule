/**
 * FFmpeg invocation seam.
 *
 * The worker shells out to `ffmpeg` via {@link FfmpegRunner}. The default
 * runner uses `node:child_process.spawn` directly with an argv array
 * (NEVER a shell string) — filenames and parameters are passed as discrete
 * arguments so they cannot be interpreted as shell metacharacters.
 *
 * Tests inject a fake runner via {@link setFfmpegRunner} and assert against
 * the captured argv + lifecycle hooks.
 *
 * @module
 */

import { spawn } from 'node:child_process'

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

/**
 * Default runner — spawns the system `ffmpeg` binary directly, passing each
 * argv element as a discrete argument (no shell interpretation).
 *
 * @param args - The argv to pass after the binary name.
 * @returns The spawned {@link FfmpegProcess}.
 */
export const defaultFfmpegRunner: FfmpegRunner = (args) => {
  // Critical: { shell: false } (the default) — never pass user-controlled
  // strings through a shell. Each argv element is a discrete argument.
  return spawn('ffmpeg', [...args], { shell: false }) as unknown as FfmpegProcess
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
