/**
 * Commits uncommitted work so archival cannot lose it.
 *
 * @module
 */

import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'

import { configuredFilterDrivers, filterOverrides } from './filters.js'
import { gitError, runGit, runGitAllowFail } from './git.js'
import { readRepoLayout } from './layout.js'
import { readStatus } from './status.js'
import type { GitExec, GitExecResult } from './types.js'

/**
 * Identity used ONLY when the repository has none configured.
 *
 * Archival must never fail because `user.email` was never set in a sandbox, and
 * it must never silently adopt the identity of whoever runs the archiver, so the
 * checkpoint commit is attributed to an obviously-machine author.
 */
const FALLBACK_AUTHOR_NAME = 'molecule.dev archiver'

/**
 * Email paired with {@link FALLBACK_AUTHOR_NAME}, used only when the repository
 * has no `user.email` configured.
 */
const FALLBACK_AUTHOR_EMAIL = 'archiver@molecule.dev'

/**
 * `core.hooksPath` forced onto the checkpoint commit, chosen so that it CANNOT
 * contain a hook: `/dev/null` is a character device, so nothing can exist below
 * it and every hook lookup fails with ENOTDIR.
 *
 * `--no-verify` is NOT enough on its own, and that is measured (git 2.43), one
 * hook at a time: `pre-commit` and `commit-msg` are the only hooks it skips.
 * `prepare-commit-msg` still RUNS, and its non-zero exit ABORTS the commit — so
 * a husky `prepare-commit-msg` wired to commitizen/commitlint (which fails
 * closed in an archival sandbox that has neither installed) vetoed every
 * checkpoint for that project, leaving the user's uncommitted work unarchived.
 * A command-line `-c` overrides both `.git/hooks` and a repo-level
 * `core.hooksPath` (the husky shape), which is what actually guarantees no hook
 * can veto archival.
 */
const NO_HOOKS_PATH = '/dev/null/molecule-archiver-no-hooks'

/**
 * Git-dir entries whose presence means an operation is HALF-FINISHED, and what
 * the user would run to finish or abandon it.
 *
 * These are the states in which the working tree holds a machine-generated
 * intermediate — conflict markers, a partially applied patch series, a bisect
 * checkout — rather than user work. Committing there does not "checkpoint"
 * anything; it writes `<<<<<<< HEAD` into the user's branch and calls it done.
 */
const IN_PROGRESS_STATES: readonly { entry: string; operation: string; howToFinish: string }[] = [
  {
    entry: 'MERGE_HEAD',
    operation: 'merge',
    howToFinish: 'git merge --continue / git merge --abort',
  },
  {
    entry: 'REBASE_HEAD',
    operation: 'rebase',
    howToFinish: 'git rebase --continue / git rebase --abort',
  },
  {
    entry: 'rebase-merge',
    operation: 'interactive or merge-based rebase',
    howToFinish: 'git rebase --continue / git rebase --abort',
  },
  {
    entry: 'rebase-apply',
    operation: 'rebase or patch application (git am)',
    howToFinish: 'git rebase --abort, or git am --abort',
  },
  {
    entry: 'CHERRY_PICK_HEAD',
    operation: 'cherry-pick',
    howToFinish: 'git cherry-pick --continue / git cherry-pick --abort',
  },
  { entry: 'BISECT_LOG', operation: 'bisect', howToFinish: 'git bisect reset' },
]

/**
 * Builds the error thrown when a command failed even with every configured
 * content filter neutralised.
 *
 * It NAMES the drivers, because "git add failed" sends an operator looking at
 * the wrong thing entirely, and archival stopping is the loudest possible
 * outcome — which is the correct one: committing content half of whose files
 * went through a filter and half of which did not would corrupt the archive
 * quietly.
 *
 * @param repoPath - Repo being checkpointed.
 * @param step - Human-readable name of the step that failed.
 * @param drivers - The content filter drivers that were neutralised.
 * @param original - The failure BEFORE the filters were neutralised.
 * @param retried - The failure AFTER they were neutralised.
 * @returns The error to throw.
 */
const filterError = (
  repoPath: string,
  step: string,
  drivers: readonly string[],
  original: GitExecResult,
  retried: GitExecResult,
): Error => {
  const detail = (result: GitExecResult): string =>
    (result.stderr.trim() || result.stdout.trim() || '(no output)').split('\n').join(' ')

  return new Error(
    `cannot checkpoint ${repoPath}: ${step} failed under the content filter(s) ` +
      `${drivers.join(', ')} (${detail(original)}), and failed again with those filters ` +
      `disabled (${detail(retried)}). The uncommitted work is NOT archived. Install the filter's ` +
      `tool (git-lfs is the usual one) in the archival environment, or resolve the error above — ` +
      `committing now would archive content that only some files' filters had processed.`,
  )
}

/**
 * Reads a git config value, treating "not set" as an empty string.
 *
 * @param exec - The injected git executor.
 * @param repoPath - Repo to read the config in.
 * @param key - Config key, e.g. `user.email`.
 * @returns The configured value, or '' when unset (git exits 1 for an unset key).
 */
const readConfig = async (exec: GitExec, repoPath: string, key: string): Promise<string> => {
  const result = await runGitAllowFail(exec, ['config', '--get', key], repoPath)

  return result.exitCode === 0 ? result.stdout.trim() : ''
}

/**
 * Reports whether a path exists.
 *
 * @param path - Absolute path to test.
 * @returns True when it exists, false when it (or a parent component) does not.
 * @throws {Error} When existence could not be determined at all — an unknown
 *   answer must not be reported as "no in-progress operation".
 */
const pathExists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)

    return true
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    // Documented noop: ENOENT/ENOTDIR is the answer this helper reports — the
    // entry is simply not there, which is the normal, overwhelmingly common case.
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return false
    }

    throw new Error(
      `could not determine whether ${path} exists (${(error as Error).message}); ` +
        `refusing to assume no git operation is in progress`,
      { cause: error },
    )
  }
}

/**
 * Throws when the repo is in the middle of a merge, rebase, cherry-pick, patch
 * application, or bisect.
 *
 * Resolved through `git rev-parse --git-path`, so it is correct when `.git` is a
 * FILE (a linked worktree or a submodule), where the state entries live in the
 * worktree's own git dir rather than in `<repo>/.git/`.
 *
 * @param exec - The injected git executor.
 * @param repoPath - Absolute path of the repo to inspect.
 * @returns Nothing; returns normally when no operation is in progress.
 * @throws {Error} Naming the operation, the entry that proves it, and how to
 *   finish or abandon it.
 */
const assertNoOperationInProgress = async (exec: GitExec, repoPath: string): Promise<void> => {
  const args = ['rev-parse', ...IN_PROGRESS_STATES.flatMap((state) => ['--git-path', state.entry])]
  const result = await runGit(exec, args, repoPath)
  const paths = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')

  if (paths.length !== IN_PROGRESS_STATES.length) {
    throw gitError(args, result, repoPath)
  }

  for (const [index, state] of IN_PROGRESS_STATES.entries()) {
    // `--git-path` answers relative to the repo for a plain repo and absolutely
    // for a linked worktree; resolving against repoPath handles both.
    const statePath = resolve(repoPath, paths[index] as string)

    if (await pathExists(statePath)) {
      throw new Error(
        `cannot checkpoint ${repoPath}: a ${state.operation} is in progress (${statePath} exists). ` +
          `An unfinished ${state.operation} is unfinished USER WORK, not a checkpoint — committing now ` +
          `would commit conflict markers and a half-applied state onto the user's branch. ` +
          `Finish or abandon it first (${state.howToFinish}), then archive.`,
      )
    }
  }
}

/**
 * Commits any uncommitted work so it survives archival.
 *
 * REFUSES A BARE REPOSITORY — one that OBSERVABLY has no working tree, i.e.
 * whose directory IS its git dir ({@link readRepoLayout}), not one whose config
 * merely claims `core.bare=true`. There is then nothing to stage and nothing to
 * commit, so this throws rather than letting `git status`/`git add` fail with
 * git's obscure "this operation must be run in a work tree". Bare repos are still
 * archived — skip the checkpoint and call {@link bundleRepo}, which works on them
 * normally. A repository that has a real working tree while CLAIMING to be bare
 * is checkpointed like any other (measured: `-c core.bare=false` alone is not
 * enough for `status`/`add`, so an explicit `--work-tree` is passed) — its
 * uncommitted work used to be skipped entirely and silently lost.
 *
 * NOTHING THE REPOSITORY CONFIGURES CAN HIDE WORK FROM IT. `git status` runs on
 * pinned configuration ({@link HERMETIC_CONFIG}) with `--untracked-files=all`,
 * because `status.showUntrackedFiles=no` — a routine large-repo performance
 * setting — makes plain `--porcelain` print nothing for untracked files, so the
 * checkpoint found a "clean" tree, committed nothing, and a directory of new work
 * went into no bundle at all. `core.excludesFile` (a host-level ignore file) did
 * the same to `git add -A`, and is pinned away for the same reason.
 *
 * REFUSES A REPO MID-OPERATION. A merge, rebase, cherry-pick, `git am`, or
 * bisect that has not finished leaves the working tree holding conflict markers
 * and a half-applied state; that is unfinished user work, not something to
 * snapshot, so this throws and names the state instead of committing it. The
 * detection reads the git dir (via `git rev-parse --git-path`) directly, so
 * `repoPath` must be visible to THIS process.
 *
 * Staging uses `git add -A`, which RESPECTS `.gitignore` — `node_modules/`,
 * `dist/`, and `.env*` stay out of the archive (env values are re-assembled from
 * the control-plane vault at boot, so nothing is lost by omitting them).
 *
 * NO HOOK CAN VETO THE CHECKPOINT, and `--no-verify` is not what guarantees
 * that. Measured against git 2.43, one hook at a time: `--no-verify` skips
 * EXACTLY TWO of the hooks git runs for a commit — `pre-commit` and
 * `commit-msg`. It does NOT skip `prepare-commit-msg`, which still runs and
 * whose non-zero exit ABORTS the commit; a husky `prepare-commit-msg` driving
 * commitizen/commitlint fails closed in an archival sandbox that has neither, so
 * it vetoed every checkpoint for such a project and left the uncommitted work
 * unarchived. (`post-commit` runs after the commit is written and cannot undo
 * it; `pre-applypatch` belongs to `git am` and is not a commit hook at all.)
 * What actually guarantees archival is a command-line
 * `-c core.hooksPath=/dev/null/…` — a path under a character device, so no hook
 * file can exist there — which overrides BOTH `.git/hooks` and a repo-level
 * `core.hooksPath` (the husky shape). `--no-verify` is kept as well.
 * `--no-gpg-sign` is set because signing a machine-made snapshot means nothing.
 *
 * NO CONTENT FILTER CAN VETO IT EITHER — the same veto as a hook, through a
 * different knob. A repo using git-lfs configures `filter.lfs.process` +
 * `filter.lfs.required=true`; in an archival sandbox WITHOUT the `git-lfs`
 * binary, that filter fails, and measured on git 2.43 it takes down
 * `git status`, `git add -A` AND `git commit` (which refreshes the index and
 * re-runs the clean filter), each with exit 128 — so every repo using git-lfs
 * failed to archive at all. Each step therefore RETRIES with every configured
 * filter driver neutralised (`filter.<d>.process=`, `.clean=`, `.smudge=`,
 * `.required=false` — the combination that actually works; see
 * {@link filterOverrides} for the ones that do NOT), and git then stores the
 * file's raw bytes.
 *
 * The retry happens only AFTER a real failure, never pre-emptively: in a repo
 * whose git-lfs works, disabling the filter would silently commit raw bytes
 * where the project's own history holds pointers. If the retry fails too, this
 * THROWS and NAMES the driver rather than committing content that only some
 * files' filters had processed.
 *
 * WHAT AN LFS REPO'S ARCHIVE ACTUALLY CONTAINS: a bundle carries git objects, and
 * LFS keeps its large files OUTSIDE the object store (`.git/lfs/objects`), so
 * they are NOT archived — the bundle holds pointers. Fetch LFS content into the
 * repo (or accept pointers) before treating an LFS project as fully archived.
 *
 * None of that promises the commit always succeeds — git can still refuse (a
 * bare or mid-operation repo, both refused up front here; a corrupt index; a
 * full disk) and those failures throw.
 *
 * @param exec - The injected git executor.
 * @param repoPath - Absolute path of the repo to checkpoint. Each repo in a
 *   workspace is checkpointed independently — never assume one repo.
 * @param message - Commit message. Passed as argv, so any quoting is safe.
 * @returns The new commit sha, or null when the tree was already clean (or when
 *   nothing was stageable, e.g. only an embedded repo's contents changed).
 * @throws {Error} When `message` is empty, when the repo is BARE, when a
 *   merge/rebase/cherry-pick/am/bisect is in progress, when a configured content
 *   filter fails even with every filter disabled (the error NAMES the driver), or
 *   when git otherwise fails to stage or commit.
 */
export async function checkpointRepo(
  exec: GitExec,
  repoPath: string,
  message: string,
): Promise<string | null> {
  if (message.trim() === '') {
    throw new Error(
      `cannot checkpoint ${repoPath}: a non-empty commit message is required (git rejects an empty message)`,
    )
  }

  const observed = await readRepoLayout(exec, repoPath)

  if ('error' in observed) {
    throw new Error(`cannot checkpoint ${repoPath}: git rev-parse failed (${observed.error})`)
  }

  const { layout } = observed

  if (layout.bare) {
    throw new Error(
      `cannot checkpoint ${repoPath}: it is a BARE repository (no working tree), so there is ` +
        `nothing to stage and nothing to commit. Do not skip it — a bare repo still holds refs ` +
        `and objects that exist nowhere else; bundle it directly with bundleRepo.`,
    )
  }

  await assertNoOperationInProgress(exec, repoPath)

  // Read through the shared reader, so the checkpoint cannot be blinded by the
  // repository's own configuration (`status.showUntrackedFiles=no` made it find
  // a "clean" tree and commit nothing while a whole new feature directory sat
  // there untracked) and so a broken required filter is retried, not obeyed.
  const reading = await readStatus(exec, repoPath, layout.workTree)

  if ('failure' in reading) {
    const { original, retried } = reading.failure

    if (retried === null) {
      throw gitError([...layout.workTree, 'status', '--porcelain'], original, repoPath)
    }

    throw filterError(
      repoPath,
      'reading the working tree status',
      reading.failure.drivers,
      original,
      retried,
    )
  }

  // Overrides that disable the repo's content filters. Computed ONLY after a
  // command has actually failed, and then reused for every later step: a WORKING
  // filter must keep working (disabling git-lfs up front would rewrite every
  // changed pointer as raw bytes in a repo whose own tooling is fine), while a
  // BROKEN one must not be allowed to abort archival.
  let overrides = reading.status.overrides

  if (reading.status.entries.length === 0) {
    return null
  }

  const addArgs = [...layout.workTree, 'add', '-A']
  const added = await runGitAllowFail(exec, [...overrides, ...addArgs], repoPath)

  if (added.exitCode !== 0 && overrides.length === 0) {
    const drivers = await configuredFilterDrivers(exec, repoPath)

    overrides = filterOverrides(drivers)

    if (overrides.length === 0) {
      throw gitError(addArgs, added, repoPath)
    }

    const retried = await runGitAllowFail(exec, [...overrides, ...addArgs], repoPath)

    if (retried.exitCode !== 0) {
      throw filterError(repoPath, 'staging the working tree', drivers, added, retried)
    }
  } else if (added.exitCode !== 0) {
    throw gitError([...overrides, ...addArgs], added, repoPath)
  }

  // `git diff --cached --quiet` exits 1 when something is staged and 0 when
  // nothing is — anything higher is a real error. A dirty status with nothing
  // stageable is possible (e.g. modified content inside an embedded repo, which
  // git records as a gitlink only when its HEAD moves), and committing then
  // would fail with "nothing to commit".
  const staged = await runGitAllowFail(
    exec,
    [...overrides, ...layout.workTree, 'diff', '--cached', '--quiet'],
    repoPath,
  )

  if (staged.exitCode === 0) {
    return null
  }

  if (staged.exitCode > 1) {
    throw gitError(['diff', '--cached', '--quiet'], staged, repoPath)
  }

  const [name, email] = await Promise.all([
    readConfig(exec, repoPath, 'user.name'),
    readConfig(exec, repoPath, 'user.email'),
  ])
  const identity: string[] = []

  if (name === '') {
    identity.push('-c', `user.name=${FALLBACK_AUTHOR_NAME}`)
  }

  if (email === '') {
    identity.push('-c', `user.email=${FALLBACK_AUTHOR_EMAIL}`)
  }

  // `-c core.hooksPath=…` is the part that actually guarantees no hook can veto
  // this commit; `--no-verify` alone leaves `prepare-commit-msg` able to abort
  // it. See NO_HOOKS_PATH for the measurement.
  //
  // The filter overrides are carried here too: measured, `git commit` refreshes
  // the index against the working tree and re-runs the clean filter, so a
  // successfully staged tree still failed at commit time without them.
  const commitArgs = [
    ...overrides,
    ...identity,
    ...layout.workTree,
    '-c',
    `core.hooksPath=${NO_HOOKS_PATH}`,
    'commit',
    '--no-verify',
    '--no-gpg-sign',
    '-m',
    message,
  ]
  const committed = await runGitAllowFail(exec, commitArgs, repoPath)

  if (committed.exitCode !== 0) {
    if (overrides.length > 0) {
      // The filters were already neutralised for this argv (visible in the
      // rendered command), so this failure is something else entirely.
      throw gitError(commitArgs, committed, repoPath)
    }

    const configured = await configuredFilterDrivers(exec, repoPath)
    const retryOverrides = filterOverrides(configured)

    if (retryOverrides.length === 0) {
      throw gitError(commitArgs, committed, repoPath)
    }

    const retried = await runGitAllowFail(exec, [...retryOverrides, ...commitArgs], repoPath)

    if (retried.exitCode !== 0) {
      throw filterError(repoPath, 'committing the staged tree', configured, committed, retried)
    }
  }

  const head = await runGit(exec, ['rev-parse', '--verify', 'HEAD'], repoPath)

  return head.stdout.trim()
}
