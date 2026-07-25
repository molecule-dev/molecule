/**
 * Internal: neutralising a repository's CONTENT FILTERS.
 *
 * NOT part of the public surface (deliberately absent from the barrel).
 *
 * A `filter.<driver>` (git-lfs is the one everybody has) runs an external
 * program on file content, and when that program is missing — the normal state
 * of an archival sandbox — every command that reads the working tree fails with
 * exit 128. That is the same veto a failing commit hook used to have, through a
 * different knob, and it must not be able to stop an archive: a repo that cannot
 * be staged is a repo whose uncommitted work is silently not archived, and a
 * bundle that cannot be checked out is an archive that cannot be verified.
 *
 * @module
 */

import { runGitAllowFail } from './git.js'
import type { GitExec } from './types.js'

/**
 * Every CONTENT FILTER driver configured for a repository, from every config
 * scope (repo, global, system) — git-lfs installs itself globally, so a
 * repo-only read would miss the commonest one of all.
 *
 * A driver is the `<name>` in `filter.<name>.clean` / `.process` / `.smudge` /
 * `.required`. The name may itself contain dots (`filter.my.driver.clean`), so
 * it is everything between the first and the LAST dot — git's own subsection
 * rule.
 *
 * @param exec - The injected git executor.
 * @param repoPath - Repo whose configuration is read.
 * @returns The driver names, deduplicated, in git's order.
 */
export const configuredFilterDrivers = async (
  exec: GitExec,
  repoPath: string,
): Promise<string[]> => {
  const result = await runGitAllowFail(
    exec,
    ['config', '--name-only', '--get-regexp', '^filter\\..*\\.(clean|smudge|process|required)$'],
    repoPath,
  )

  if (result.exitCode !== 0) {
    // Exit 1 simply means no key matched — the overwhelmingly common case.
    return []
  }

  const drivers = new Set<string>()

  for (const line of result.stdout.split('\n')) {
    const key = line.trim()
    const lastDot = key.lastIndexOf('.')

    if (key.startsWith('filter.') && lastDot > 'filter.'.length) {
      drivers.add(key.slice('filter.'.length, lastDot))
    }
  }

  return [...drivers]
}

/**
 * Builds the `-c` overrides that NEUTRALISE a repository's content filters for
 * one command.
 *
 * MEASURED against a verbatim git-lfs install (`filter.lfs.clean/smudge/process`
 * plus `filter.lfs.required=true`, `.gitattributes: *.psd filter=lfs`) with the
 * `git-lfs` binary absent — the archival-sandbox case — on git 2.43:
 *
 * - `-c filter.lfs.required=false` ALONE does NOT work while `.process` is set:
 *   the long-running process filter still fails to start and git aborts with
 *   "fatal: the remote end hung up unexpectedly".
 * - `-c filter.lfs.clean= -c filter.lfs.process=` alone does NOT work either:
 *   an empty command counts as a FAILED filter, and `required=true` makes that
 *   fatal ("fatal: <path>: clean filter 'lfs' failed").
 * - Emptying `process`, `clean` and `smudge` AND setting `required=false` works:
 *   git stores (or checks out) the file's RAW BYTES. For an archive that is
 *   strictly better than a pointer to an LFS server the archive cannot reach.
 *
 * There is no repo-wide "ignore .gitattributes" switch to reach for instead:
 * `GIT_ATTR_NOSYSTEM` and `core.attributesFile` only affect the system and
 * global attribute files, never the `.gitattributes` committed in the tree, and
 * this package cannot set environment variables through a {@link GitExec}
 * anyway. Enumerating the drivers is what actually works.
 *
 * @param drivers - Driver names from {@link configuredFilterDrivers}.
 * @returns Argv fragments to place BEFORE the git subcommand; empty when there
 *   are no drivers to neutralise.
 */
export const filterOverrides = (drivers: readonly string[]): string[] =>
  drivers.flatMap((driver) => [
    '-c',
    `filter.${driver}.process=`,
    '-c',
    `filter.${driver}.clean=`,
    '-c',
    `filter.${driver}.smudge=`,
    '-c',
    `filter.${driver}.required=false`,
  ])
