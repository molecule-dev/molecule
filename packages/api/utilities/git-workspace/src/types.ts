/**
 * Types for `@molecule/api-git-workspace`.
 *
 * A workspace is a POLYREPO: a thin repo at the root plus any number of
 * INDEPENDENT repos in subdirectories, each with its own remote, usually
 * gitignored by the root. Every type here is therefore per-repo — nothing in
 * this package assumes a workspace contains exactly one repository.
 *
 * @module
 */

/**
 * Result of running a git command.
 *
 * A non-zero `exitCode` is a normal, expected value — implementations must
 * RESOLVE with it rather than reject, because several git commands use exit
 * status as an answer (`rev-parse --verify HEAD` fails on a repo with no
 * commits; `symbolic-ref HEAD` fails on a detached HEAD). Reject only when git
 * itself could not be run at all.
 */
export interface GitExecResult {
  /** Standard output, decoded as UTF-8. */
  stdout: string
  /** Standard error, decoded as UTF-8. */
  stderr: string
  /** Process exit code; `0` on success. */
  exitCode: number
}

/**
 * Runs a git command. INJECTED so this package works against a sandbox exec, a
 * local shell, or a test double — it must never import child_process itself.
 *
 * `args` is the argv AFTER the `git` program name and is passed through as an
 * ARRAY: no shell, no quoting, no interpolation. A repository path containing a
 * space, a quote, or a leading dash can therefore never break or inject a
 * command.
 *
 * @param args - Argv passed to git, excluding the `git` program name itself.
 * @param options - Optional execution options.
 * @param options.cwd - Working directory to run git in. Every function in this
 *   package sets this explicitly for repo-scoped commands, so an implementation
 *   only needs a sane default (any directory) for the rare cwd-less call.
 * @returns The command's stdout, stderr, and exit code.
 */
export type GitExec = (
  args: readonly string[],
  options?: { cwd?: string },
) => Promise<GitExecResult>

/** A git remote. */
export interface GitRemote {
  /** Remote name, e.g. `origin`. */
  name: string
  /**
   * Fetch URL for the remote (falls back to the push URL when a remote has no
   * fetch URL).
   *
   * SECURITY: a URL may embed credentials (the `user:token@host` userinfo form)
   * because that is exactly how git stores it. Treat it as a secret — never log
   * it, never persist it into user-visible archive metadata, and redact it
   * before showing it in a UI.
   */
  url: string
}

/** A repository discovered inside a workspace. */
export interface DiscoveredRepo {
  /** Workspace-RELATIVE POSIX path of the repo root; '.' for the workspace root. */
  path: string
  /**
   * Current HEAD commit sha, or null for a repo whose HEAD is unborn.
   *
   * `null` does NOT mean "empty, safe to skip": a repo sitting on an unborn
   * branch (a fresh `git checkout --orphan`) can still carry branches, tags,
   * notes and stashes. Only {@link bundleRepo} can answer "is there anything to
   * archive?" — it throws only when there are no refs AND HEAD is unborn.
   */
  headSha: string | null
  /** Current branch name, or null when detached. */
  branch: string | null
  /** Every remote configured in the repo's config, in git's order. */
  remotes: GitRemote[]
  /**
   * True when the repository is BARE — it has no working tree, and the directory
   * itself is the git dir (`git rev-parse --is-bare-repository`).
   *
   * A bare repo is a first-class archival target, not an oddity: the standard
   * `git init --bare` team mirror or `<name>.git` push target sitting inside a
   * workspace holds branches, tags and notes that exist NOWHERE else once the
   * workspace is deleted. Discovery therefore reports it like any other repo —
   * it used to be invisible (no `.git` entry to match on), which produced the
   * one answer this package must never invent: `{ repos: [], unreadable: [] }`,
   * i.e. "there is nothing here to archive".
   *
   * Consequences for the rest of the pipeline:
   *
   * - {@link DiscoveredRepo.dirty} is always `false` — there is no working tree
   *   to be dirty, and `git status` is never run in a bare repo (it exits 128,
   *   "this operation must be run in a work tree").
   * - {@link checkpointRepo} THROWS: there is nothing to stage or commit.
   * - {@link bundleRepo} works normally and MUST still be called — the refs and
   *   objects are exactly what needs archiving.
   *
   * See also {@link headOnRemote}: a bare repo inside the workspace is a common
   * `origin` for a working repo beside it, and a remote that is itself about to
   * be deleted is not an offsite copy.
   */
  bare: boolean
  /**
   * True when the working tree has uncommitted or untracked (non-ignored)
   * changes. Always `false` for a bare repo, which has no working tree.
   */
  dirty: boolean
  /**
   * True when HEAD is contained by a remote-tracking ref under
   * `refs/remotes/<name>/` for a CONFIGURED remote — i.e. exactly when
   * {@link DiscoveredRepo.remotesContainingHead} is non-empty.
   *
   * THIS IS CACHED LOCAL STATE, NOT A STATEMENT ABOUT ANY REMOTE. `refs/remotes/*`
   * is a local cache of what a remote looked like at the last fetch/push; this
   * package never contacts a remote to compute it. It is therefore `true` in all
   * of these cases, every one of which means the commit exists ONLY on this disk:
   *
   * - the branch was deleted on the remote after the last push;
   * - the remote repository was deleted entirely;
   * - the remote was force-rewritten and no longer contains the commit;
   * - the remote is unreachable, renamed, or its credentials were revoked.
   *
   * It MUST NOT be used on its own to skip archiving a repo — doing so deletes
   * the only copy of the user's work. The only signal that may justify skipping
   * a bundle is {@link headOnRemote}, which actually asks the remote.
   */
  headOnRemoteTrackingRef: boolean
  /**
   * Names of the CONFIGURED remotes whose `refs/remotes/<name>/` cache contains
   * HEAD, in the order the remotes appear in the repo's config.
   *
   * Scanning per configured remote (rather than all of `refs/remotes/`) keeps
   * the answer self-consistent: a repo whose remote was removed from config
   * while its stale tracking refs remained can never report
   * `headOnRemoteTrackingRef: true` alongside `remotes: []`. It is still CACHED
   * LOCAL state — see {@link DiscoveredRepo.headOnRemoteTrackingRef}.
   */
  remotesContainingHead: string[]
}

/**
 * A path that holds (or may hold) a repository which discovery could NOT read
 * or was NOT allowed to search.
 *
 * A non-empty list means discovery is INCOMPLETE. The caller MUST NOT release,
 * delete, or otherwise let go of the workspace while any entry remains: each one
 * is a place where user work may exist that was never archived. Resolve the
 * cause (fix ownership/permissions, narrow `skipDirs`, raise `maxDepth`) and
 * re-run discovery until the list is empty.
 */
export interface UnreadableRepo {
  /** Workspace-RELATIVE POSIX path of the directory concerned; '.' for the root. */
  path: string
  /**
   * Why it could not be read or searched, beginning with one of the tokens in
   * {@link UNREADABLE_REASONS} and carrying git's or the OS's own message
   * verbatim after it (e.g. `git-refused: git rev-parse --git-dir failed in
   * /workspace/api (exit 128): fatal: detected dubious ownership in repository`).
   */
  reason: string
}

/**
 * Everything {@link discoverRepos} found, split into what it could read and what
 * it could not.
 *
 * The split exists because "returned fewer repos" must never be confusable with
 * "there were fewer repos". This package precedes deleting a user's only copy of
 * their source, so a repo git declined to open, a repo hidden inside a skipped
 * directory, and a subtree the walk never reached are all reported EXPLICITLY
 * rather than omitted.
 */
export interface RepoDiscovery {
  /** Every repository git opened and described successfully. */
  repos: DiscoveredRepo[]
  /**
   * Every path that could not be read or was not searched. MUST be empty before
   * the caller releases the workspace — see {@link UnreadableRepo}.
   */
  unreadable: UnreadableRepo[]
}

/**
 * One archived repository, as handed to {@link verifyWorkspaceReconstruction}:
 * where it lives in the workspace, and the bundle that claims to hold it.
 */
export interface ArchivedRepo {
  /**
   * Workspace-RELATIVE POSIX path of the repo root ('.' for the workspace root)
   * — the {@link DiscoveredRepo.path} the bundle was made from.
   */
  repoPath: string
  /** Absolute path of the bundle written for that repo by {@link bundleRepo}. */
  bundlePath: string
}

/**
 * One way the archive failed to reproduce the workspace.
 *
 * Every mismatch means "this would not come back", so a report carrying any of
 * them is a refusal to release, not a warning.
 */
export interface ReconstructionMismatch {
  /**
   * What kind of difference this is — one of
   * {@link RECONSTRUCTION_MISMATCH_KINDS}, so a caller can branch without
   * parsing prose. Typed as a plain string because the set grows as new
   * failure modes are found; treat an unrecognised kind as fatal, never as
   * ignorable.
   */
  kind: string
  /**
   * What the difference is about: the workspace-relative repo path, or
   * `<repo>/<file>` for a file-level difference, or the workspace-relative path
   * of a repository the archive never covered.
   */
  path: string
  /** Human-readable specifics — the two values that differ, or git's own message. */
  detail: string
}

/**
 * The verdict of {@link verifyWorkspaceReconstruction}: can this archive rebuild
 * the workspace?
 *
 * THIS IS THE ONLY RESULT IN THE PACKAGE THAT MAY PRECEDE DELETING THE
 * WORKSPACE. Release requires `ok === true` AND `mismatches` empty — the two are
 * kept consistent by construction, and checking both costs nothing.
 */
export interface ReconstructionReport {
  /** True only when NOTHING differed and nothing was left unarchived. */
  ok: boolean
  /** Every difference found, in repo order then path order; empty when `ok`. */
  mismatches: ReconstructionMismatch[]
  /**
   * How many archived repos were restored AND fully compared against their live
   * source. Lower than the number of entries passed in when one could not be
   * compared at all (its own mismatch says why), so a caller can see at a glance
   * whether the check really ran.
   */
  checkedRepos: number
}

/**
 * Values used for {@link ReconstructionMismatch.kind}.
 *
 * All of them are fatal. They are distinguished so an operator can tell "the
 * archive is missing a whole repository" from "one file's content differs"
 * without reading prose.
 */
export const RECONSTRUCTION_MISMATCH_KINDS = {
  /** A repository found by the gate's own filesystem enumeration that no bundle covers. */
  unarchivedRepo: 'unarchived-repo',
  /** The live repository could not be inspected, so the archive could not be compared to anything. */
  unverifiableRepo: 'unverifiable-repo',
  /** The bundle did not restore at all (missing, truncated, corrupt, or an unusable scratch directory). */
  bundleUnrestorable: 'bundle-unrestorable',
  /** The restored HEAD is a different commit, or a different branch/detached state, than the live repo's. */
  headMismatch: 'head-mismatch',
  /** A ref exists on one side only, or points at a different object. */
  refMismatch: 'ref-mismatch',
  /** A tracked file differs in mode, content, or existence between the live repo and the restored one. */
  contentMismatch: 'content-mismatch',
  /**
   * A path whose TRUE working-tree content the gate cannot see, so it can be
   * neither compared nor attested — a `skip-worktree`/`assume-unchanged` index
   * bit (which makes both `git status` and `git ls-files -s` report the index
   * rather than the file on disk), or a working tree configured to live outside
   * the repository directory.
   */
  unattestableContent: 'unattestable-content',
  /** The live repo has uncommitted or untracked work, which no bundle can carry. */
  uncommittedWork: 'uncommitted-work',
  /** The gate's own enumeration could not be trusted (it failed, or it did not even find an archived repo). */
  enumerationIncomplete: 'enumeration-incomplete',
} as const

/**
 * Leading tokens used in {@link UnreadableRepo.reason}, so a caller can branch on
 * the cause without parsing prose.
 *
 * Each value is a PREFIX: the rest of the string carries git's or the OS's own
 * message.
 */
export const UNREADABLE_REASONS = {
  /** Git declined to open the directory as a repository (dubious ownership, EACCES, an unknown `extensions.*`, a stale worktree pointer, a junk `.git` file). */
  gitRefused: 'git-refused',
  /** A repository (or a directory holding one) inside a directory named in `skipDirs`, which the walk never searched. */
  skippedDirectory: 'skipped-directory',
  /** The walk stopped at `maxDepth` with subdirectories still unexplored, so the search was NOT exhaustive. */
  depthLimit: 'depth-limit',
  /** The directory itself could not be listed (permissions, I/O error), so anything below it is unknown. */
  unreadableDirectory: 'unreadable-directory',
  /** A SYMLINKED directory, which the walk never follows — so whatever is inside it was not searched. */
  symlinkedDirectory: 'symlinked-directory',
} as const

/** Limits applied to the filesystem walk performed by `discoverRepos`. */
export interface DiscoverOptions {
  /**
   * Directory names never descended into. Defaults to {@link DEFAULT_SKIP_DIRS}.
   *
   * A skipped directory is not invisible: if it holds a repository, that
   * repository is reported in {@link RepoDiscovery.unreadable} with the
   * `skipped-directory` reason, so it can never be silently dropped.
   */
  skipDirs?: readonly string[]
  /**
   * Maximum directory depth to search. Defaults to 6.
   *
   * Hitting the limit with subdirectories still unexplored is reported in
   * {@link RepoDiscovery.unreadable} with the `depth-limit` reason — a truncated
   * search must never look exhaustive.
   */
  maxDepth?: number
}

/**
 * Directories never searched for repos.
 *
 * Deliberately SHORT. Every name here is machine-written content that is never a
 * project repository root and inside which a `.git` is never the user's own work.
 * A directory that merely *usually* holds generated output does NOT qualify: a
 * `gh-pages` worktree lives in `dist/`, a vendored submodule lives in `vendor/`,
 * a scratch repo lives in `tmp/`, and skipping those loses real work — so
 * `dist`, `build`, `out`, `coverage`, `vendor`, `Pods`, `target`, `venv`,
 * `.venv`, `.tox`, `.gradle`, `.terraform`, `.next`, `.nuxt`, `.svelte-kit`,
 * `.output`, `.turbo`, `.cache`, `.vite` and `.parcel-cache` are NOT skipped.
 * They are searched like any other directory.
 *
 * Per-entry justification:
 *
 * - `node_modules` — npm/yarn/pnpm install output. Never a project repo root,
 *   and a `.git` inside it belongs to a dependency, not the user. It is also the
 *   only entry that matters for walk COST: one `node_modules` holds tens of
 *   thousands of directories, which is the difference between discovery in
 *   milliseconds and discovery that is unusable.
 * - `.git` — a repository's own object store. ALWAYS skipped regardless of this
 *   list (a custom `skipDirs` cannot re-enable descending into it), and never
 *   reported as a skipped directory, since its parent is already reported as a repo.
 * - `.pnpm-store` — pnpm's content-addressed package store: hard-linked package
 *   contents, never a project repo root.
 * - `.yarn` — Yarn Berry's `cache/`, `releases/`, and `unplugged/` trees: zipped
 *   or extracted dependency copies, never a project repo root.
 * - `bower_components` — legacy Bower install output; the same class as
 *   `node_modules`.
 * - `__pycache__` — CPython bytecode cache; only ever holds `.pyc` files written
 *   by the interpreter.
 */
export const DEFAULT_SKIP_DIRS: readonly string[] = [
  'node_modules',
  '.git',
  '.pnpm-store',
  '.yarn',
  'bower_components',
  '__pycache__',
]
