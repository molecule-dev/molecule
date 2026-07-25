/**
 * THE SAFETY GATE: prove the archive can rebuild the workspace, then delete.
 *
 * @module
 */

import { isAbsolute, join, relative, resolve, sep } from 'node:path'

import { runGitAllowFail } from './git.js'
import { readRepoLayout } from './layout.js'
import { restoreRepo } from './restoreRepo.js'
import { runProgram } from './shell.js'
import { describeStatusFailure, readStatus } from './status.js'
import {
  type ArchivedRepo,
  type GitExec,
  RECONSTRUCTION_MISMATCH_KINDS,
  type ReconstructionMismatch,
  type ReconstructionReport,
} from './types.js'

/**
 * How many file-level differences are reported per repository before the rest
 * are summarised.
 *
 * A diverged repo can differ in every file, and a hundred thousand mismatches
 * help nobody: the verdict is already `ok: false`, and the first few paths plus
 * an honest count are what an operator acts on.
 */
const MAX_REPORTED_FILES = 25

/**
 * Names whose presence in one directory means "this is a bare repository".
 *
 * `HEAD` + `objects` ONLY — `refs` is deliberately NOT required. A mirror that
 * has been packed (`git gc` / `git pack-refs --all`, the normal state of an idle
 * mirror) keeps its refs in the `packed-refs` FILE, and a `refs/` directory that
 * then holds nothing does not survive a round trip through anything that cannot
 * represent an empty directory — a zip, an object-storage key sync, `git
 * archive`, some rsync and Docker COPY paths. Measured: such a directory holding
 * the ONLY copy of a commit was invisible to this enumeration AND to
 * `discoverRepos`, so the gate said `ok: true` and a release would have deleted
 * it. The looser shape costs only false POSITIVES (a directory that merely holds
 * a `HEAD` file beside an `objects` directory is reported and an operator
 * looks), which is the direction this package is allowed to be wrong in.
 */
const BARE_MARKERS = ['HEAD', 'objects'] as const

/**
 * Directory names directly under a `.git` that hold git's OWN administrative
 * repositories, which are covered by the repository they belong to.
 *
 * `.git/modules/<name>` is a submodule's git dir — the submodule's WORKING TREE
 * is enumerated at its own path (it holds a `.git` file), so reporting the admin
 * copy as a second repository would block every workspace that uses submodules.
 * `.git/worktrees/<name>` is a linked worktree's admin dir, whose working tree is
 * likewise enumerated on its own.
 *
 * Everything ELSE inside a `.git` directory is reported: a whole repository
 * parked at `.git/<something>` is covered by nobody's bundle, and releasing the
 * workspace deletes it.
 */
const GIT_OWNED_SUBDIRECTORIES = ['modules', 'worktrees'] as const

/** Everything the gate reads about one repository, live or restored. */
interface RepoFacts {
  /**
   * True when the repository has no working tree — OBSERVED (the directory IS
   * the git dir), never read from `core.bare`. See {@link readRepoLayout}.
   */
  bare: boolean
  /** Absolute path of the repository's git dir, as git resolved it. */
  gitDir: string
  /**
   * A working tree configured to live OUTSIDE an observed-bare repository
   * (`core.worktree`), which an inspection of this directory cannot see. Null
   * whenever there is nothing hidden.
   */
  detachedWorkTree: string | null
  /** HEAD's commit, or null when HEAD is unborn. */
  headSha: string | null
  /**
   * HEAD's SYMBOLIC state as a comparable string: `branch:<name>` when HEAD is a
   * symbolic ref, `detached` when it is not. Compared because a restore that
   * lands on a branch the source was not on is a real difference even when every
   * commit matches.
   */
  head: string
  /** `<sha> <refname>` for every ref, refname-sorted (git's own order). */
  refs: string[]
  /**
   * `<mode> <sha> <stage>\t<path>` for every tracked file (`git ls-files -s -z`),
   * or null for a bare repository, which has neither index nor working tree.
   */
  files: string[] | null
  /** `git status --porcelain -z -uall` entries, or null for a bare repository. */
  status: string[] | null
  /**
   * Tracked paths the gate CANNOT SEE THE CONTENT OF: those carrying a
   * `skip-worktree` or `assume-unchanged` index bit, which makes both `git
   * status` and `git ls-files -s` report the INDEX instead of the file on disk.
   */
  unattestable: string[]
  /**
   * Tracked paths that are EXECUTABLE on disk while the index records a
   * non-executable mode — the bit exists in the workspace and is in no bundle.
   */
  lostModes: string[]
}

/**
 * Reads a repository's facts, or explains why it could not be read.
 *
 * NEVER THROWS. A directory that has vanished makes the executor itself reject
 * (a missing cwd is not a git error at all — `spawn git ENOENT`), and this gate
 * must turn every such surprise into a reported mismatch, not an exception that
 * hides the OTHER problems in the workspace behind the first one.
 *
 * @param exec - The injected git executor.
 * @param repoDir - Absolute path of the repository.
 * @param options - What to inspect.
 * @param options.workingTree - True to also inspect the WORKING TREE for state
 *   no bundle can carry (hidden index bits, executable bits). Only meaningful for
 *   the live repository; a freshly restored copy has neither by construction.
 * @returns The facts, or an error message when it could not be read.
 */
const readRepoFacts = async (
  exec: GitExec,
  repoDir: string,
  options: { workingTree: boolean },
): Promise<{ facts: RepoFacts } | { error: string }> => {
  try {
    return await readRepoFactsOrThrow(exec, repoDir, options)
  } catch (error) {
    // The executor could not run git here at all (the directory is gone, the
    // sandbox died). That is unknown, not clean.
    return { error: (error as Error).message }
  }
}

/**
 * Lists tracked paths whose working-tree content is HIDDEN from every check.
 *
 * `git update-index --skip-worktree` (what sparse-checkout sets, and the
 * documented recipe for keeping local edits to a tracked config file out of
 * commits) and `--assume-unchanged` both make git report the INDEX entry and
 * ignore the file on disk. Measured: with those bits set, the live and restored
 * `ls-files -s` agree exactly and `git status` is silent, while the working tree
 * holds different bytes — so the gate passed an archive that restored the OLD
 * content of an edited file. `git diff --ignore-skip-worktree-bits` does NOT
 * surface it either; `git ls-files -v` does, and is one call for the whole repo.
 *
 * @param exec - The injected git executor.
 * @param repoDir - Absolute path of the repository.
 * @param workTree - {@link RepoLayout.workTree} fragments for this repository.
 * @returns The affected paths (empty when there are none).
 * @throws {Error} When `git ls-files -v` cannot be run — a check that did not run
 *   must not read as "nothing is hidden".
 */
const readUnattestablePaths = async (
  exec: GitExec,
  repoDir: string,
  workTree: readonly string[],
): Promise<string[]> => {
  const listed = await runGitAllowFail(exec, [...workTree, 'ls-files', '-v', '-z'], repoDir)

  if (listed.exitCode !== 0) {
    throw new Error(
      `git ls-files -v failed: ${(listed.stderr.trim() || '(no output)').split('\n').join(' ')}`,
    )
  }

  const hidden: string[] = []

  for (const record of listed.stdout.split('\0')) {
    if (record.length < 3 || record[1] !== ' ') {
      continue
    }

    const tag = record[0] as string

    // `S` is skip-worktree; a LOWERCASE tag is assume-unchanged. Both mean git
    // is reporting the index and not looking at the file.
    if (tag === 'S' || (tag >= 'a' && tag <= 'z')) {
      hidden.push(record.slice(2))
    }
  }

  return hidden
}

/**
 * Lists tracked files that are EXECUTABLE on disk while the index says they are
 * not.
 *
 * Only reachable when the repository is configured to IGNORE mode changes
 * (`core.fileMode=false`): with the default `true`, `git status` already reports
 * the difference and it is caught as uncommitted work. Measured: with
 * `core.fileMode=false`, a `chmod +x` on a tracked script is invisible to
 * status, to `ls-files -s` (which reports the index mode) and therefore to the
 * comparison — the file's bytes come back, its executable bit does not.
 *
 * Deliberately ONE-DIRECTIONAL. Only "executable in the workspace, not in the
 * archive" is reported; the opposite (an index mode of `100755` on a filesystem
 * that cannot store the bit — the exact reason `core.fileMode=false` is usually
 * set) is not a loss, and reporting it would block every workspace on such a
 * filesystem.
 *
 * @param exec - The injected git executor.
 * @param repoDir - Absolute path of the repository.
 * @param files - The repository's `ls-files -s` entries.
 * @returns The affected paths (empty when there are none).
 * @throws {Error} When the mode of the working tree could not be observed at all.
 */
const readLostModes = async (
  exec: GitExec,
  repoDir: string,
  files: readonly string[],
): Promise<string[]> => {
  const fileMode = await runGitAllowFail(exec, ['config', '--get', 'core.fileMode'], repoDir)

  if (fileMode.exitCode !== 0 || fileMode.stdout.trim() !== 'false') {
    return []
  }

  const executable = await runProgram(exec, 'find', [
    repoDir,
    '-name',
    '.git',
    '-prune',
    '-o',
    '-type',
    'f',
    '-perm',
    '-u+x',
    '-print0',
  ])

  if (executable.exitCode !== 0) {
    throw new Error(
      `this repository ignores file modes (core.fileMode=false) and the working tree's executable ` +
        `bits could not be observed (${(executable.stderr.trim() || '(no output)').split('\n').join(' ')}), ` +
        `so it cannot be said that no executable bit would be lost`,
    )
  }

  const nonExecutable = new Set(
    files
      .filter((line) => line.startsWith('100644 '))
      .map((line) => line.slice(line.indexOf('\t') + 1)),
  )
  const lost: string[] = []

  for (const path of executable.stdout.split('\0')) {
    if (path === '') {
      continue
    }

    const workspacePath = toWorkspacePath(repoDir, path)

    if (workspacePath !== null && workspacePath !== '.' && nonExecutable.has(workspacePath)) {
      lost.push(workspacePath)
    }
  }

  return lost
}

/**
 * Reads a repository's facts, propagating executor failures.
 *
 * @param exec - The injected git executor.
 * @param repoDir - Absolute path of the repository.
 * @param options - What to inspect.
 * @param options.workingTree - True to also inspect the working tree for state no
 *   bundle can carry.
 * @returns The facts, or an error message when git would not open the directory.
 * @throws {Error} When the executor itself fails (see {@link readRepoFacts}).
 */
const readRepoFactsOrThrow = async (
  exec: GitExec,
  repoDir: string,
  options: { workingTree: boolean },
): Promise<{ facts: RepoFacts } | { error: string }> => {
  const observed = await readRepoLayout(exec, repoDir)

  if ('error' in observed) {
    return observed
  }

  const { layout } = observed
  const [head, symbolic, refs] = await Promise.all([
    runGitAllowFail(exec, ['rev-parse', '--verify', 'HEAD'], repoDir),
    runGitAllowFail(exec, ['symbolic-ref', '--quiet', '--short', 'HEAD'], repoDir),
    runGitAllowFail(exec, ['for-each-ref', '--format=%(objectname) %(refname)'], repoDir),
  ])

  if (refs.exitCode !== 0) {
    return {
      error: `git for-each-ref failed: ${(refs.stderr.trim() || '(no output)').split('\n').join(' ')}`,
    }
  }

  // A bare repo has no index and no working tree; `git ls-files -s` there
  // silently returns NOTHING (exit 0), which would read as "no files" against a
  // restored copy that has a full checkout. Its content is proven by HEAD and
  // the ref set instead. Bareness is OBSERVED, so a repo whose config merely
  // CLAIMS to be bare is still compared file by file.
  const listed = layout.bare
    ? null
    : await runGitAllowFail(exec, [...layout.workTree, 'ls-files', '-s', '-z'], repoDir)

  if (listed !== null && listed.exitCode !== 0) {
    return {
      error: `git ls-files -s failed: ${(listed.stderr.trim() || '(no output)').split('\n').join(' ')}`,
    }
  }

  const files =
    listed === null ? null : listed.stdout.split('\0').filter((entry) => entry.trim() !== '')
  const status = layout.bare ? null : await readStatus(exec, repoDir, layout.workTree)

  if (status !== null && 'failure' in status) {
    // A status that did not run must never be read as "the tree is clean" —
    // that is precisely the uncommitted work this gate exists to notice.
    return { error: describeStatusFailure(status.failure) }
  }

  return {
    facts: {
      bare: layout.bare,
      gitDir: layout.gitDir,
      detachedWorkTree: layout.detachedWorkTree,
      headSha: head.exitCode === 0 ? head.stdout.trim() || null : null,
      head: symbolic.exitCode === 0 ? `branch:${symbolic.stdout.trim()}` : 'detached',
      refs: refs.stdout.split('\n').filter((line) => line.trim() !== ''),
      files,
      status: status === null ? null : status.status.entries,
      unattestable:
        options.workingTree && !layout.bare
          ? await readUnattestablePaths(exec, repoDir, layout.workTree)
          : [],
      lostModes:
        options.workingTree && files !== null ? await readLostModes(exec, repoDir, files) : [],
    },
  }
}

/**
 * Reports whether a repository provably holds NOTHING — no refs, no commits,
 * and (for a working tree) no uncommitted or untracked files.
 *
 * This is the one judgement the coverage check makes, and it exists because
 * `git bundle create` REFUSES to bundle such a repo ("Refusing to create empty
 * bundle") and writes no file: an empty `git init --bare` mirror, the normal
 * state of a mirror nothing has been pushed to yet, therefore cannot appear in
 * `restored` no matter how carefully the caller archives. Reporting it as
 * unarchived would block the release of a workspace that has lost nothing.
 *
 * It fails CLOSED in every uncertain case: a directory git will not open, a
 * command that errors, an executor that dies — all answer "not provably empty",
 * so the repo is reported and the operator looks. The status it reads is the
 * hermetic one, because a repo configured not to mention its untracked files
 * would otherwise be "proven" empty while holding a directory of user work.
 *
 * @param exec - The injected git executor.
 * @param repoDir - Absolute path of the directory to test.
 * @returns True only when git confirms there is nothing there to archive.
 */
const isProvablyEmptyRepo = async (exec: GitExec, repoDir: string): Promise<boolean> => {
  try {
    const refs = await runGitAllowFail(
      exec,
      ['for-each-ref', '--count=1', '--format=%(refname)'],
      repoDir,
    )

    if (refs.exitCode !== 0 || refs.stdout.trim() !== '') {
      return false
    }

    const head = await runGitAllowFail(exec, ['rev-parse', '--verify', 'HEAD'], repoDir)

    if (head.exitCode === 0) {
      return false
    }

    const observed = await readRepoLayout(exec, repoDir)

    if ('error' in observed) {
      return false
    }

    if (observed.layout.bare) {
      // A bare repo with no refs holds nothing — unless a working tree is
      // configured elsewhere, which this directory cannot show us.
      return observed.layout.detachedWorkTree === null
    }

    // A working tree with no commits can still hold uncommitted files, which are
    // exactly the work an archive would lose.
    const status = await readStatus(exec, repoDir, observed.layout.workTree)

    return !('failure' in status) && status.status.entries.length === 0
  } catch (_error) {
    // Documented noop: the executor could not run git in that directory at all,
    // which is the definition of "not provably empty" — the caller reports it.
    return false
  }
}

/**
 * Splits `<sha> <refname>` lines into a name→sha map.
 *
 * @param lines - `for-each-ref` output lines.
 * @returns Ref name to object name.
 */
const toRefMap = (lines: readonly string[]): Map<string, string> => {
  const refs = new Map<string, string>()

  for (const line of lines) {
    const space = line.indexOf(' ')

    if (space > 0) {
      refs.set(line.slice(space + 1), line.slice(0, space))
    }
  }

  return refs
}

/**
 * Splits `git ls-files -s` records into a path→`<mode> <sha> <stage>` map.
 *
 * @param lines - `ls-files -s -z` records.
 * @returns File path to its mode/blob/stage triple.
 */
const toFileMap = (lines: readonly string[]): Map<string, string> => {
  const files = new Map<string, string>()

  for (const line of lines) {
    const tab = line.indexOf('\t')

    if (tab > 0) {
      files.set(line.slice(tab + 1), line.slice(0, tab))
    }
  }

  return files
}

/**
 * Converts an absolute path into the workspace-relative POSIX form used by
 * {@link ArchivedRepo.repoPath}.
 *
 * @param workspaceRoot - Root the path is relative to.
 * @param absolutePath - Path to convert.
 * @returns The relative POSIX path, '.' for the root itself, or null when the
 *   path is not inside the workspace at all.
 */
const toWorkspacePath = (workspaceRoot: string, absolutePath: string): string | null => {
  const relativePath = relative(workspaceRoot, absolutePath)

  if (relativePath === '') {
    return '.'
  }

  // `..foo` is a legitimate directory name, so the escape test is the exact one:
  // the relative path IS `..`, starts with `../`, or is absolute (a different
  // drive/root entirely).
  if (isAbsolute(relativePath) || relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
    return null
  }

  return relativePath.split(sep).join('/')
}

/**
 * Reports whether a candidate path is git's OWN administrative storage rather
 * than a repository root of its own.
 *
 * Only two things qualify, both of which belong to a repository that IS
 * enumerated elsewhere: a repository's own git dir (reported at its parent, via
 * the `.git` name match), and the submodule/linked-worktree admin directories
 * listed in {@link GIT_OWNED_SUBDIRECTORIES}. A repository parked anywhere else
 * inside a `.git` directory is NOT git's own storage: no bundle covers it, and
 * releasing the workspace deletes it — so it is reported.
 *
 * @param path - Workspace-relative candidate path.
 * @returns True when the path is git's own storage for a repository reported elsewhere.
 */
const isGitOwnedPath = (path: string): boolean => {
  const segments = path.split('/')

  if (segments[segments.length - 1] === '.git') {
    return true
  }

  const gitIndex = segments.indexOf('.git')

  return (
    gitIndex !== -1 &&
    GIT_OWNED_SUBDIRECTORIES.includes(
      (segments[gitIndex + 1] ?? '') as (typeof GIT_OWNED_SUBDIRECTORIES)[number],
    )
  )
}

/**
 * Escapes a path so that `find -path` matches it LITERALLY.
 *
 * `-path` takes an fnmatch PATTERN, not a string: measured (GNU find 4.9), a
 * workspace root containing `[`, `*` or `?` never matches itself, which would
 * make the walk's completion sentinel look like a truncated walk and block a
 * release over a directory NAME. A backslash escapes the next character in
 * fnmatch, and find does not disable that.
 *
 * @param path - Absolute path to match literally.
 * @returns The path as an fnmatch pattern matching only itself.
 */
const toLiteralFindPattern = (path: string): string =>
  path.replace(/[\\*?[\]]/g, (character) => `\\${character}`)

/** What the INDEPENDENT enumeration saw. */
interface Enumeration {
  /** Workspace-relative paths of every directory that looks like a repository root. */
  repoPaths: Set<string>
  /** Non-fatal trouble (an unreadable subtree, a truncated walk), or null when the walk was clean. */
  incomplete: string | null
}

/**
 * Finds every repository in the workspace WITHOUT reusing `discoverRepos`.
 *
 * This is the point of the whole gate. `discoverRepos` decides what a repository
 * is by walking with `node:fs` and asking git about each candidate; every round
 * of review has found a new shape it mishandled (a bare repo with no `.git`
 * entry, a bare-shaped directory git rejected, a dangling-symlink look-alike, a
 * mirror whose `refs/` directory did not survive a zip), and the next one is
 * always one deletion away. So the archive is checked against a SECOND, DUMBER
 * enumeration that shares none of that logic: `find`, run through the injected
 * executor, matching on names only — `.git` (a working tree, whether `.git` is a
 * directory, a file, or a symlink) and `HEAD` + `objects` in one directory (a
 * bare repo, see {@link BARE_MARKERS}).
 *
 * Deliberately NOT applied here: `skipDirs`, `maxDepth`, and every other
 * judgement call. A repository inside `node_modules` is not archived, so this
 * reports it — "we chose not to look there" is exactly the assumption the gate
 * exists to stop trusting.
 *
 * THE WALK PROVES ITS OWN COMPLETENESS. `find` is asked (with `-depth`, so the
 * start directory comes LAST) to print the workspace root as well, and the walk
 * is trusted only when its final record is exactly that path. An executor that
 * caps or truncates stdout — a plausible sandbox — would otherwise return a
 * short list with exit 0, and a short list reads as "nothing else is unarchived".
 *
 * Symlinks are not followed (`find` without `-L`), matching both `discoverRepos`
 * and an `rm -rf` release, which does not delete through a link either.
 *
 * @param exec - The injected git executor.
 * @param workspaceRoot - Absolute path of the workspace root.
 * @returns Every repository path found, plus whether the walk itself was clean.
 */
const enumerateRepos = async (exec: GitExec, workspaceRoot: string): Promise<Enumeration> => {
  const found = await runProgram(exec, 'find', [
    workspaceRoot,
    // Depth-first, so the start directory is emitted LAST and can serve as the
    // proof that the whole walk arrived.
    '-depth',
    '(',
    '-name',
    '.git',
    '-o',
    '-name',
    'HEAD',
    '-o',
    '-name',
    'objects',
    '-o',
    '-path',
    toLiteralFindPattern(workspaceRoot),
    ')',
    '-print0',
  ])
  const records = found.stdout.split('\0').filter((entry) => entry !== '')
  const repoPaths = new Set<string>()
  const bareMarkers = new Map<string, Set<string>>()

  for (const entry of records) {
    const workspacePath = toWorkspacePath(workspaceRoot, entry)

    // '.' is the workspace root itself — the walk's own completion sentinel, and
    // not a marker inside anything.
    if (workspacePath === null || workspacePath === '.') {
      continue
    }

    const segments = workspacePath.split('/')
    const name = segments[segments.length - 1] as string
    const parentSegments = segments.slice(0, -1)
    const parentPath = parentSegments.length === 0 ? '.' : parentSegments.join('/')

    if (name === '.git') {
      if (!isGitOwnedPath(parentPath)) {
        repoPaths.add(parentPath)
      }

      continue
    }

    if (isGitOwnedPath(parentPath)) {
      continue
    }

    const markers = bareMarkers.get(parentPath) ?? new Set<string>()

    markers.add(name)
    bareMarkers.set(parentPath, markers)
  }

  for (const [path, markers] of bareMarkers) {
    if (BARE_MARKERS.every((marker) => markers.has(marker))) {
      repoPaths.add(path)
    }
  }

  const truncated = records[records.length - 1] !== workspaceRoot

  return {
    repoPaths,
    incomplete:
      found.exitCode !== 0
        ? `find exited ${found.exitCode}: ${(found.stderr.trim() || '(no output)').split('\n').join(' ')}`
        : truncated
          ? `the walk's output did not end with its own start path (${workspaceRoot}), so it was ` +
            `truncated in transit — the executor capped it, and an incomplete list of repositories ` +
            `would read as "nothing else is unarchived"`
          : null,
  }
}

/**
 * Throws unless a path is a directory this executor can see.
 *
 * Doubles as the proof that the enumeration mechanism itself works: if `find`
 * (or a shell) is missing from the environment, this fails LOUDLY here rather
 * than letting {@link enumerateRepos} return an empty set that would read as
 * "there are no unarchived repositories".
 *
 * @param exec - The injected git executor.
 * @param path - Absolute path that must be a readable directory.
 * @param label - Parameter name, for the error message.
 * @returns Nothing; returns normally when the path is a directory.
 * @throws {Error} When the path is not a directory, or cannot be probed at all.
 */
const assertDirectory = async (exec: GitExec, path: string, label: string): Promise<void> => {
  const probe = await runProgram(exec, 'find', [path, '-maxdepth', '0', '-type', 'd', '-print'])

  if (probe.exitCode !== 0 || probe.stdout.trim() === '') {
    throw new Error(
      `cannot verify workspace reconstruction: ${label} ${path} could not be confirmed as a ` +
        `readable directory (${(probe.stderr.trim() || probe.stdout.trim() || '(no output)').split('\n').join(' ')}). ` +
        `This check needs a working 'find' in the executor's environment — without it the ` +
        `independent enumeration would silently report that nothing is unarchived.`,
    )
  }
}

/**
 * Reports whether an unarchived path is part of an ARCHIVED BARE repository's own
 * object store.
 *
 * A bare repository's internals are not a second repository — but that must be
 * decided by asking GIT which repository the path belongs to, not by a path
 * prefix. Measured: a blanket "everything under a bare repo is covered" rule
 * (and, worse, a workspace ROOT that is bare, for which the prefix matched
 * EVERYTHING) turned the entire coverage check into a no-op: a real repository
 * sitting inside a mirror directory, and every repository in a bare-rooted
 * workspace, were silently skipped and the gate said `ok: true`.
 *
 * So a path is skipped only when it is inside the archived bare repository AND
 * `git rev-parse --absolute-git-dir` there answers with that same bare
 * repository's git dir. A real repository nested under a mirror answers with its
 * OWN git dir and is reported. Anything git will not answer for is reported too.
 *
 * @param exec - The injected git executor.
 * @param workspaceRoot - Absolute path of the workspace root.
 * @param repoPath - Workspace-relative path being judged.
 * @param archivedBareRepos - Archived BARE repos, by workspace path, to their git dirs.
 * @returns True only when git says the path belongs to one of those bare repositories.
 */
const belongsToArchivedBareRepo = async (
  exec: GitExec,
  workspaceRoot: string,
  repoPath: string,
  archivedBareRepos: ReadonlyMap<string, string>,
): Promise<boolean> => {
  const enclosing = [...archivedBareRepos].filter(
    ([barePath]) => barePath === '.' || repoPath.startsWith(`${barePath}/`),
  )

  if (enclosing.length === 0) {
    return false
  }

  const gitDir = await runGitAllowFail(
    exec,
    ['rev-parse', '--absolute-git-dir'],
    join(workspaceRoot, repoPath),
  )

  if (gitDir.exitCode !== 0) {
    return false
  }

  const answer = gitDir.stdout.trim()

  return enclosing.some(([, bareGitDir]) => bareGitDir === answer)
}

/**
 * PROVES THE ARCHIVE REBUILDS THE WORKSPACE — the only check that may precede
 * releasing it.
 *
 * Every other signal in this package answers a narrower question and can be
 * wrong in the fatal direction if discovery misunderstood something: a repo shape
 * the walk did not recognise is a repo that is never bundled, and no per-bundle
 * check can notice a bundle that was never made. This one does not trust
 * discovery at all. It ENUMERATES the workspace again by a different mechanism
 * (`find`, see {@link enumerateRepos}) and RESTORES every bundle for real,
 * comparing it against the repository it claims to hold. An edge case nobody has
 * thought of therefore degrades to "the comparison failed, so we did not delete"
 * instead of "we deleted something we never archived".
 *
 * IT RUNS EVERY COMMAND ON PINNED CONFIGURATION, because the repository being
 * inspected configures the inspector. `status.showUntrackedFiles=no` — an
 * ordinary large-repo performance setting — makes `git status --porcelain` print
 * nothing about untracked files, which silenced BOTH the checkpoint and this
 * gate at once: a workspace missing a whole new feature directory reported
 * `ok: true`. `core.excludesFile`, `core.fsmonitor`, `core.hooksPath`,
 * `core.attributesFile`, `core.quotePath` and friends are the same shape of
 * problem. See {@link HERMETIC_CONFIG} for the full list and the reasoning.
 *
 * What is compared, per archived repo:
 *
 * - **HEAD commit** — `git rev-parse --verify HEAD` on both sides.
 * - **HEAD state** — on the same branch, or detached, or unborn. A restore that
 *   lands on a branch merely sharing HEAD's commit is reported, because the next
 *   commit there would advance a branch the source never moved.
 * - **The full ref set** — `git for-each-ref`: every branch, tag, note, stash and
 *   remote-tracking ref, by name AND object. One entry per differing ref.
 * - **The complete tracked-content fingerprint** — `git ls-files -s`, which
 *   carries mode + blob sha + path for EVERY tracked file. One entry per
 *   differing path (capped at {@link MAX_REPORTED_FILES} per repo, with the
 *   remainder counted). A bare source has neither index nor working tree, so its
 *   content is proven by HEAD and the ref set alone — and "bare" is OBSERVED
 *   (the directory IS the git dir), never taken from `core.bare`, which is a
 *   claim any repository can make and which disabled both content checks.
 * - **Uncommitted work** — `git status --porcelain -uall` on the live repo.
 *   Anything it reports is work no bundle carries; the pipeline's
 *   `checkpointRepo` step should have committed it, so anything left means that
 *   step was skipped or failed.
 * - **Content the checks CANNOT SEE** — a `skip-worktree`/`assume-unchanged`
 *   index bit makes git report the index and ignore the file on disk, so both
 *   sides agree while the bytes differ; the executable bit of a tracked file in a
 *   repo that ignores modes (`core.fileMode=false`) is in no bundle. Both are
 *   reported rather than assumed harmless.
 *
 * Then, from the independent enumeration: every repository path the archive does
 * NOT cover is reported as `unarchived-repo` — unless git PROVES it holds
 * nothing (no refs, no commits, no uncommitted files), because `git bundle
 * create` refuses to write an empty bundle, so an empty mirror could not have
 * been archived by anyone, or unless git says the path is part of an archived
 * BARE repository's own object store — and every archived repo the enumeration
 * did NOT see is reported as `enumeration-incomplete`, as is a walk that did not
 * arrive whole: a mechanism that cannot even find the repos we know about has not
 * proven anything.
 *
 * WHAT IT DOES NOT COVER, stated plainly so nobody reads more into an `ok: true`
 * than it says: this is GIT-based archival, so the unit of proof is a
 * REPOSITORY, and the unit of transport is a BUNDLE.
 *
 * - Content that belongs to no repository — loose files in a workspace whose root
 *   is not itself a repo — is not archived by this package and is not accounted
 *   for here.
 * - `.gitignore`d files are outside it too, by design: they are reproducible
 *   (`node_modules/`, `dist/`) or re-assembled from the control-plane vault
 *   (`.env*`). Note the gate DOES defeat host-level ignore configuration
 *   (`core.excludesFile`), so a file ignored only by the HOST is reported.
 * - The GIT DIR's own contents, which no bundle carries and no restore
 *   reproduces: hooks (`.git/hooks/*` or a `core.hooksPath` tree), the repo's
 *   `config` and its remotes (re-add them from the captured
 *   `DiscoveredRepo.remotes`), `.git/info/exclude`, reflogs (and therefore every
 *   stash below the top one), and `.git/lfs/objects`. A caller that needs those
 *   must copy them separately. A whole REPOSITORY parked inside a `.git`
 *   directory is a different matter and IS reported — only git's own submodule
 *   and linked-worktree admin dirs are exempt, and those belong to repositories
 *   enumerated at their working trees.
 *
 * The bundles are restored into `scratchDir` and LEFT THERE, so a caller can
 * inspect any difference before deciding. This package deletes nothing, ever.
 *
 * COST: this restores every bundle, so it takes about as long as the archive did
 * and needs room for a full checkout of every repo. That is the price of not
 * guessing.
 *
 * @param exec - The injected git executor.
 * @param workspaceRoot - Absolute path of the workspace about to be released.
 * @param restored - Every repo that was archived, as `{ repoPath, bundlePath }`.
 *   `repoPath` is the workspace-relative path discovery reported ('.' for the
 *   root); `bundlePath` is the bundle written for it.
 * @param scratchDir - Absolute path of an EMPTY directory to restore into. Each
 *   repo gets its own subdirectory; the caller owns and removes it. Reusing a
 *   populated scratch directory makes every restore fail.
 * @returns The report. `ok` is true ONLY when nothing differed and nothing was
 *   left unarchived. A CALLER MUST NOT RELEASE, DELETE, OR OVERWRITE THE
 *   WORKSPACE UNLESS `ok === true` AND `mismatches` IS EMPTY — every mismatch is
 *   work that would not come back.
 * @throws {Error} Only for a broken PRECONDITION: `workspaceRoot` or
 *   `scratchDir` is not a readable directory, or the executor's environment has
 *   no `find` to enumerate with. A mismatch is never thrown — it is reported, so
 *   the caller sees every problem at once instead of the first one.
 */
export async function verifyWorkspaceReconstruction(
  exec: GitExec,
  workspaceRoot: string,
  restored: readonly ArchivedRepo[],
  scratchDir: string,
): Promise<ReconstructionReport> {
  await assertDirectory(exec, workspaceRoot, 'workspaceRoot')
  await assertDirectory(exec, scratchDir, 'scratchDir')

  const mismatches: ReconstructionMismatch[] = []
  const archivedBareRepos = new Map<string, string>()
  const archivedPaths = new Set(restored.map((entry) => entry.repoPath))
  let checkedRepos = 0

  for (const archived of restored) {
    const { repoPath, bundlePath } = archived
    const liveDir = repoPath === '.' ? workspaceRoot : join(workspaceRoot, repoPath)
    const live = await readRepoFacts(exec, liveDir, { workingTree: true })

    if ('error' in live) {
      mismatches.push({
        kind: RECONSTRUCTION_MISMATCH_KINDS.unverifiableRepo,
        path: repoPath,
        detail:
          `the live repository at ${liveDir} could not be inspected (${live.error}), so its ` +
          `bundle ${bundlePath} could not be compared against anything`,
      })

      continue
    }

    if (live.facts.bare) {
      archivedBareRepos.set(repoPath, live.facts.gitDir)
    }

    // `encodeURIComponent` leaves '.' alone, so the workspace root would restore
    // ON TOP of scratchDir itself; '%2E' is a form encodeURIComponent never
    // produces for any other path, so it cannot collide with a real repo name.
    const destination = join(scratchDir, repoPath === '.' ? '%2E' : encodeURIComponent(repoPath))

    try {
      // Restored exactly the way the documented pipeline restores, so a
      // difference here is a difference a real recovery would hit — including
      // the HEAD state, which no bundle records.
      await restoreRepo(exec, bundlePath, destination, {
        ...(live.facts.head === 'detached' && live.facts.headSha !== null
          ? { detachedHead: true }
          : {}),
        ...(live.facts.head === 'detached'
          ? {}
          : { headBranch: live.facts.head.slice('branch:'.length) }),
      })
    } catch (error) {
      mismatches.push({
        kind: RECONSTRUCTION_MISMATCH_KINDS.bundleUnrestorable,
        path: repoPath,
        detail: `${bundlePath} did not restore into ${destination}: ${(error as Error).message}`,
      })

      continue
    }

    const copy = await readRepoFacts(exec, destination, { workingTree: false })

    if ('error' in copy) {
      mismatches.push({
        kind: RECONSTRUCTION_MISMATCH_KINDS.bundleUnrestorable,
        path: repoPath,
        detail: `the repository restored from ${bundlePath} could not be inspected (${copy.error})`,
      })

      continue
    }

    checkedRepos += 1

    if (live.facts.headSha !== copy.facts.headSha) {
      mismatches.push({
        kind: RECONSTRUCTION_MISMATCH_KINDS.headMismatch,
        path: repoPath,
        detail: `HEAD is ${live.facts.headSha ?? '(unborn)'} in the workspace but ${copy.facts.headSha ?? '(unborn)'} in the archive`,
      })
    }

    if (live.facts.head !== copy.facts.head) {
      mismatches.push({
        kind: RECONSTRUCTION_MISMATCH_KINDS.headMismatch,
        path: repoPath,
        detail:
          `HEAD is '${live.facts.head}' in the workspace but '${copy.facts.head}' in the archive — ` +
          `the commits match, but a restore would put the user on a different branch`,
      })
    }

    const liveRefs = toRefMap(live.facts.refs)
    const copyRefs = toRefMap(copy.facts.refs)

    for (const [name, sha] of liveRefs) {
      const archivedSha = copyRefs.get(name)

      if (archivedSha === undefined) {
        mismatches.push({
          kind: RECONSTRUCTION_MISMATCH_KINDS.refMismatch,
          path: repoPath,
          detail: `${name} (${sha}) exists in the workspace but NOT in the archive`,
        })
      } else if (archivedSha !== sha) {
        mismatches.push({
          kind: RECONSTRUCTION_MISMATCH_KINDS.refMismatch,
          path: repoPath,
          detail: `${name} is ${sha} in the workspace but ${archivedSha} in the archive`,
        })
      }
    }

    for (const [name, sha] of copyRefs) {
      if (!liveRefs.has(name)) {
        mismatches.push({
          kind: RECONSTRUCTION_MISMATCH_KINDS.refMismatch,
          path: repoPath,
          detail: `${name} (${sha}) exists in the archive but NOT in the workspace`,
        })
      }
    }

    const inRepo = (path: string): string => (repoPath === '.' ? path : `${repoPath}/${path}`)

    if (live.facts.files !== null && copy.facts.files !== null) {
      const liveFiles = toFileMap(live.facts.files)
      const copyFiles = toFileMap(copy.facts.files)
      const differing: { path: string; detail: string }[] = []

      for (const [path, entry] of liveFiles) {
        const archivedEntry = copyFiles.get(path)

        if (archivedEntry === undefined) {
          differing.push({
            path,
            detail: `tracked in the workspace (${entry}) but NOT in the archive`,
          })
        } else if (archivedEntry !== entry) {
          differing.push({
            path,
            detail: `is '${entry}' in the workspace but '${archivedEntry}' in the archive (mode, content, or stage differs)`,
          })
        }
      }

      for (const [path, entry] of copyFiles) {
        if (!liveFiles.has(path)) {
          differing.push({
            path,
            detail: `in the archive (${entry}) but NOT tracked in the workspace`,
          })
        }
      }

      for (const path of live.facts.lostModes) {
        differing.push({
          path,
          detail:
            `is EXECUTABLE in the workspace but the index records a non-executable mode, and this ` +
            `repository ignores mode changes (core.fileMode=false), so the bit is in no bundle and ` +
            `the restored file would not be executable`,
        })
      }

      for (const difference of differing.slice(0, MAX_REPORTED_FILES)) {
        mismatches.push({
          kind: RECONSTRUCTION_MISMATCH_KINDS.contentMismatch,
          path: inRepo(difference.path),
          detail: difference.detail,
        })
      }

      if (differing.length > MAX_REPORTED_FILES) {
        mismatches.push({
          kind: RECONSTRUCTION_MISMATCH_KINDS.contentMismatch,
          path: repoPath,
          detail: `…and ${differing.length - MAX_REPORTED_FILES} further tracked file(s) differ (${differing.length} in total)`,
        })
      }
    }

    for (const path of live.facts.unattestable.slice(0, MAX_REPORTED_FILES)) {
      mismatches.push({
        kind: RECONSTRUCTION_MISMATCH_KINDS.unattestableContent,
        path: inRepo(path),
        detail:
          `this tracked file carries a skip-worktree or assume-unchanged index bit, so git reports ` +
          `its INDEX entry and never looks at the file on disk: neither git status nor ls-files can ` +
          `show what it actually contains, and the archive holds only the committed version. Clear ` +
          `the bit (git update-index --no-skip-worktree --no-assume-unchanged -- <path>) and archive ` +
          `again, or confirm the working-tree copy is expendable.`,
      })
    }

    if (live.facts.unattestable.length > MAX_REPORTED_FILES) {
      mismatches.push({
        kind: RECONSTRUCTION_MISMATCH_KINDS.unattestableContent,
        path: repoPath,
        detail: `…and ${live.facts.unattestable.length - MAX_REPORTED_FILES} further file(s) carry a skip-worktree or assume-unchanged bit (${live.facts.unattestable.length} in total)`,
      })
    }

    if (live.facts.detachedWorkTree !== null) {
      // git resolves a relative `core.worktree` against the git dir. When that
      // tree is itself one of the archived repositories, it was inspected on its
      // own terms and nothing is unattested; otherwise this repo hides a working
      // tree from every check here.
      const workTreePath = toWorkspacePath(
        workspaceRoot,
        resolve(live.facts.gitDir, live.facts.detachedWorkTree),
      )

      if (workTreePath === null || !archivedPaths.has(workTreePath)) {
        mismatches.push({
          kind: RECONSTRUCTION_MISMATCH_KINDS.unattestableContent,
          path: repoPath,
          detail:
            `this repository IS its own git dir, but it configures a working tree elsewhere ` +
            `(core.worktree=${live.facts.detachedWorkTree}) — that tree was not inspected here, no ` +
            `bundle carries its uncommitted state, and no archived repository covers it`,
        })
      }
    }

    if (live.facts.status !== null && live.facts.status.length > 0) {
      mismatches.push({
        kind: RECONSTRUCTION_MISMATCH_KINDS.uncommittedWork,
        path: repoPath,
        detail:
          `the live repository has ${live.facts.status.length} uncommitted or untracked change(s) that no bundle ` +
          `carries (${live.facts.status.slice(0, MAX_REPORTED_FILES).join('; ')}) — checkpointRepo did not run, ` +
          `or did not finish`,
      })
    }
  }

  const enumeration = await enumerateRepos(exec, workspaceRoot)

  if (enumeration.incomplete !== null) {
    mismatches.push({
      kind: RECONSTRUCTION_MISMATCH_KINDS.enumerationIncomplete,
      path: '.',
      detail:
        `the independent enumeration of ${workspaceRoot} did not complete (${enumeration.incomplete}), ` +
        `so it cannot be said that every repository was archived`,
    })
  }

  for (const repoPath of archivedPaths) {
    if (!enumeration.repoPaths.has(repoPath)) {
      mismatches.push({
        kind: RECONSTRUCTION_MISMATCH_KINDS.enumerationIncomplete,
        path: repoPath,
        detail:
          `the independent enumeration did not find this archived repository, so it is not ` +
          `finding repositories at all — its report that nothing else is unarchived cannot be trusted`,
      })
    }
  }

  for (const repoPath of [...enumeration.repoPaths].sort()) {
    if (archivedPaths.has(repoPath)) {
      continue
    }

    // Git's own answer, not a path prefix: everything below an archived BARE
    // repo that git attributes to THAT repo is its object store and is archived
    // with it. A real repository nested under a mirror is not.
    if (await belongsToArchivedBareRepo(exec, workspaceRoot, repoPath, archivedBareRepos)) {
      continue
    }

    // Nothing to archive is not the same as something unarchived: git refuses to
    // bundle a repository with no refs at all, so an empty mirror can never
    // appear in `restored`. Anything less than PROVABLY empty is reported.
    if (
      await isProvablyEmptyRepo(
        exec,
        repoPath === '.' ? workspaceRoot : join(workspaceRoot, repoPath),
      )
    ) {
      continue
    }

    mismatches.push({
      kind: RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo,
      path: repoPath,
      detail:
        `a repository at this path was found by the gate's own filesystem enumeration but NO bundle ` +
        `covers it. Releasing the workspace would delete it — archive it, or prove it holds nothing`,
    })
  }

  return { ok: mismatches.length === 0, mismatches, checkedRepos }
}
