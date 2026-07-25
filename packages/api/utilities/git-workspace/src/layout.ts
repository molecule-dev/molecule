/**
 * Internal: OBSERVING whether a repository has a working tree.
 *
 * NOT part of the public surface (deliberately absent from the barrel).
 *
 * "Is this repository bare?" used to be answered by
 * `git rev-parse --is-bare-repository`, which reports `core.bare` — A CLAIM
 * WRITTEN IN THE REPOSITORY'S OWN CONFIG, not an observation. Both directions of
 * that claim are wrong in the wild and both are dangerous:
 *
 * - `core.bare=true` on a repository that HAS a working tree (a hand-edited
 *   config, a `config` copied from a mirror, a `clone --bare` somebody then
 *   worked in). Measured: the working tree holds edited and untracked files,
 *   `git status`/`git add` refuse to run ("this operation must be run in a work
 *   tree"), so the checkpoint is skipped and every content check is skipped —
 *   the archive kept the OLD blob and dropped the untracked file, and the gate
 *   said `ok: true`.
 * - `core.bare=false` on a genuine mirror (the inverse), where every work-tree
 *   command exits 128 and an archivable repository turned into an `unreadable`
 *   entry that blocked the release.
 *
 * What is observable instead: A BARE REPOSITORY *IS* ITS GIT DIR. Measured
 * (git 2.43): `rev-parse --absolute-git-dir` answers `<repo>` for a genuine bare
 * repository and `<repo>/.git` for one that merely claims to be bare, and
 * `<main>/.git/worktrees/<name>` for a linked worktree — so comparing it with the
 * canonicalised repository path settles it without asking the repository what it
 * would like to be.
 *
 * @module
 */

import { runGitAllowFail } from './git.js'
import { realPath } from './shell.js'
import type { GitExec } from './types.js'

/** What a repository's directory actually IS, as opposed to what it claims. */
export interface RepoLayout {
  /** Absolute path of the repository's git dir, as git resolved it. */
  gitDir: string
  /**
   * True when the directory IS the git dir — no working tree. OBSERVED (git dir
   * === repository path), never read from `core.bare`.
   */
  bare: boolean
  /**
   * Argv fragments that make a WORK-TREE command run against this repository's
   * working tree whatever `core.bare` claims, placed before the subcommand.
   * Empty for a bare repository, which has no working tree to point at.
   *
   * Measured: `-c core.bare=false` alone is NOT enough for `git status` or
   * `git add` on a mislabelled repository ("fatal: this operation must be run in
   * a work tree") — the explicit `--work-tree` is what makes them run. Both are
   * passed: the first for commands that only consult `core.bare` (`ls-files`),
   * the second for those that need a working tree.
   */
  workTree: readonly string[]
  /**
   * `core.worktree` configured on an OBSERVED-BARE repository — i.e. a working
   * tree that exists SOMEWHERE ELSE and that an inspection of this directory
   * therefore cannot see. Null in every other case (including the normal one,
   * where the working tree is the repository directory itself).
   */
  detachedWorkTree: string | null
}

/**
 * Observes whether a directory is a bare repository, and how to reach its
 * working tree if it has one.
 *
 * @param exec - The injected git executor.
 * @param repoDir - Absolute path of the repository.
 * @returns The observed layout, or the reason git would not answer for that
 *   directory. NEVER THROWS for a git-level refusal — the caller decides whether
 *   that is an `unreadable` entry, a reported mismatch, or an exception.
 */
export const readRepoLayout = async (
  exec: GitExec,
  repoDir: string,
): Promise<{ layout: RepoLayout } | { error: string }> => {
  const args = ['rev-parse', '--absolute-git-dir', '--git-dir']
  const result = await runGitAllowFail(exec, args, repoDir)

  if (result.exitCode !== 0) {
    return {
      error:
        (result.stderr.trim() || result.stdout.trim() || '(no output)').split('\n').join(' ') ||
        '(no output)',
    }
  }

  const [absoluteGitDir = '', gitDirSpelling = ''] = result.stdout
    .split('\n')
    .map((line) => line.trim())

  if (absoluteGitDir === '') {
    return { error: `git rev-parse --absolute-git-dir printed nothing for ${repoDir}` }
  }

  // git's `--absolute-git-dir` is already canonical (it chdirs and reads the
  // working directory back), so the repository path must be canonicalised too or
  // one symlink in the caller's path makes every repository look non-bare. When
  // the OS resolver is unavailable, fall back to git's own spelling: it answers
  // the literal '.' when the directory it ran in IS the git dir.
  const canonicalRepoDir = await realPath(exec, repoDir)
  const bare =
    canonicalRepoDir === null ? gitDirSpelling === '.' : absoluteGitDir === canonicalRepoDir
  const configuredWorkTree = bare
    ? await runGitAllowFail(exec, ['config', '--get', 'core.worktree'], repoDir)
    : null

  return {
    layout: {
      gitDir: absoluteGitDir,
      bare,
      workTree: bare ? [] : ['-c', 'core.bare=false', `--work-tree=${repoDir}`],
      detachedWorkTree:
        configuredWorkTree !== null &&
        configuredWorkTree.exitCode === 0 &&
        configuredWorkTree.stdout.trim() !== ''
          ? configuredWorkTree.stdout.trim()
          : null,
    },
  }
}
