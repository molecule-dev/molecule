/**
 * Internal git-invocation helpers.
 *
 * NOT part of the public surface (deliberately absent from the barrel). Every
 * git call in this package goes through one of these two helpers so that the
 * "non-zero exit is an error" and "non-zero exit is an answer" cases are always
 * an explicit choice at the call site rather than an accident.
 *
 * BOTH PIN THE CONFIGURATION (see {@link HERMETIC_CONFIG}). The pinning lives
 * here, in the one place every command passes through, rather than at the call
 * sites: "did this particular command remember to pin `status.showUntrackedFiles`"
 * is exactly the question that must never have to be asked, because the one
 * command that forgot is the one that reports a workspace as clean while a
 * directory of new work is invisible to it.
 *
 * @module
 */

import { pinConfig, unpinConfig } from './hermetic.js'
import type { GitExec, GitExecResult } from './types.js'

/**
 * Renders an argv array for an ERROR MESSAGE only.
 *
 * Never used to build a command — commands are always argv arrays handed to the
 * injected {@link GitExec}, so this rendering cannot affect execution.
 *
 * @param args - The argv that was passed to git.
 * @returns A human-readable, single-line rendering of `git <args>`.
 */
const renderCommand = (args: readonly string[]): string =>
  `git ${unpinConfig(args)
    .map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg))
    .join(' ')}`

/**
 * Builds the error thrown when a git command fails unexpectedly.
 *
 * Carries git's message IN FULL, not just its first line. Git puts the diagnosis
 * on line one and the FIX on the lines after it — "detected dubious ownership in
 * repository at '/workspace'" is line one; "To add an exception for this
 * directory, call: git config --global --add safe.directory /workspace" is lines
 * two and three. This error text is what a caller shows an operator who has to
 * decide whether a workspace is safe to delete, so it keeps the remediation.
 * Lines are joined with spaces to keep it a single log line.
 *
 * @param args - The argv that was passed to git.
 * @param result - The failed result.
 * @param cwd - Directory the command ran in, when one was set.
 * @returns An `Error` naming the command, the directory, the exit code, and git's
 *   complete stderr (falling back to stdout).
 */
export const gitError = (args: readonly string[], result: GitExecResult, cwd?: string): Error => {
  const where = cwd ? ` in ${cwd}` : ''
  const detail =
    (result.stderr.trim() || result.stdout.trim() || '(no output)')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .join(' ') || '(no output)'

  return new Error(`${renderCommand(args)} failed${where} (exit ${result.exitCode}): ${detail}`)
}

/**
 * Runs a git command ON PINNED CONFIGURATION and THROWS a descriptive error on a
 * non-zero exit.
 *
 * Use this for commands whose failure means something is genuinely wrong; never
 * swallow the result.
 *
 * @param exec - The injected git executor.
 * @param args - Argv passed to git, excluding the program name.
 *   {@link HERMETIC_CONFIG} is prepended, so a caller's own `-c` overrides (a
 *   filter neutralisation, an identity) still win — they come later.
 * @param cwd - Directory to run the command in.
 * @returns The successful result.
 * @throws {Error} When git exits non-zero.
 */
export const runGit = async (
  exec: GitExec,
  args: readonly string[],
  cwd?: string,
): Promise<GitExecResult> => {
  const result = await exec(pinConfig(args), cwd === undefined ? undefined : { cwd })

  if (result.exitCode !== 0) {
    throw gitError(args, result, cwd)
  }

  return result
}

/**
 * Runs a git command ON PINNED CONFIGURATION and RETURNS the result even on a
 * non-zero exit.
 *
 * Use this only where git's exit status is itself the answer (no commits yet,
 * detached HEAD, nothing staged, invalid bundle) — the caller must interpret
 * `exitCode` explicitly.
 *
 * @param exec - The injected git executor.
 * @param args - Argv passed to git, excluding the program name.
 *   {@link HERMETIC_CONFIG} is prepended, so a caller's own `-c` overrides still
 *   win — they come later.
 * @param cwd - Directory to run the command in.
 * @returns The result, successful or not.
 */
export const runGitAllowFail = (
  exec: GitExec,
  args: readonly string[],
  cwd?: string,
): Promise<GitExecResult> => exec(pinConfig(args), cwd === undefined ? undefined : { cwd })
