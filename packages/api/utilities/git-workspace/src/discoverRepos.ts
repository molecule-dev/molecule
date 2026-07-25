/**
 * Workspace repository discovery.
 *
 * @module
 */

import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'

import { runGit, runGitAllowFail } from './git.js'
import { readRepoLayout } from './layout.js'
import { realPath } from './shell.js'
import { describeStatusFailure, readStatus } from './status.js'
import {
  DEFAULT_SKIP_DIRS,
  type DiscoveredRepo,
  type DiscoverOptions,
  type GitExec,
  type GitRemote,
  type RepoDiscovery,
  UNREADABLE_REASONS,
  type UnreadableRepo,
} from './types.js'

/** Directory depth searched below the workspace root when none is supplied. */
const DEFAULT_MAX_DEPTH = 6

/**
 * Depth searched INSIDE a skipped directory, purely to report the repositories
 * hiding there (never to archive them).
 *
 * Two levels reaches `node_modules/<pkg>/.git` and `node_modules/@scope/<pkg>/.git`
 * — the shapes a vendored checkout actually takes — for the cost of one readdir
 * per direct child. Going deeper would reintroduce exactly the walk cost the
 * skip list exists to avoid.
 */
const SKIPPED_PROBE_DEPTH = 2

/**
 * Converts an absolute path into the workspace-relative POSIX form used by
 * {@link DiscoveredRepo.path}.
 *
 * @param workspaceRoot - Root the path is relative to.
 * @param absolutePath - The path to convert.
 * @returns A POSIX relative path, or '.' for the workspace root itself.
 */
const toWorkspacePath = (workspaceRoot: string, absolutePath: string): string => {
  const relativePath = relative(workspaceRoot, absolutePath)

  return relativePath === '' ? '.' : relativePath.split(sep).join('/')
}

/**
 * Parses `git remote -v` output.
 *
 * Output is two lines per remote (`<name>\t<url> (fetch)` then `(push)`); the
 * fetch line comes first, so first-wins keeps the fetch URL while still
 * capturing a push-only remote.
 *
 * @param stdout - Raw stdout of `git remote -v`.
 * @returns One entry per remote, in git's order.
 */
const parseRemotes = (stdout: string): GitRemote[] => {
  const remotes = new Map<string, string>()

  for (const line of stdout.split('\n')) {
    const tab = line.indexOf('\t')

    if (tab <= 0) {
      continue
    }

    const name = line.slice(0, tab)
    const url = line.slice(tab + 1).replace(/\s+\((?:fetch|push)\)\s*$/, '')

    if (url && !remotes.has(name)) {
      remotes.set(name, url)
    }
  }

  return [...remotes].map(([name, url]) => ({ name, url }))
}

/**
 * Reports whether a directory's OWN entries have the shape of a BARE repository:
 * a `HEAD` file beside an `objects/` directory.
 *
 * A bare repo has no `.git` entry, so matching on `.git` alone made every
 * `git init --bare` mirror in a workspace INVISIBLE. Invisible is the one
 * outcome this package cannot have: a caller obeying the documented contract
 * ("`unreadable` is empty => release") then deletes it.
 *
 * `refs/` is deliberately NOT required, although `git`'s own
 * `is_git_directory()` checks for it. A mirror that has been packed (`git gc`,
 * `git pack-refs --all` — the normal state of an idle mirror) keeps its refs in
 * the `packed-refs` FILE, and the then-empty `refs/` directory does not survive a
 * round trip through anything that cannot represent an empty directory: a zip,
 * an object-storage key sync, `git archive`, some rsync and Docker COPY paths.
 * Measured: such a directory, holding the only copy of a commit, was nominated by
 * nobody. Git will not open it either (so it is reported as a look-alike rather
 * than as a repo, and the reconstruction gate reports it as `unarchived-repo`)
 * — but it is RECOVERABLE USER DATA, and being nominated is what stops a release
 * from deleting it.
 *
 * The shape is deliberately CHEAP and slightly generous (a symlinked `HEAD` or
 * `objects` still matches): it only nominates a CANDIDATE, and git itself gives
 * the authoritative answer in {@link describeRepo}, which rejects a look-alike
 * whose git dir resolves somewhere else.
 *
 * @param entries - The directory's entries, as returned with `withFileTypes`.
 * @returns True when the directory could be a bare repository.
 */
const looksLikeBareRepo = (entries: readonly Dirent[]): boolean => {
  let head = false
  let objects = false

  for (const entry of entries) {
    if (entry.name === 'HEAD' && (entry.isFile() || entry.isSymbolicLink())) {
      head = true
    } else if (entry.name === 'objects' && (entry.isDirectory() || entry.isSymbolicLink())) {
      objects = true
    }
  }

  return head && objects
}

/** A directory the walk nominated as a repository root. */
interface RepoCandidate {
  /** Absolute path of the candidate repo root. */
  dir: string
  /** Depth of `dir` below the workspace root, carried so a REJECTED candidate's subtree can still be searched. */
  depth: number
  /**
   * True when the directory was nominated by the BARE shape rather than by a
   * `.git` entry, so {@link describeRepo} must confirm it with git before
   * reporting it (a look-alike would otherwise be described as a duplicate of
   * whichever repository encloses it).
   */
  bareCandidate: boolean
}

/** A directory the walk has been asked to search. */
interface WalkSeed {
  /** Absolute path to search. */
  dir: string
  /** Depth of `dir` below the workspace root. */
  depth: number
  /**
   * False when `dir` itself must NOT be nominated as a repo root.
   *
   * Used to RE-SEARCH a bare-shaped directory git then rejected. The first pass
   * does not descend into a bare candidate (a real bare repo holds only git's
   * own storage), so a rejected one would take its whole subtree out of the
   * search with it — every repository below an interrupted `cp` of a mirror, or
   * below a directory that merely happens to hold `HEAD` beside `objects/`,
   * would be invisible. Nothing below a NON-repository may be dropped, so it is
   * searched on a second pass with nomination off (which also makes the loop
   * terminate: a rejected candidate can never re-nominate itself).
   */
  nominate: boolean
}

/** What the filesystem walk produced: candidate repo roots plus everything it could not see. */
interface WalkResult {
  /** Directories holding a `.git` entry, or shaped like a bare repository. */
  repoDirs: RepoCandidate[]
  /** Paths the walk refused to search or could not read. */
  unreadable: UnreadableRepo[]
}

/**
 * Classifies a symlinked entry the walk will not follow.
 *
 * Symlinks are never followed (that bounds the walk and stops it escaping the
 * workspace or looping), which makes a symlinked DIRECTORY a place the search
 * did not look. Whether that matters depends on where it points:
 *
 * - INSIDE the workspace — the walk reaches the real directory on its own, so
 *   nothing is unsearched and there is nothing to report.
 * - OUTSIDE the workspace, or unresolvable — never searched and never archived
 *   (the link itself is not a repository and no bundle carries it), so it is
 *   reported. Unresolvable fails closed: an unknown target cannot be assumed to
 *   be covered.
 *
 * @param exec - The injected git executor, used to canonicalise the link target.
 * @param workspaceRoot - Root the link is judged against.
 * @param linkPath - Absolute path of the symlinked entry.
 * @returns A reason to report, or null when the entry needs no report (it is not
 *   a directory, or its target is inside the workspace).
 */
const describeSymlinkedDirectory = async (
  exec: GitExec,
  workspaceRoot: string,
  linkPath: string,
): Promise<string | null> => {
  try {
    // readdir FOLLOWS the link, so success means "this is a directory" — the
    // only case worth reporting. A symlinked FILE cannot hide a repository.
    await readdir(linkPath)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    // Documented noop: not a directory (ENOTDIR), or a dangling link (ENOENT).
    // Neither can hide a repository, so neither is a gap in the search.
    if (code === 'ENOTDIR' || code === 'ENOENT') {
      return null
    }

    return (
      `${UNREADABLE_REASONS.symlinkedDirectory}: a symlink whose target could not be listed ` +
      `(${(error as Error).message}), so whatever it points at was NOT searched and will NOT be archived.`
    )
  }

  const [realRoot, realTarget] = await Promise.all([
    realPath(exec, workspaceRoot),
    realPath(exec, linkPath),
  ])

  if (realRoot !== null && realTarget !== null) {
    const relativePath = relative(realRoot, realTarget)

    if (
      relativePath === '' ||
      (!isAbsolute(relativePath) && relativePath !== '..' && !relativePath.startsWith(`..${sep}`))
    ) {
      // It points back into the workspace, so the walk searches the real
      // directory anyway — following the link would only archive it twice.
      return null
    }

    return (
      `${UNREADABLE_REASONS.symlinkedDirectory}: a symlinked directory pointing OUTSIDE the workspace ` +
      `(${realTarget}). Symlinks are never followed, so its contents were NOT searched and are NOT ` +
      `archived — the restored workspace will hold a dangling link. Archive the target separately, or ` +
      `confirm it holds no user work.`
    )
  }

  return (
    `${UNREADABLE_REASONS.symlinkedDirectory}: a symlinked directory whose target could not be resolved, ` +
    `so it cannot be shown to lie inside the workspace. It was NOT searched.`
  )
}

/**
 * Reports every repository hiding inside a SKIPPED directory.
 *
 * The directory is not searched for archival — that is what "skipped" means —
 * but a repository in it must be VISIBLE, because "we never looked there" and
 * "there was nothing there" are the two answers a caller must never confuse
 * before deleting a workspace.
 *
 * @param workspaceRoot - Root used to compute relative paths.
 * @param skippedDir - Absolute path of the skipped directory.
 * @param skippedName - The directory name that matched `skipDirs`.
 * @param unreadable - Collector appended to in place.
 * @returns Nothing; findings are pushed onto `unreadable`.
 */
const probeSkippedDirectory = async (
  workspaceRoot: string,
  skippedDir: string,
  skippedName: string,
  unreadable: UnreadableRepo[],
): Promise<void> => {
  const queue: { dir: string; depth: number }[] = [{ dir: skippedDir, depth: 0 }]

  while (queue.length > 0) {
    const { dir, depth } = queue.shift() as { dir: string; depth: number }
    let entries

    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code

      // Documented noop: the entry vanished (or stopped being a directory)
      // between being queued and being read — there is nothing left to report.
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        continue
      }

      unreadable.push({
        path: toWorkspacePath(workspaceRoot, dir),
        reason: `${UNREADABLE_REASONS.unreadableDirectory}: ${(error as Error).message}`,
      })

      continue
    }

    // A working tree (`.git` entry) OR a bare repository — both are repositories
    // that would otherwise be invisible inside a skipped tree.
    if (entries.some((entry) => entry.name === '.git') || looksLikeBareRepo(entries)) {
      unreadable.push({
        path: toWorkspacePath(workspaceRoot, dir),
        reason:
          `${UNREADABLE_REASONS.skippedDirectory}: a parent directory named '${skippedName}' is in skipDirs, ` +
          `so this repository was NOT searched and will NOT be archived. Re-run discoverRepos with a ` +
          `narrower skipDirs if it holds user work.`,
      })

      // A repo found here is reported, not descended into: the point is
      // visibility, not a second discovery pass through a dependency tree.
      continue
    }

    if (depth >= SKIPPED_PROBE_DEPTH) {
      continue
    }

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== '.git') {
        queue.push({ dir: join(dir, entry.name), depth: depth + 1 })
      }
    }
  }
}

/**
 * Walks the filesystem collecting every directory that is a repository root —
 * a WORKING TREE (a `.git` entry) or a BARE repository (the `HEAD` + `objects/`
 * shape).
 *
 * A FILESYSTEM walk is the whole point: `git ls-files`, `git status`, and every
 * other index-consulting command are blind to a nested repo the parent
 * GITIGNORES — which is precisely the polyrepo shape this package exists for.
 * The walk keeps descending after a working-tree hit, because a repo root
 * routinely contains further independent repos. It does NOT descend into a bare
 * repository: that directory IS an object store, so there is nothing below it
 * but git's own bookkeeping — the same reason `.git` is never entered.
 *
 * Nothing is dropped quietly: a directory that cannot be listed, a directory
 * skipped by name that turns out to hold a repository, a symlinked directory
 * pointing out of the workspace, and a subtree left unexplored at `maxDepth` are
 * all recorded in {@link WalkResult.unreadable}.
 *
 * @param exec - The injected git executor (used only to canonicalise symlinks).
 * @param workspaceRoot - Directory the walk is relative to; already proven readable.
 * @param skipDirs - Directory names never descended into.
 * @param maxDepth - Maximum depth below `workspaceRoot` to descend.
 * @param seeds - Directories to search, with the depth each sits at and whether
 *   it may itself be nominated as a repo root.
 * @returns Candidate repo roots (shallowest first) plus everything unseen.
 */
const findRepoDirs = async (
  exec: GitExec,
  workspaceRoot: string,
  skipDirs: ReadonlySet<string>,
  maxDepth: number,
  seeds: readonly WalkSeed[],
): Promise<WalkResult> => {
  const repoDirs: RepoCandidate[] = []
  const unreadable: UnreadableRepo[] = []
  const queue: WalkSeed[] = [...seeds]

  while (queue.length > 0) {
    const { dir, depth, nominate } = queue.shift() as WalkSeed
    let entries

    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code

      // Documented noop: the entry vanished (or stopped being a directory)
      // between being queued and being read — there is nothing left to
      // discover there.
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        continue
      }

      // Anything else (EACCES, EIO) could be hiding a repository, so it is
      // REPORTED rather than thrown away or allowed to abort the whole walk.
      unreadable.push({
        path: toWorkspacePath(workspaceRoot, dir),
        reason: `${UNREADABLE_REASONS.unreadableDirectory}: ${(error as Error).message}`,
      })

      continue
    }

    // `.git` may be a DIRECTORY (normal repo) or a FILE (linked worktree,
    // submodule) — matching on the name alone covers both, plus the rare
    // symlink, without an extra stat. `nominate` is false only when this
    // directory is being RE-searched after git rejected it as a repo root.
    if (nominate && entries.some((entry) => entry.name === '.git')) {
      repoDirs.push({ dir, depth, bareCandidate: false })
    } else if (nominate && looksLikeBareRepo(entries)) {
      // A BARE repository (`git init --bare`, the `<name>.git` mirror a team
      // pushes to). It has no `.git` entry, so it was invisible here until now —
      // and a CONFIRMED one is never descended into: every directory below it
      // (`objects/`, `refs/`, `hooks/`) is git's own storage, not user work. If
      // git REJECTS it, discoverRepos re-seeds this walk with nomination off so
      // the subtree is searched after all — see WalkSeed.nominate.
      repoDirs.push({ dir, depth, bareCandidate: true })

      continue
    }

    // `isDirectory()` is false for a symlink, so symlinked directories are
    // never followed: that bounds the walk and stops it escaping the
    // workspace (or looping) through a link. `.git` is skipped unconditionally
    // so a custom `skipDirs` can never descend into an object store.
    const descendable = entries.filter((entry) => entry.isDirectory() && entry.name !== '.git')

    // A symlinked directory is a place the walk will not look, so it is reported
    // unless it points back INTO the workspace (where the walk reaches the real
    // directory anyway). Two names are exempt: `.git`, whose parent is already
    // reported as a repo, and anything in `skipDirs` — a symlinked
    // `node_modules` is a directory the caller has already decided is not user
    // work, so reporting it would block a release over a dependency tree.
    for (const entry of entries) {
      if (!entry.isSymbolicLink() || entry.name === '.git' || skipDirs.has(entry.name)) {
        continue
      }

      const linkPath = join(dir, entry.name)
      const reason = await describeSymlinkedDirectory(exec, workspaceRoot, linkPath)

      if (reason !== null) {
        unreadable.push({ path: toWorkspacePath(workspaceRoot, linkPath), reason })
      }
    }

    if (depth >= maxDepth) {
      if (descendable.length > 0) {
        unreadable.push({
          path: toWorkspacePath(workspaceRoot, dir),
          reason:
            `${UNREADABLE_REASONS.depthLimit}: the walk stopped at maxDepth=${maxDepth} with ` +
            `${descendable.length} subdirector${descendable.length === 1 ? 'y' : 'ies'} unexplored, ` +
            `so this search was NOT exhaustive. Raise maxDepth to search deeper.`,
        })
      }

      continue
    }

    for (const entry of descendable) {
      if (skipDirs.has(entry.name)) {
        await probeSkippedDirectory(workspaceRoot, join(dir, entry.name), entry.name, unreadable)

        continue
      }

      queue.push({ dir: join(dir, entry.name), depth: depth + 1, nominate: true })
    }
  }

  return { repoDirs, unreadable }
}

/**
 * Collects the git-level facts about one repository.
 *
 * @param exec - The injected git executor.
 * @param workspaceRoot - Root used to compute the relative path.
 * @param repoDir - Absolute path of the repo root.
 * @param bareCandidate - True when the walk nominated this directory by the BARE
 *   shape rather than by a `.git` entry, so git must confirm the directory is
 *   itself the git dir before it is reported.
 * @returns The described repo, or null when `bareCandidate` was a look-alike
 *   that git resolved to some OTHER repository (an ordinary directory holding a
 *   `HEAD` file beside an `objects/` directory, inside a repo that encloses it).
 *   Reporting that would invent a duplicate of the enclosing repo, so it is not
 *   reported as a repo — and the caller RE-SEARCHES it, because a directory that
 *   is not a repository must never take its subtree out of the search.
 * @throws {Error} When git declines to open the directory as a repository, or
 *   when any of the describing commands fails. The caller turns that into an
 *   {@link UnreadableRepo} AND re-searches the directory — it is never swallowed,
 *   and it never removes a subtree.
 */
const describeRepo = async (
  exec: GitExec,
  workspaceRoot: string,
  repoDir: string,
  bareCandidate: boolean,
): Promise<DiscoveredRepo | null> => {
  const observed = await readRepoLayout(exec, repoDir)

  if ('error' in observed) {
    // Everything git can refuse for — "dubious ownership" under a bind mount
    // with a uid mismatch, EACCES, an unknown `extensions.*` written by a newer
    // git, a stale worktree pointer, a junk `.git` file — lands here. Dropping
    // it would hide an entire repository, so git's own message is carried out.
    // A bare-shaped directory git refuses is reported for exactly that reason:
    // it may be a real bare repo this process merely cannot open.
    throw new Error(`git rev-parse failed in ${repoDir}: ${observed.error}`)
  }

  const { layout } = observed

  if (bareCandidate && !layout.bare) {
    // Nominated by the bare SHAPE, but the directory is not its own git dir — so
    // git attributes it to the repository that ENCLOSES it. It is an ordinary
    // directory that merely holds a `HEAD` file beside an `objects/` directory
    // (an interrupted copy of a mirror, a fixture). Reporting it would invent a
    // duplicate of the enclosing repo, so the caller searches INSIDE it instead:
    // a non-repository must never take its subtree out of the search.
    return null
  }

  // Bareness is OBSERVED (the directory IS the git dir), never read from
  // `core.bare` — a claim that is wrong in both directions in the wild. See
  // {@link readRepoLayout} for the measurements.
  const bare = layout.bare

  // Non-zero here means an unborn HEAD (a fresh `git init` with no commits, or
  // an orphan checkout), which is a supported state, not a failure.
  const head = await runGitAllowFail(exec, ['rev-parse', '--verify', 'HEAD'], repoDir)
  const headSha = head.exitCode === 0 ? head.stdout.trim() || null : null

  // Non-zero here means a detached HEAD. Note this still resolves in a repo
  // with no commits, so a fresh repo reports its unborn branch name.
  const symbolicRef = await runGitAllowFail(
    exec,
    ['symbolic-ref', '--quiet', '--short', 'HEAD'],
    repoDir,
  )
  const branch = symbolicRef.exitCode === 0 ? symbolicRef.stdout.trim() || null : null

  const [remoteOutput, statusOutput] = await Promise.all([
    runGit(exec, ['remote', '-v'], repoDir),
    // A BARE repo has no working tree, so `git status` is not merely pointless
    // there — it exits 128 ("this operation must be run in a work tree"), which
    // would throw and turn the whole repository into an `unreadable` entry. It
    // is never run; `dirty` is false because there is nothing to be dirty.
    // Otherwise it goes through {@link readStatus}, which pins the configuration
    // that could silence it (`status.showUntrackedFiles`, `core.excludesFile`)
    // and retries with the repo's content filters neutralised — a broken
    // required filter (git-lfs with no binary) makes `git status` itself exit
    // 128, and without the retry that repo landed in `unreadable` and was never
    // returned at all, so `checkpointRepo`'s own filter retry was never reached
    // and nothing was ever bundled for it.
    // The repository's own .gitignore still applies: ignored files never appear,
    // so reproducible output (node_modules/, dist/) does not make a repo dirty.
    bare ? null : readStatus(exec, repoDir, layout.workTree),
  ])

  if (statusOutput !== null && 'failure' in statusOutput) {
    throw new Error(`${describeStatusFailure(statusOutput.failure)} (in ${repoDir})`)
  }

  const remotes = parseRemotes(remoteOutput.stdout)
  const remotesContainingHead: string[] = []

  // CACHED-LOCAL push detection, scanned PER CONFIGURED REMOTE. Scanning all of
  // `refs/remotes/` would report a repo whose remote was removed from config
  // (leaving stale tracking refs) as "on a remote" while `remotes` is empty;
  // this cannot. It still says nothing about what any remote holds RIGHT NOW —
  // see headOnRemote for that.
  if (headSha !== null) {
    for (const remote of remotes) {
      const contained = await runGit(
        exec,
        [
          'for-each-ref',
          '--contains',
          headSha,
          '--count=1',
          '--format=%(refname)',
          `refs/remotes/${remote.name}/`,
        ],
        repoDir,
      )

      if (contained.stdout.trim() !== '') {
        remotesContainingHead.push(remote.name)
      }
    }
  }

  return {
    path: toWorkspacePath(workspaceRoot, repoDir),
    headSha,
    branch,
    remotes,
    bare,
    dirty: statusOutput !== null && statusOutput.status.entries.length > 0,
    headOnRemoteTrackingRef: remotesContainingHead.length > 0,
    remotesContainingHead,
  }
}

/**
 * Sorts by workspace path, with the workspace root ('.') always first.
 *
 * @param a - Left path.
 * @param b - Right path.
 * @returns Standard comparator result.
 */
const byWorkspacePath = (a: { path: string }, b: { path: string }): number => {
  if (a.path === b.path) {
    return 0
  }

  if (a.path === '.') {
    return -1
  }

  if (b.path === '.') {
    return 1
  }

  return a.path < b.path ? -1 : 1
}

/**
 * Finds EVERY git repo in the workspace — nested, gitignored, and BARE — and
 * reports everything it could NOT read.
 *
 * The workspace shape to design for is a POLYREPO: a thin repo at the root plus
 * independent repos in subdirectories, each with its own remote, gitignored by
 * the root. Git does not recurse into a nested repo, so anything derived from
 * the root repo's index (`git ls-files`, `git status`, `git bundle` at the root)
 * sees NONE of the children. Discovery is therefore a plain filesystem walk, and
 * every returned repo must be checkpointed/bundled independently.
 *
 * A directory is a repo root when it holds a `.git` entry (a working tree) OR
 * when it is itself a BARE repository (a `HEAD` file beside an `objects/`
 * directory — `refs/` is NOT required, because a packed mirror's `refs/` is
 * empty and empty directories do not survive a zip or an object-storage sync).
 * Matching only on `.git` made a `git init --bare` mirror in the workspace return
 * `{ repos: [], unreadable: [] }` — ZERO signal — so a caller obeying the
 * documented contract deleted it.
 *
 * BARENESS IS OBSERVED, NOT ASKED. A repository IS bare when its directory IS
 * its git dir (`git rev-parse --absolute-git-dir` answers the directory itself),
 * never because `core.bare` says so: that is a claim, and it is wrong in both
 * directions in the wild — a hand-edited `core.bare=true` on a repo with a real
 * working tree (whose uncommitted work every check then skipped), and a
 * `core.bare=false` mirror (which every work-tree command then failed on).
 * Bare repos come back with `bare: true`, `dirty: false`, and a CONFIRMED one is
 * never descended into. See {@link DiscoveredRepo.bare} for what that means
 * downstream ({@link checkpointRepo} throws, {@link bundleRepo} is still
 * mandatory).
 *
 * A BARE-SHAPED DIRECTORY GIT DOES NOT CONFIRM NEVER REMOVES A SUBTREE. An
 * interrupted `cp` of a mirror (a zero-length `HEAD` beside `objects/`), or
 * dangling symlinks with those names, is nominated by shape
 * and then rejected by git — and because a confirmed bare repo is not descended
 * into, the rejected one used to take every repository BELOW it out of the
 * search as well, reported nowhere. Now it is searched on a second pass: git
 * refusing it also produces a `git-refused` entry, while git attributing it to
 * the ENCLOSING repository produces no entry at all, because the subtree was
 * then searched and nothing is missing.
 *
 * NOTHING IS DROPPED QUIETLY. A directory git declines to open — "dubious
 * ownership" (the standard Docker bind-mount uid mismatch, under which EVERY
 * repo would otherwise vanish and an archive would report success with zero
 * bundles), EACCES, an unknown `extensions.*` from a newer git, a stale worktree
 * pointer — is reported in `unreadable` WITH git's own message. So are a
 * repository hiding inside a skipped directory, a directory that cannot be
 * listed, a symlinked directory pointing OUT of the workspace (never followed,
 * so never searched and never archived), and a subtree left unexplored at
 * `maxDepth`. A non-empty `unreadable` means discovery was INCOMPLETE and the
 * caller MUST NOT release the workspace.
 *
 * DISCOVERY IS NOT THE SAFETY GATE. It is one input to it. Whatever it fails to
 * understand is caught by {@link verifyWorkspaceReconstruction}, which
 * enumerates the workspace a second time by a different mechanism and compares
 * every bundle against the live repo it claims to hold.
 *
 * @param exec - The injected git executor.
 * @param workspaceRoot - Absolute path of the workspace root. It is used both as
 *   the walk root and as git's cwd, so pass the SAME absolute form the executor
 *   understands (a sandbox path for a sandbox exec). The walk reads the
 *   filesystem directly, so this path must be visible to THIS process.
 * @param options - Optional walk limits.
 * @returns `{ repos, unreadable }`. `repos` holds every repository git opened,
 *   with the workspace root ('.') first and the rest sorted by path; `unreadable`
 *   holds every path that could not be read or was not searched, sorted the same
 *   way, and must be empty before the workspace is released.
 * @throws {Error} When `workspaceRoot` does not exist or cannot be listed —
 *   an empty result there would read as "no repos here", which is the one answer
 *   this function must never invent.
 */
export async function discoverRepos(
  exec: GitExec,
  workspaceRoot: string,
  options: DiscoverOptions = {},
): Promise<RepoDiscovery> {
  try {
    await readdir(workspaceRoot)
  } catch (error) {
    throw new Error(
      `cannot discover repos: workspaceRoot ${workspaceRoot} is not a readable directory ` +
        `(${(error as Error).message}). Refusing to report an empty workspace, which a caller ` +
        `would read as "there is nothing here to archive".`,
      { cause: error },
    )
  }

  const skipDirs = new Set(options.skipDirs ?? DEFAULT_SKIP_DIRS)
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH
  const repos: DiscoveredRepo[] = []
  const unreadable: UnreadableRepo[] = []
  let seeds: WalkSeed[] = [{ dir: workspaceRoot, depth: 0, nominate: true }]

  // Each pass walks, describes, and then re-seeds itself with any bare-shaped
  // directory git did NOT confirm as a repository root. The first pass does not
  // descend into a bare candidate, so without this a rejected one would delete
  // its entire subtree from the search — and every repository below it would be
  // reported neither in `repos` nor in `unreadable`, the one answer this
  // function must never invent. The loop terminates because a re-seeded
  // directory cannot nominate itself again and every pass descends at least one
  // level, bounded by maxDepth.
  while (seeds.length > 0) {
    const walk = await findRepoDirs(exec, workspaceRoot, skipDirs, maxDepth, seeds)
    const reSeed: WalkSeed[] = []

    unreadable.push(...walk.unreadable)

    for (const candidate of walk.repoDirs) {
      try {
        const described = await describeRepo(
          exec,
          workspaceRoot,
          candidate.dir,
          candidate.bareCandidate,
        )

        if (described === null) {
          // Git resolved this bare-SHAPED directory to the repository that
          // ENCLOSES it, so it is not a repo root — an interrupted copy of a
          // mirror, or a directory that merely holds `HEAD` beside
          // `objects/`. It is not reported as a repo (that would invent a duplicate
          // of the enclosing one) and it is not reported as unreadable either,
          // because the next pass SEARCHES it: nothing below it stays hidden.
          reSeed.push({ dir: candidate.dir, depth: candidate.depth, nominate: false })

          continue
        }

        repos.push(described)
      } catch (error) {
        // Surfaced, never omitted: a repo git would not open is exactly the case
        // that made archives report success with zero bundles.
        unreadable.push({
          path: toWorkspacePath(workspaceRoot, candidate.dir),
          reason: `${UNREADABLE_REASONS.gitRefused}: ${(error as Error).message}`,
        })

        if (candidate.bareCandidate) {
          // Git refused a bare-SHAPED directory, so whether it is a repository
          // is UNKNOWN — it is reported above either way. The subtree must
          // still be searched: a directory git cannot open must not also take
          // every repository beneath it out of the results.
          reSeed.push({ dir: candidate.dir, depth: candidate.depth, nominate: false })
        }
      }
    }

    seeds = reSeed
  }

  return {
    repos: repos.sort(byWorkspacePath),
    unreadable: unreadable.sort(byWorkspacePath),
  }
}
