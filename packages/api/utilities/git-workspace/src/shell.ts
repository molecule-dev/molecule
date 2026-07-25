/**
 * Internal: running a NON-git program through the injected {@link GitExec}.
 *
 * NOT part of the public surface (deliberately absent from the barrel).
 *
 * The package is handed exactly one capability — a git executor — and two checks
 * need a plain OS tool rather than git: the reconstruction gate's INDEPENDENT
 * filesystem enumeration (`find`, which must share no logic with `discoverRepos`,
 * or it would share its blind spots) and the containment check's path
 * canonicalisation (`readlink -f`, without which a symlink defeats it). Neither
 * can go through `node:fs`: a sandbox executor runs somewhere this process cannot
 * see, and the whole point of the second enumeration is that it observes the same
 * filesystem git does.
 *
 * Git's own escape hatch is used: an alias whose value begins with `!` is run as
 * a shell command. Measured (git 2.43): git builds `sh -c '<cmd> "$@"' <cmd>
 * <rest of argv…>`, so every argument this module passes stays a SEPARATE ARGV
 * ELEMENT — nothing is interpolated into the command string, and a path
 * containing a space, a quote, a newline, or a leading dash cannot break out. The
 * alias is supplied with `-c`, so nothing is written to any config file.
 *
 * @module
 */

import { pinConfig } from './hermetic.js'
import type { GitExec, GitExecResult } from './types.js'

/**
 * Alias name used to reach a non-git program. Namespaced so it cannot collide
 * with a user's own alias, and it never shadows a git command.
 */
const SHELL_ALIAS = 'molecule-archiver-shell'

/**
 * Runs a non-git program through the injected git executor.
 *
 * PASS ABSOLUTE PATHS. Measured: when git runs a `!` alias from inside a
 * repository it first chdirs to that repository's TOP LEVEL, so a relative path
 * would be resolved against a directory the caller did not choose. Absolute
 * paths make the working directory irrelevant.
 *
 * Failure is a normal answer here, not an exception: an environment without the
 * program (or without a shell) exits 128 with git's `while expanding alias`
 * message, and every caller in this package treats that as "unknown", which is
 * always its fail-closed direction.
 *
 * @param exec - The injected git executor.
 * @param program - Program name, e.g. `find`. Interpolated into the alias VALUE,
 *   so it must be a fixed literal chosen by this package — never caller data.
 * @param args - Argv for the program, passed through as separate elements.
 * @returns The program's stdout, stderr, and exit code.
 */
export const runProgram = async (
  exec: GitExec,
  program: string,
  args: readonly string[],
): Promise<GitExecResult> =>
  // The alias is supplied on the COMMAND LINE, which outranks any alias of the
  // same name in any config file, and the run goes through the same pinned
  // configuration as every other command in this package.
  exec(pinConfig(['-c', `alias.${SHELL_ALIAS}=!${program}`, SHELL_ALIAS, ...args]))

/**
 * Canonicalises a path — every symlink resolved, `.`/`..` removed — using the
 * OS's own resolver.
 *
 * `readlink -f` is tried first (GNU coreutils and BSD/macOS 12+), then
 * `realpath`. Both are asked with `--` so a path beginning with a dash is never
 * read as an option.
 *
 * @param exec - The injected git executor.
 * @param path - Absolute path to canonicalise.
 * @returns The real path, or null when it could not be determined — the caller
 *   MUST treat null as "unknown" and fail closed, never as "unchanged".
 */
export const realPath = async (exec: GitExec, path: string): Promise<string | null> => {
  for (const attempt of [
    { program: 'readlink', args: ['-f', '--', path] },
    { program: 'realpath', args: ['--', path] },
  ]) {
    const result = await runProgram(exec, attempt.program, attempt.args)

    // Strip exactly the terminating newline: a path may legitimately end with a
    // space, and trimming would silently name a different file.
    const resolved = result.stdout.replace(/\r?\n$/, '')

    if (result.exitCode === 0 && resolved !== '') {
      return resolved
    }
  }

  return null
}
