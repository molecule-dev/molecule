/**
 * Internal: reading a working tree's status so that NOTHING can silence it.
 *
 * NOT part of the public surface (deliberately absent from the barrel).
 *
 * `git status --porcelain` is how this package finds the work no bundle carries,
 * and three different things could make it answer "clean" about a tree that is
 * not:
 *
 * 1. CONFIGURATION. `status.showUntrackedFiles=no` (an ordinary large-repo
 *    setting) and `core.excludesFile` both hide untracked files, from the
 *    checkpoint and from the gate alike. Pinned away by {@link HERMETIC_CONFIG},
 *    and `--untracked-files=all` is passed explicitly as well — a flag beats
 *    configuration, and saying it twice costs nothing.
 * 2. A BROKEN CONTENT FILTER. A required filter whose program is missing makes
 *    `git status` itself exit 128, and a status that did not run must never read
 *    as "clean". Retried with the repository's filters neutralised, exactly as
 *    {@link checkpointRepo} stages under them.
 * 3. `core.bare=true` ON A REPOSITORY THAT HAS A WORKING TREE, which makes
 *    status refuse to run at all. Handled by passing the observed
 *    {@link RepoLayout.workTree} fragments.
 *
 * Output is read NUL-delimited (`-z`), so a path containing a newline, a tab or
 * a quote is one exact record rather than something a line-splitter guesses at.
 *
 * @module
 */

import { configuredFilterDrivers, filterOverrides } from './filters.js'
import { runGitAllowFail } from './git.js'
import type { GitExec, GitExecResult } from './types.js'

/** A status that ran, with whatever had to be neutralised to make it run. */
export interface StatusReading {
  /**
   * One entry per changed, staged, unmerged or untracked path — `XY <path>`, or
   * `XY <path> <- <origin>` for a rename/copy, whose porcelain record carries a
   * second path.
   */
  entries: string[]
  /** `-c` fragments that neutralised the repo's content filters, or [] if none were needed. */
  overrides: string[]
  /** Names of the filter drivers those fragments neutralised, or [] if none were needed. */
  drivers: string[]
}

/** A status that could not be made to run at all. */
export interface StatusFailure {
  /** Argv (without pinned config) that failed. */
  args: string[]
  /** The first failure. */
  original: GitExecResult
  /** The failure after neutralising content filters, or null when there were none to neutralise. */
  retried: GitExecResult | null
  /** The filter drivers that were neutralised for the retry. */
  drivers: string[]
}

/**
 * Splits `git status --porcelain -z` output into one entry per path.
 *
 * A rename or copy record (`XY` beginning with `R` or `C`) is followed by a
 * SECOND NUL-terminated record holding the origin path; both belong to one
 * change, so they are joined rather than counted twice.
 *
 * @param stdout - Raw NUL-delimited stdout.
 * @returns One string per reported path.
 */
export const parsePorcelainZ = (stdout: string): string[] => {
  const records = stdout.split('\0')
  const entries: string[] = []

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index] as string

    if (record === '') {
      continue
    }

    const change = record.slice(0, 2)

    if ((change.startsWith('R') || change.startsWith('C')) && index + 1 < records.length) {
      entries.push(`${record} <- ${records[index + 1] as string}`)
      index += 1

      continue
    }

    entries.push(record)
  }

  return entries
}

/**
 * Reads a working tree's status, defeating every knob that could silence it.
 *
 * @param exec - The injected git executor.
 * @param repoDir - Absolute path of the repository.
 * @param workTree - {@link RepoLayout.workTree} fragments for this repository.
 * @returns The reading, or why status could not be made to run.
 */
export const readStatus = async (
  exec: GitExec,
  repoDir: string,
  workTree: readonly string[],
): Promise<{ status: StatusReading } | { failure: StatusFailure }> => {
  // SECURITY (host RCE): to detect a same-size edit to a TRACKED file, `git
  // status` re-reads its content, which EXECUTES the repository's `clean` filter
  // — an arbitrary command the repository configures (`filter.<name>.clean`).
  // This runs on the control-plane host against a copied working tree the repo's
  // owner controls, so the filters are neutralised UNCONDITIONALLY, before the
  // first status. Doing it only AFTER a failure (the previous behaviour) is no
  // defence against a MALICIOUS filter: it runs its payload and exits 0, so the
  // status "succeeds" and the reactive retry never fires — reproduced, the
  // payload had already run. The restore (smudge) and checkpoint (clean) paths
  // neutralise proactively for the same reason; see filters.ts.
  const drivers = await configuredFilterDrivers(exec, repoDir)
  const overrides = filterOverrides(drivers)
  const args = [...workTree, 'status', '--porcelain', '-z', '--untracked-files=all']
  const result = await runGitAllowFail(exec, [...overrides, ...args], repoDir)

  if (result.exitCode !== 0) {
    // Filters are already disabled in this argv, so the failure is a real git
    // error, not a filter veto. `retried: null` keeps the one-attempt shape.
    return { failure: { args, original: result, retried: null, drivers } }
  }

  return { status: { entries: parsePorcelainZ(result.stdout), overrides, drivers } }
}

/**
 * Renders a status failure as one line, for an error or a mismatch detail.
 *
 * @param failure - The failure to describe.
 * @returns A single-line description carrying git's own message.
 */
export const describeStatusFailure = (failure: StatusFailure): string => {
  const detail = (result: GitExecResult): string =>
    (result.stderr.trim() || result.stdout.trim() || '(no output)').split('\n').join(' ')

  return failure.retried === null
    ? `git status --porcelain failed: ${detail(failure.original)}`
    : `git status --porcelain failed (${detail(failure.original)}), and failed again with the ` +
        `content filter(s) ${failure.drivers.join(', ')} disabled (${detail(failure.retried)})`
}
