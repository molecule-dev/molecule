/**
 * Bundle header verification.
 *
 * @module
 */

import { runGitAllowFail } from './git.js'
import type { GitExec } from './types.js'

/**
 * Checks a bundle's HEADER: is it a bundle, and is it self-contained?
 *
 * THIS IS NOT AN INTEGRITY CHECK, and that is measured, not assumed. `git bundle
 * verify` parses the header and checks prerequisites; it does NOT read the
 * packfile. A bundle truncated to 90% of its bytes, and a bundle with a byte
 * flipped inside its packfile, BOTH still report "is okay" (verified against git
 * 2.43 and pinned by a test in this package). Treating a `true` from this
 * function as "the archive is intact" and then deleting the source WOULD LOSE
 * USER WORK.
 *
 * WHAT IT DOES PROVE: the file is a real bundle, its header parses, and it has
 * NO prerequisite commits — i.e. it can be restored standalone, which is the
 * property an archive depends on. Verification runs against a deliberately EMPTY
 * git dir, so a bundle that merely happens to be satisfiable by some nearby
 * repository still fails; only a truly self-contained bundle passes.
 *
 * The check that DOES read every byte is {@link verifyBundleRestorable}, which
 * restores the bundle for real (index-pack recomputes the pack checksum and
 * inflates every object). That is the only check that may precede deleting the
 * source repo.
 *
 * @param exec - The injected git executor. Note that `git bundle verify`
 *   normally refuses to run outside a repository ("need a repository to verify a
 *   bundle"), which would make this return a false negative whenever the
 *   executor's default cwd is not a repo. An explicit `--git-dir` removes that
 *   dependency entirely; git only reads it, and never creates it.
 * @param bundlePath - Absolute path of the bundle to verify. A relative path
 *   would resolve against the executor's default working directory.
 * @returns True when git verified the bundle's header as self-contained; false
 *   when the file is missing, is not a bundle, has a damaged header, or requires
 *   prerequisite commits it does not carry. A `true` says NOTHING about the
 *   packfile's integrity.
 */
export async function verifyBundle(exec: GitExec, bundlePath: string): Promise<boolean> {
  // A path git will never find a repository at, and never writes to: it exists
  // purely to satisfy the "need a repository" check while guaranteeing that no
  // real repository's objects can satisfy a bundle's prerequisites.
  const emptyGitDir = `${bundlePath}.molecule-verify-gitdir`
  // `--` guarantees a bundle path beginning with a dash is treated as a path and
  // never as an option (argv arrays already rule out shell injection).
  const result = await runGitAllowFail(exec, [
    `--git-dir=${emptyGitDir}`,
    'bundle',
    'verify',
    '--',
    bundlePath,
  ])

  return result.exitCode === 0
}
