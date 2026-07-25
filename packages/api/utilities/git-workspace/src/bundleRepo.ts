/**
 * Writes a repository to a single-file git bundle.
 *
 * @module
 */

import { runGit, runGitAllowFail } from './git.js'
import type { GitExec } from './types.js'

/**
 * Writes a single-file bundle of ALL refs.
 *
 * `--all` captures every ref under `refs/` — branches, tags, remote-tracking
 * refs, notes, and the top stash — PLUS HEAD, so a detached HEAD's commits,
 * reachable from no branch, survive the round trip. The bundle is
 * self-contained (no prerequisites), which is what makes it restorable anywhere
 * with `restoreRepo`.
 *
 * WHAT A BUNDLE CANNOT CARRY: REFLOGS. `git reflog` history is not archived, and
 * neither are stash entries below the top one (`stash@{1}` and beyond live only
 * in the stash reflog). `refs/stash` itself — the most recent stash — is in the
 * bundle and replays with `git stash apply refs/stash`.
 *
 * Objects are delta-compressed, so re-bundling a repo after a few commits costs
 * roughly the size of the new work rather than the whole history.
 *
 * @param exec - The injected git executor.
 * @param repoPath - Absolute path of the repo to bundle. In a polyrepo
 *   workspace EVERY discovered repo must be bundled separately: a bundle taken
 *   at the workspace root contains nothing whatsoever of its nested repos.
 * @param bundlePath - Absolute path of the bundle file to write. Its parent
 *   directory must already exist (git will not create it), and a relative path
 *   would resolve against `repoPath`. Derive the FILENAME from the repo's
 *   workspace path (`encodeURIComponent(repo.path)`), never from its basename:
 *   a polyrepo routinely holds two repos called `api`, and a colliding filename
 *   silently overwrites the first one's archive.
 * @returns Nothing; the bundle exists on success. A `true` from `verifyBundle`
 *   does NOT prove it is intact — prove that with `verifyBundleRestorable`.
 * @throws {Error} When the repo has no refs at all AND an unborn HEAD — `git
 *   bundle create --all` exits with "Refusing to create empty bundle" and writes
 *   NO file, so this is detected up front and surfaced as a clear error instead
 *   of a missing archive. Note this is the ONLY empty case: a repo with an
 *   unborn HEAD (`headSha === null`) that still has refs bundles normally and
 *   must not be skipped. An EMPTY BARE repo (a `git init --bare` mirror with
 *   nothing pushed to it yet) gets its own message saying to skip it, because
 *   the general advice — checkpoint the working tree first — is impossible for a
 *   repo that has no working tree.
 * @throws {Error} When git fails to write the bundle (missing parent directory,
 *   no disk space, unreadable object store).
 */
export async function bundleRepo(
  exec: GitExec,
  repoPath: string,
  bundlePath: string,
): Promise<void> {
  const head = await runGitAllowFail(exec, ['rev-parse', '--verify', 'HEAD'], repoPath)

  if (head.exitCode !== 0) {
    // HEAD is unborn. There may still be refs to bundle (an orphan branch
    // checkout leaves other branches intact), so only refuse when the whole ref
    // namespace is also empty.
    const refs = await runGit(
      exec,
      ['for-each-ref', '--count=1', '--format=%(refname)', 'refs/'],
      repoPath,
    )

    if (refs.stdout.trim() === '') {
      // A BARE repo gets a different instruction: it has no working tree, so
      // "checkpoint it first" is impossible advice — the two errors together
      // used to leave an empty `git init --bare` mirror (the normal state of a
      // mirror nothing has been pushed to yet) with no way forward at all.
      const isBare = await runGitAllowFail(exec, ['rev-parse', '--is-bare-repository'], repoPath)

      if (isBare.exitCode === 0 && isBare.stdout.trim() === 'true') {
        throw new Error(
          `cannot bundle ${repoPath}: it is an EMPTY BARE repository (no refs at all) — a mirror ` +
            `created with git init --bare that nothing has been pushed to yet. It holds no objects ` +
            `and no refs, so there is genuinely nothing to archive: SKIP it. (checkpointRepo cannot ` +
            `help here — a bare repo has no working tree to commit.)`,
        )
      }

      throw new Error(
        `cannot bundle ${repoPath}: the repository has no commits (no refs and an unborn HEAD), ` +
          `and git refuses to create an empty bundle. Checkpoint the working tree first ` +
          `(checkpointRepo) or skip this repo — there is nothing to archive.`,
      )
    }
  }

  // `--` guarantees a bundle path beginning with a dash is treated as a path and
  // never as an option; `--all` after it is still read as a rev-list argument
  // (argv arrays already rule out shell injection).
  await runGit(exec, ['bundle', 'create', '--', bundlePath, '--all'], repoPath)
}
