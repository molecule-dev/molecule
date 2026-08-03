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
 * @param exec - The injected git executor. `git bundle verify` refuses to run
 *   outside a repository ("need a repository to verify a bundle"), which would
 *   make this a false negative whenever the executor's default cwd is not a
 *   repo — so it runs against an empty bare repo at `scratchGitDir`.
 * @param bundlePath - Absolute path of the bundle to verify. A relative path
 *   would resolve against the executor's default working directory.
 * @param scratchGitDir - Absolute path this function may create an empty bare
 *   repo at. OWNED BY THE CALLER, which must remove it — this package is given a
 *   git executor and nothing else, so it cannot delete a directory. Same
 *   convention as {@link verifyBundleRestorable}'s `scratchDir`. It MUST NOT be
 *   an existing repository with objects: prerequisite checking is only
 *   meaningful against an empty one, which is what makes a `true` mean
 *   "self-contained" rather than "satisfiable from whatever happened to be
 *   nearby".
 * @returns True when git verified the bundle's header as self-contained; false
 *   when the file is missing, is not a bundle, has a damaged header, or requires
 *   prerequisite commits it does not carry. A `true` says NOTHING about the
 *   packfile's integrity.
 */
export async function verifyBundle(
  exec: GitExec,
  bundlePath: string,
  scratchGitDir: string,
): Promise<boolean> {
  // An EMPTY BARE REPOSITORY: it satisfies git's "need a repository" check while
  // holding no objects, so no real history can satisfy a bundle's prerequisites
  // and only a self-contained bundle passes.
  //
  // It has to be a REAL repo, and that is why this function takes a scratch path
  // instead of inventing one. Pointing --git-dir at a path that does not exist
  // used to be enough — git 2.43 accepts it — but git stopped honouring that: on
  // 2.54 the same call fails with "need a repository to verify a bundle", so
  // EVERY verification returned a false negative. That is what broke this
  // package's suite on CI runners (git 2.5x) while it passed locally on 2.43.
  // Verified on both: a real empty bare repo passes a self-contained bundle and
  // still rejects an incremental one.
  //
  // Idempotent, and allowed to fail: if the repo cannot be created, the verify
  // below reports false, which is this function's answer for "cannot verify".
  await runGitAllowFail(exec, ['init', '--bare', '--quiet', '--', scratchGitDir])
  const emptyGitDir = scratchGitDir
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
