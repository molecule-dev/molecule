# @molecule/api-git-workspace

Git-based source archival for a POLYREPO project workspace.

Archives a dormant project's source VIA GIT instead of a bespoke tarball:
`discoverRepos` finds every repository in the workspace (and reports every
place it could NOT look), `checkpointRepo` commits whatever was left
uncommitted, `bundleRepo` writes each repo to one self-contained `.bundle`
file, `verifyBundleRestorable` proves that bundle can actually be restored,
`verifyWorkspaceReconstruction` proves the ARCHIVE AS A WHOLE rebuilds the
workspace, and `restoreRepo` brings each repo back with all of its refs. Git
gives delta compression across re-archives, a content-addressed integrity
model, a format users already understand, and zero cost when the user already
pushes to their own remote.

Every function takes an injected `GitExec` — argv in, `{ stdout, stderr,
exitCode }` out — so the same code drives a sandbox exec, a local shell, or a
test double. This package never imports `child_process`, and never builds a
command by string interpolation, so a repo path containing a space, a quote,
or a leading dash cannot break, inject, or be parsed as a flag.

## Quick Start

```typescript
import {
  type ArchivedRepo,
  bundleRepo,
  checkpointRepo,
  discoverRepos,
  restoreRepo,
  verifyBundleRestorable,
  verifyWorkspaceReconstruction,
  type GitExec,
} from '@molecule/api-git-workspace'

// Inject however you run git — a sandbox exec here; a local spawn elsewhere.
const exec: GitExec = async (args, options) => sandbox.exec('git', args, options)

// 1. DISCOVER. `unreadable` is not advisory: each entry is a place user work
//    may exist that will NOT be archived. Fix the cause and re-run — this is
//    the cheap check that stops the expensive one from failing later.
const { repos, unreadable } = await discoverRepos(exec, '/workspace')

if (unreadable.length > 0) {
  throw new Error(
    `workspace not fully readable, refusing to archive: ` +
      unreadable.map((entry) => `${entry.path} (${entry.reason})`).join('; '),
  )
}

// Bundle filenames derive from the repo's WORKSPACE PATH, so 'api' and
// 'services/api' cannot overwrite each other's archive.
const bundleFor = (path: string) => `/archive/${encodeURIComponent(path)}.bundle`
const dirOf = (path: string) => (path === '.' ? '/workspace' : `/workspace/${path}`)
const archived: ArchivedRepo[] = []

// 2. CHECKPOINT EVERY REPO FIRST, DEEPEST FIRST — then bundle in a SECOND
//    pass. Checkpointing and bundling one repo at a time looks tidier and
//    cannot work for a workspace with submodules or linked worktrees: a child
//    shares state with its parent, so committing the child AFTER the parent
//    was bundled either dirties the parent (its gitlink moves) or advances a
//    ref the parent's bundle predates — the gate reports it, correctly, and
//    the archive can never go green. Deepest-first means a parent is
//    checkpointed after every child that can move under it.
//
//    checkpointRepo is skipped for a BARE repo (no working tree — it throws),
//    and it throws if the repo is mid-merge/rebase/cherry-pick, which is
//    unfinished user work: resolve that and re-run rather than archiving.
//    Neither a hook nor a content filter nor a config knob can veto it.
const deepestFirst = [...repos].sort(
  (a, b) => b.path.split('/').length - a.path.split('/').length,
)

for (const repo of deepestFirst) {
  if (!repo.bare) {
    await checkpointRepo(exec, dirOf(repo.path), 'chore: archive checkpoint')
  }
}

for (const repo of repos) {
  const dir = dirOf(repo.path)

  // 3. BUNDLE — every repo, unconditionally. Do NOT skip on
  //    `repo.headSha === null` (an unborn HEAD still carries branches, tags,
  //    notes and stashes) and do NOT skip on `repo.headOnRemoteTrackingRef`
  //    (cached local state; the remote may no longer have the commit).
  //    bundleRepo throws only for a repo with no refs at all AND an unborn
  //    HEAD — the one case where there is genuinely nothing to archive, and
  //    the one a caller must skip: an EMPTY bare mirror (a `git init --bare`
  //    nothing has been pushed to yet) cannot be bundled at all, because git
  //    refuses to write an empty bundle. The gate accepts a provably empty
  //    repository, so skipping it here does not block the release.
  const refs = await exec(['for-each-ref', '--count=1'], { cwd: dir })

  if (repo.bare && refs.stdout.trim() === '') {
    continue
  }

  await bundleRepo(exec, dir, bundleFor(repo.path))
  archived.push({ repoPath: repo.path, bundlePath: bundleFor(repo.path) })

  // 4. PROVE EACH BUNDLE RESTORES. `verifyBundle` reads the header only and
  //    says "okay" for a truncated, bit-flipped bundle; this restores for
  //    real, and fails fast on the one bundle that is broken.
  const scratch = `/tmp/verify/${encodeURIComponent(repo.path)}`

  if (!(await verifyBundleRestorable(exec, bundleFor(repo.path), scratch))) {
    throw new Error(`bundle is not restorable: ${bundleFor(repo.path)}`)
  }
}

// 5. THE GATE. Everything above trusted discovery to have understood the
//    workspace. This does not: it enumerates the workspace again with `find`
//    (and proves that walk arrived whole) and compares every bundle, restored
//    for real, against the repo it claims to hold — HEAD, HEAD state, every
//    ref, every tracked file, plus the state no bundle carries (uncommitted
//    work, files hidden behind a skip-worktree bit, an executable bit the
//    index does not record). A repo shape nobody anticipated shows up here as
//    `unarchived-repo` instead of as a silent deletion.
const report = await verifyWorkspaceReconstruction(
  exec,
  '/workspace',
  archived,
  '/tmp/reconstruct',
)

if (!report.ok || report.mismatches.length > 0) {
  throw new Error(
    `archive does not reconstruct the workspace, refusing to release: ` +
      report.mismatches.map((m) => `${m.path} [${m.kind}] ${m.detail}`).join('; '),
  )
}

// 6. ONLY NOW may the source be released.
await releaseWorkspace('/workspace')

// RESTORE: parents before children, then re-point each remote (a restored
// repo has none — the bundle is not a remote). `headBranch`/`detachedHead`
// come from discovery: no bundle records which branch HEAD was on, so without
// them a repo whose commit is shared by several branches comes back on the
// wrong one.
for (const repo of repos) {
  const destination = repo.path === '.' ? '/workspace' : `/workspace/${repo.path}`

  await restoreRepo(exec, bundleFor(repo.path), destination, {
    ...(repo.branch === null
      ? repo.headSha === null
        ? {}
        : { detachedHead: true }
      : { headBranch: repo.branch }),
  })
}
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-git-workspace
```

## API

### Interfaces

#### `ArchivedRepo`

One archived repository, as handed to {@link verifyWorkspaceReconstruction}:
where it lives in the workspace, and the bundle that claims to hold it.

```typescript
interface ArchivedRepo {
  /**
   * Workspace-RELATIVE POSIX path of the repo root ('.' for the workspace root)
   * — the {@link DiscoveredRepo.path} the bundle was made from.
   */
  repoPath: string
  /** Absolute path of the bundle written for that repo by {@link bundleRepo}. */
  bundlePath: string
}
```

#### `DiscoveredRepo`

A repository discovered inside a workspace.

```typescript
interface DiscoveredRepo {
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
```

#### `DiscoverOptions`

Limits applied to the filesystem walk performed by `discoverRepos`.

```typescript
interface DiscoverOptions {
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
```

#### `GitExecResult`

Result of running a git command.

A non-zero `exitCode` is a normal, expected value — implementations must
RESOLVE with it rather than reject, because several git commands use exit
status as an answer (`rev-parse --verify HEAD` fails on a repo with no
commits; `symbolic-ref HEAD` fails on a detached HEAD). Reject only when git
itself could not be run at all.

```typescript
interface GitExecResult {
  /** Standard output, decoded as UTF-8. */
  stdout: string
  /** Standard error, decoded as UTF-8. */
  stderr: string
  /** Process exit code; `0` on success. */
  exitCode: number
}
```

#### `GitRemote`

A git remote.

```typescript
interface GitRemote {
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
```

#### `ReconstructionMismatch`

One way the archive failed to reproduce the workspace.

Every mismatch means "this would not come back", so a report carrying any of
them is a refusal to release, not a warning.

```typescript
interface ReconstructionMismatch {
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
```

#### `ReconstructionReport`

The verdict of {@link verifyWorkspaceReconstruction}: can this archive rebuild
the workspace?

THIS IS THE ONLY RESULT IN THE PACKAGE THAT MAY PRECEDE DELETING THE
WORKSPACE. Release requires `ok === true` AND `mismatches` empty — the two are
kept consistent by construction, and checking both costs nothing.

```typescript
interface ReconstructionReport {
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
```

#### `RepoDiscovery`

Everything {@link discoverRepos} found, split into what it could read and what
it could not.

The split exists because "returned fewer repos" must never be confusable with
"there were fewer repos". This package precedes deleting a user's only copy of
their source, so a repo git declined to open, a repo hidden inside a skipped
directory, and a subtree the walk never reached are all reported EXPLICITLY
rather than omitted.

```typescript
interface RepoDiscovery {
  /** Every repository git opened and described successfully. */
  repos: DiscoveredRepo[]
  /**
   * Every path that could not be read or was not searched. MUST be empty before
   * the caller releases the workspace — see {@link UnreadableRepo}.
   */
  unreadable: UnreadableRepo[]
}
```

#### `UnreadableRepo`

A path that holds (or may hold) a repository which discovery could NOT read
or was NOT allowed to search.

A non-empty list means discovery is INCOMPLETE. The caller MUST NOT release,
delete, or otherwise let go of the workspace while any entry remains: each one
is a place where user work may exist that was never archived. Resolve the
cause (fix ownership/permissions, narrow `skipDirs`, raise `maxDepth`) and
re-run discovery until the list is empty.

```typescript
interface UnreadableRepo {
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
```

### Types

#### `GitExec`

Runs a git command. INJECTED so this package works against a sandbox exec, a
local shell, or a test double — it must never import child_process itself.

`args` is the argv AFTER the `git` program name and is passed through as an
ARRAY: no shell, no quoting, no interpolation. A repository path containing a
space, a quote, or a leading dash can therefore never break or inject a
command.

```typescript
type GitExec = (
  args: readonly string[],
  options?: { cwd?: string },
) => Promise<GitExecResult>
```

### Functions

#### `bundleRepo(exec, repoPath, bundlePath)`

Writes a single-file bundle of ALL refs.

`--all` captures every ref under `refs/` — branches, tags, remote-tracking
refs, notes, and the top stash — PLUS HEAD, so a detached HEAD's commits,
reachable from no branch, survive the round trip. The bundle is
self-contained (no prerequisites), which is what makes it restorable anywhere
with `restoreRepo`.

WHAT A BUNDLE CANNOT CARRY: REFLOGS. `git reflog` history is not archived, and
neither are stash entries below the top one (`stash@{1}` and beyond live only
in the stash reflog). `refs/stash` itself — the most recent stash — is in the
bundle and replays with `git stash apply refs/stash`.

Objects are delta-compressed, so re-bundling a repo after a few commits costs
roughly the size of the new work rather than the whole history.

```typescript
function bundleRepo(exec: GitExec, repoPath: string, bundlePath: string): Promise<void>
```

- `exec` — The injected git executor.
- `repoPath` — Absolute path of the repo to bundle. In a polyrepo workspace EVERY discovered repo must be bundled separately: a bundle taken at the workspace root contains nothing whatsoever of its nested repos.
- `bundlePath` — Absolute path of the bundle file to write. Its parent directory must already exist (git will not create it), and a relative path would resolve against `repoPath`. Derive the FILENAME from the repo's workspace path (`encodeURIComponent(repo.path)`), never from its basename: a polyrepo routinely holds two repos called `api`, and a colliding filename silently overwrites the first one's archive.

**Returns:** Nothing; the bundle exists on success. A `true` from `verifyBundle` does NOT prove it is intact — prove that with `verifyBundleRestorable`.

#### `checkpointRepo(exec, repoPath, message)`

Commits any uncommitted work so it survives archival.

REFUSES A BARE REPOSITORY — one that OBSERVABLY has no working tree, i.e.
whose directory IS its git dir ({@link readRepoLayout}), not one whose config
merely claims `core.bare=true`. There is then nothing to stage and nothing to
commit, so this throws rather than letting `git status`/`git add` fail with
git's obscure "this operation must be run in a work tree". Bare repos are still
archived — skip the checkpoint and call {@link bundleRepo}, which works on them
normally. A repository that has a real working tree while CLAIMING to be bare
is checkpointed like any other (measured: `-c core.bare=false` alone is not
enough for `status`/`add`, so an explicit `--work-tree` is passed) — its
uncommitted work used to be skipped entirely and silently lost.

NOTHING THE REPOSITORY CONFIGURES CAN HIDE WORK FROM IT. `git status` runs on
pinned configuration ({@link HERMETIC_CONFIG}) with `--untracked-files=all`,
because `status.showUntrackedFiles=no` — a routine large-repo performance
setting — makes plain `--porcelain` print nothing for untracked files, so the
checkpoint found a "clean" tree, committed nothing, and a directory of new work
went into no bundle at all. `core.excludesFile` (a host-level ignore file) did
the same to `git add -A`, and is pinned away for the same reason.

REFUSES A REPO MID-OPERATION. A merge, rebase, cherry-pick, `git am`, or
bisect that has not finished leaves the working tree holding conflict markers
and a half-applied state; that is unfinished user work, not something to
snapshot, so this throws and names the state instead of committing it. The
detection reads the git dir (via `git rev-parse --git-path`) directly, so
`repoPath` must be visible to THIS process.

Staging uses `git add -A`, which RESPECTS `.gitignore` — `node_modules/`,
`dist/`, and `.env*` stay out of the archive (env values are re-assembled from
the control-plane vault at boot, so nothing is lost by omitting them).

NO HOOK CAN VETO THE CHECKPOINT, and `--no-verify` is not what guarantees
that. Measured against git 2.43, one hook at a time: `--no-verify` skips
EXACTLY TWO of the hooks git runs for a commit — `pre-commit` and
`commit-msg`. It does NOT skip `prepare-commit-msg`, which still runs and
whose non-zero exit ABORTS the commit; a husky `prepare-commit-msg` driving
commitizen/commitlint fails closed in an archival sandbox that has neither, so
it vetoed every checkpoint for such a project and left the uncommitted work
unarchived. (`post-commit` runs after the commit is written and cannot undo
it; `pre-applypatch` belongs to `git am` and is not a commit hook at all.)
What actually guarantees archival is a command-line
`-c core.hooksPath=/dev/null/…` — a path under a character device, so no hook
file can exist there — which overrides BOTH `.git/hooks` and a repo-level
`core.hooksPath` (the husky shape). `--no-verify` is kept as well.
`--no-gpg-sign` is set because signing a machine-made snapshot means nothing.

NO CONTENT FILTER CAN VETO IT EITHER — the same veto as a hook, through a
different knob. A repo using git-lfs configures `filter.lfs.process` +
`filter.lfs.required=true`; in an archival sandbox WITHOUT the `git-lfs`
binary, that filter fails, and measured on git 2.43 it takes down
`git status`, `git add -A` AND `git commit` (which refreshes the index and
re-runs the clean filter), each with exit 128 — so every repo using git-lfs
failed to archive at all. Each step therefore RETRIES with every configured
filter driver neutralised (`filter.<d>.process=`, `.clean=`, `.smudge=`,
`.required=false` — the combination that actually works; see
{@link filterOverrides} for the ones that do NOT), and git then stores the
file's raw bytes.

The retry happens only AFTER a real failure, never pre-emptively: in a repo
whose git-lfs works, disabling the filter would silently commit raw bytes
where the project's own history holds pointers. If the retry fails too, this
THROWS and NAMES the driver rather than committing content that only some
files' filters had processed.

WHAT AN LFS REPO'S ARCHIVE ACTUALLY CONTAINS: a bundle carries git objects, and
LFS keeps its large files OUTSIDE the object store (`.git/lfs/objects`), so
they are NOT archived — the bundle holds pointers. Fetch LFS content into the
repo (or accept pointers) before treating an LFS project as fully archived.

None of that promises the commit always succeeds — git can still refuse (a
bare or mid-operation repo, both refused up front here; a corrupt index; a
full disk) and those failures throw.

```typescript
function checkpointRepo(exec: GitExec, repoPath: string, message: string): Promise<string | null>
```

- `exec` — The injected git executor.
- `repoPath` — Absolute path of the repo to checkpoint. Each repo in a workspace is checkpointed independently — never assume one repo.
- `message` — Commit message. Passed as argv, so any quoting is safe.

**Returns:** The new commit sha, or null when the tree was already clean (or when nothing was stageable, e.g. only an embedded repo's contents changed).

#### `discoverRepos(exec, workspaceRoot, options)`

Finds EVERY git repo in the workspace — nested, gitignored, and BARE — and
reports everything it could NOT read.

The workspace shape to design for is a POLYREPO: a thin repo at the root plus
independent repos in subdirectories, each with its own remote, gitignored by
the root. Git does not recurse into a nested repo, so anything derived from
the root repo's index (`git ls-files`, `git status`, `git bundle` at the root)
sees NONE of the children. Discovery is therefore a plain filesystem walk, and
every returned repo must be checkpointed/bundled independently.

A directory is a repo root when it holds a `.git` entry (a working tree) OR
when it is itself a BARE repository (a `HEAD` file beside an `objects/`
directory — `refs/` is NOT required, because a packed mirror's `refs/` is
empty and empty directories do not survive a zip or an object-storage sync).
Matching only on `.git` made a `git init --bare` mirror in the workspace return
`{ repos: [], unreadable: [] }` — ZERO signal — so a caller obeying the
documented contract deleted it.

BARENESS IS OBSERVED, NOT ASKED. A repository IS bare when its directory IS
its git dir (`git rev-parse --absolute-git-dir` answers the directory itself),
never because `core.bare` says so: that is a claim, and it is wrong in both
directions in the wild — a hand-edited `core.bare=true` on a repo with a real
working tree (whose uncommitted work every check then skipped), and a
`core.bare=false` mirror (which every work-tree command then failed on).
Bare repos come back with `bare: true`, `dirty: false`, and a CONFIRMED one is
never descended into. See {@link DiscoveredRepo.bare} for what that means
downstream ({@link checkpointRepo} throws, {@link bundleRepo} is still
mandatory).

A BARE-SHAPED DIRECTORY GIT DOES NOT CONFIRM NEVER REMOVES A SUBTREE. An
interrupted `cp` of a mirror (a zero-length `HEAD` beside `objects/`), or
dangling symlinks with those names, is nominated by shape
and then rejected by git — and because a confirmed bare repo is not descended
into, the rejected one used to take every repository BELOW it out of the
search as well, reported nowhere. Now it is searched on a second pass: git
refusing it also produces a `git-refused` entry, while git attributing it to
the ENCLOSING repository produces no entry at all, because the subtree was
then searched and nothing is missing.

NOTHING IS DROPPED QUIETLY. A directory git declines to open — "dubious
ownership" (the standard Docker bind-mount uid mismatch, under which EVERY
repo would otherwise vanish and an archive would report success with zero
bundles), EACCES, an unknown `extensions.*` from a newer git, a stale worktree
pointer — is reported in `unreadable` WITH git's own message. So are a
repository hiding inside a skipped directory, a directory that cannot be
listed, a symlinked directory pointing OUT of the workspace (never followed,
so never searched and never archived), and a subtree left unexplored at
`maxDepth`. A non-empty `unreadable` means discovery was INCOMPLETE and the
caller MUST NOT release the workspace.

DISCOVERY IS NOT THE SAFETY GATE. It is one input to it. Whatever it fails to
understand is caught by {@link verifyWorkspaceReconstruction}, which
enumerates the workspace a second time by a different mechanism and compares
every bundle against the live repo it claims to hold.

```typescript
function discoverRepos(exec: GitExec, workspaceRoot: string, options?: DiscoverOptions): Promise<RepoDiscovery>
```

- `exec` — The injected git executor.
- `workspaceRoot` — Absolute path of the workspace root. It is used both as the walk root and as git's cwd, so pass the SAME absolute form the executor understands (a sandbox path for a sandbox exec). The walk reads the filesystem directly, so this path must be visible to THIS process.
- `options` — Optional walk limits.

**Returns:** `{ repos, unreadable }`. `repos` holds every repository git opened, with the workspace root ('.') first and the rest sorted by path; `unreadable` holds every path that could not be read or was not searched, sorted the same way, and must be empty before the workspace is released.

#### `headOnRemote(exec, repoPath, remote, options)`

Asks the REMOTE whether it currently has the repo's HEAD commit as a branch or
tag tip (`git ls-remote --heads --tags`).

THIS TOUCHES THE NETWORK. Unlike {@link DiscoveredRepo.headOnRemoteTrackingRef}
— which reads `refs/remotes/*`, a LOCAL CACHE that keeps saying "pushed" after
the branch, or the whole repository, was deleted on the remote — this function
opens a connection to the remote and reads what is there now. It therefore
needs network access and whatever credentials the remote requires, and it can
be slow. Give the injected executor a timeout and a non-interactive
environment (`GIT_TERMINAL_PROMPT=0`) so a credential prompt cannot hang it.

IT IS THE ONLY SIGNAL IN THIS PACKAGE THAT MAY JUSTIFY SKIPPING A BUNDLE, and
even then only for the exact commit it was asked about.

PASS `options.workspaceRoot`. WITHOUT IT THIS FUNCTION GIVES THE DANGEROUS
ANSWER FOR A REMOTE THAT IS ITSELF ABOUT TO BE DELETED — that is the entire
reason the parameter exists. The two-copy-loss scenario, in full:

1. A workspace holds a working repo `app/` and, beside it, a bare mirror
   `team-mirror.git/` (a `git init --bare` push target — an utterly ordinary
   thing to keep in a workspace, and one {@link discoverRepos} now reports
   with `bare: true`).
2. `app/`'s `origin` is that bare mirror, and `app/`'s HEAD is pushed to it.
3. Asked "is HEAD on origin?", this function opens the mirror, finds the
   commit, and answers TRUE — truthfully, but about a repository INSIDE the
   tree that is about to be released.
4. The caller — obeying the documented contract that this is the only signal
   which may justify skipping a bundle — skips `app/`'s bundle.
5. The workspace is deleted. `app/` was skipped because it was safe on the
   mirror; the mirror is deleted along with it. BOTH copies are gone.

Neither half is wrong alone; together they are fatal. So when
`options.workspaceRoot` is given, the remote's URL is expanded
(`git ls-remote --get-url`, which also applies `url.<base>.insteadOf`) and, if
it is a LOCAL path (no scheme, or `file://`) that resolves INSIDE that root,
this returns FALSE without asking anything: a remote inside the archive is not
an offsite copy. A remote outside the workspace, and every network remote, is
asked as usual.

CONTAINMENT IS DECIDED ON CANONICAL PATHS, NOT SPELLING. Path arithmetic alone
answered "outside" for a symlinked remote whose target sits in the workspace,
and for a workspace root handed in as a symlink — the same two-copy loss, one
`ln -s` away. Both paths are therefore canonicalised through the OS
(`readlink -f`, then `realpath`, run through the injected executor). A local
remote that CANNOT be canonicalised is treated as possibly-inside and returns
`false`: in an environment without those tools, a local remote never licenses
skipping a bundle. Network remotes never need resolving and are unaffected.

IT FAILS CLOSED, BY DESIGN. Every failure — no commits yet, an unreachable or
deleted remote, a DNS failure, expired credentials, a rejected TLS handshake,
a remote URL that cannot be classified, the executor itself blowing up —
returns `false`, which means "archive it". The cost of a false `false` is a
bundle that was not strictly necessary; the cost of a false `true` is the
user's only copy of their work.

NOTE ON PRECISION: `ls-remote` lists ref TIPS. A HEAD that is an ancestor of a
remote branch tip (someone pushed further commits on top) reports `false` even
though the commit is safely on the remote. That is the conservative direction
and is deliberate — this function never needs to be right about "safe", only
about "not safe".

```typescript
function headOnRemote(exec: GitExec, repoPath: string, remote: string, options?: { workspaceRoot?: string; }): Promise<boolean>
```

- `exec` — The injected git executor.
- `repoPath` — Absolute path of the repo whose HEAD is being checked. A relative local remote URL is resolved against it, as git does.
- `remote` — Remote NAME (`origin`) or URL to ask. A name is resolved through the repo's config, so a remote that was removed from config fails closed rather than answering from stale local refs.
- `options` — Optional containment check.
- `options.workspaceRoot` — Absolute path of the workspace about to be archived/released. ALWAYS PASS IT when this answer may skip a bundle: a remote resolving inside this root returns `false`, because deleting the workspace deletes that remote too. Omitting it restores the pre-fix behaviour, in which an in-workspace mirror answers `true`. A LOCAL remote is compared on canonical paths (symlinks resolved via the executor), so this root and the remote must be paths the executor can resolve.

**Returns:** True only when the remote lives outside `options.workspaceRoot` (when given), answered, and one of its branch or tag tips is exactly this repo's HEAD commit; false for every other outcome.

#### `restoreRepo(exec, bundlePath, destination, options)`

Restores a bundle into a working repository, with ALL of its refs.

Implemented as `git init` + `git fetch <bundle> '+refs/*:refs/*'` rather than
`git clone`, because CLONE LOSES REFS. A clone materialises one branch, files
the rest under `refs/remotes/origin/*`, and drops `refs/notes/*` and
`refs/stash` entirely — they end up referenced by nothing and die at the next
`gc`. Worse, a bundle whose HEAD is unborn (an orphan checkout) clones into a
repository with no local branch and no checkout at all, even though the bundle
carried every commit. The `+refs/*:refs/*` refspec copies the ref namespace
VERBATIM: branches stay branches, tags stay tags, notes, stashes and the
source's own `refs/remotes/*` all come back exactly as they were.

`--update-head-ok` is required, not incidental: `git fetch` otherwise refuses
to write `refs/heads/<branch>` while that branch is the one `git init` just
pointed HEAD at, which is precisely the common case (a `main` branch restored
into a repo whose `init.defaultBranch` is also `main`).

This is also a REAL integrity check, and the only one there is: `git fetch`
runs index-pack over the bundle's packfile, recomputing its checksum and
inflating every object, so a truncated or bit-flipped bundle fails HERE —
where `verifyBundle` (header-only) still reports okay. See
{@link verifyBundleRestorable} for the scratch-directory form of this check.

PASS `options.headBranch` — NO BUNDLE RECORDS A SYMBOLIC HEAD. A bundle's
`HEAD` line carries a COMMIT SHA and nothing else, so when several branches
point at that commit, which one the source was actually ON is simply not in
the file. The only component that knows is the caller, which captured it as
{@link DiscoveredRepo.branch} during discovery. Pass it and this checks out
exactly that branch.

Without it, the branch is a documented BEST-EFFORT GUESS: the first branch, in
the bundle's ref order, whose tip is HEAD's commit. That is NOT what git does
and never was — `git clone`'s `guess_remote_head` prefers `init.defaultBranch`
first, then `refs/heads/master`, and only then falls back to ref order. So the
guess and a clone disagree, and both can differ from the truth (measured: a
source on `main` with `aaa` and `feature/just-merged` at the same tip restores
onto `aaa` / `feature/just-merged` here, and onto whatever the destination's
`init.defaultBranch` happens to be under clone). No refs or objects are lost
either way — the ref set is exact — but the checked-out branch is wrong, so
pass `headBranch` whenever the caller has it.

Otherwise HEAD is restored from the bundle's own HEAD: onto the guessed
branch, or detached at that commit when no branch matches. When the bundle
carries no HEAD — the source's HEAD was unborn — the refs are restored and
HEAD is left unborn: no branch is checked out and none is invented. Passing
`headBranch` there restores the exact unborn branch the source sat on.

PASS `options.detachedHead` FOR A SOURCE WHOSE HEAD WAS DETACHED. `headBranch`
names a branch, so it cannot express "on no branch at all" — and a source
detached at a commit that some branch ALSO points at was therefore restored
onto that branch, where the next `git commit` would advance a branch the
source never touched. The caller can tell the difference exactly
(`DiscoveredRepo.branch === null` with a non-null `headSha`), so it says so
with `{ detachedHead: true }` and HEAD comes back detached at the same commit.
(A source detached at a commit no branch points at restores detached either
way — that is the only way its commits stay reachable.)

Unlike a clone, the restored repository has NO remote pointing at the bundle
file; re-add the project's real remotes from the captured
`DiscoveredRepo.remotes` when handing the workspace back.

WHAT NO BUNDLE CAN CARRY: REFLOGS. A bundle holds refs and objects, so a
restored repo has no `git reflog` history and no `git stash list` output. The
MOST RECENT stash survives — it is the ref `refs/stash`, and
`git stash apply refs/stash` replays it — but OLDER stash entries
(`stash@{1}` and beyond) exist only in the stash reflog and are NOT archived
by git bundle. Tell users to pop or commit stashes they care about before a
workspace is archived. (`git clone` is worse: it drops `refs/stash` too, so
even the top stash is lost.)

```typescript
function restoreRepo(exec: GitExec, bundlePath: string, destination: string, options?: { headBranch?: string; detachedHead?: boolean; }): Promise<void>
```

- `exec` — The injected git executor.
- `bundlePath` — Absolute path of the bundle to restore from.
- `destination` — Absolute path to restore into. It must not already exist as a non-empty directory, and it is inspected by THIS process (not by the executor), so pass an absolute path this process can see. In a polyrepo workspace, restore each repo to its own recorded `DiscoveredRepo.path`, parents before children.
- `options` — Optional HEAD fidelity.
- `options.headBranch` — The branch the SOURCE repo's HEAD was on, i.e. the captured {@link DiscoveredRepo.branch}. Short (`main`) or fully qualified (`refs/heads/main`). Pass it whenever it is known: the bundle format cannot carry a symbolic HEAD, so this is the only way to restore the right branch when several point at HEAD's commit.
- `options.detachedHead` — True when the SOURCE's HEAD was DETACHED (`DiscoveredRepo.branch === null` with a non-null `headSha`). HEAD is restored detached at the bundle's HEAD commit instead of being put on a branch that merely shares that commit. Cannot be combined with `headBranch` — they describe two different states.

**Returns:** Nothing; the repository exists at `destination` on success.

#### `verifyBundle(exec, bundlePath)`

Checks a bundle's HEADER: is it a bundle, and is it self-contained?

THIS IS NOT AN INTEGRITY CHECK, and that is measured, not assumed. `git bundle
verify` parses the header and checks prerequisites; it does NOT read the
packfile. A bundle truncated to 90% of its bytes, and a bundle with a byte
flipped inside its packfile, BOTH still report "is okay" (verified against git
2.43 and pinned by a test in this package). Treating a `true` from this
function as "the archive is intact" and then deleting the source WOULD LOSE
USER WORK.

WHAT IT DOES PROVE: the file is a real bundle, its header parses, and it has
NO prerequisite commits — i.e. it can be restored standalone, which is the
property an archive depends on. Verification runs against a deliberately EMPTY
git dir, so a bundle that merely happens to be satisfiable by some nearby
repository still fails; only a truly self-contained bundle passes.

The check that DOES read every byte is {@link verifyBundleRestorable}, which
restores the bundle for real (index-pack recomputes the pack checksum and
inflates every object). That is the only check that may precede deleting the
source repo.

```typescript
function verifyBundle(exec: GitExec, bundlePath: string): Promise<boolean>
```

- `exec` — The injected git executor. Note that `git bundle verify` normally refuses to run outside a repository ("need a repository to verify a bundle"), which would make this return a false negative whenever the executor's default cwd is not a repo. An explicit `--git-dir` removes that dependency entirely; git only reads it, and never creates it.
- `bundlePath` — Absolute path of the bundle to verify. A relative path would resolve against the executor's default working directory.

**Returns:** True when git verified the bundle's header as self-contained; false when the file is missing, is not a bundle, has a damaged header, or requires prerequisite commits it does not carry. A `true` says NOTHING about the packfile's integrity.

#### `verifyBundleRestorable(exec, bundlePath, scratchDir)`

Proves a bundle can be RESTORED, by restoring it.

This is the check — the ONLY check — that may precede deleting the source repo
a bundle was made from. `verifyBundle` reads the bundle HEADER: it reports
"okay" for a bundle truncated to 90% of its bytes and for one with a byte
flipped inside the packfile (both measured against real git and pinned by this
package's tests). Deleting a source on the strength of that loses the work.

A real restore runs index-pack over the packfile: every object is inflated and
the pack checksum is recomputed, so both of those corruptions fail here. On
success the restored repository is LEFT IN PLACE at `scratchDir` so the caller
can compare it against the source (ref set, HEAD sha, file contents) before
committing to a deletion — this package never deletes anything, which is
rather the point of it.

```typescript
function verifyBundleRestorable(exec: GitExec, bundlePath: string, scratchDir: string): Promise<boolean>
```

- `exec` — The injected git executor.
- `bundlePath` — Absolute path of the bundle to prove.
- `scratchDir` — Absolute path to restore into. Must not exist, or must be empty; the caller owns it and is responsible for removing it afterwards. Size it for a full checkout of the repo, not for the bundle.

**Returns:** True when the bundle restored cleanly; false when anything went wrong — a corrupt, truncated, missing or non-self-contained bundle, or a scratch directory that could not be used.

#### `verifyWorkspaceReconstruction(exec, workspaceRoot, restored, scratchDir)`

PROVES THE ARCHIVE REBUILDS THE WORKSPACE — the only check that may precede
releasing it.

Every other signal in this package answers a narrower question and can be
wrong in the fatal direction if discovery misunderstood something: a repo shape
the walk did not recognise is a repo that is never bundled, and no per-bundle
check can notice a bundle that was never made. This one does not trust
discovery at all. It ENUMERATES the workspace again by a different mechanism
(`find`, see {@link enumerateRepos}) and RESTORES every bundle for real,
comparing it against the repository it claims to hold. An edge case nobody has
thought of therefore degrades to "the comparison failed, so we did not delete"
instead of "we deleted something we never archived".

IT RUNS EVERY COMMAND ON PINNED CONFIGURATION, because the repository being
inspected configures the inspector. `status.showUntrackedFiles=no` — an
ordinary large-repo performance setting — makes `git status --porcelain` print
nothing about untracked files, which silenced BOTH the checkpoint and this
gate at once: a workspace missing a whole new feature directory reported
`ok: true`. `core.excludesFile`, `core.fsmonitor`, `core.hooksPath`,
`core.attributesFile`, `core.quotePath` and friends are the same shape of
problem. See {@link HERMETIC_CONFIG} for the full list and the reasoning.

What is compared, per archived repo:

- **HEAD commit** — `git rev-parse --verify HEAD` on both sides.
- **HEAD state** — on the same branch, or detached, or unborn. A restore that
  lands on a branch merely sharing HEAD's commit is reported, because the next
  commit there would advance a branch the source never moved.
- **The full ref set** — `git for-each-ref`: every branch, tag, note, stash and
  remote-tracking ref, by name AND object. One entry per differing ref.
- **The complete tracked-content fingerprint** — `git ls-files -s`, which
  carries mode + blob sha + path for EVERY tracked file. One entry per
  differing path (capped at {@link MAX_REPORTED_FILES} per repo, with the
  remainder counted). A bare source has neither index nor working tree, so its
  content is proven by HEAD and the ref set alone — and "bare" is OBSERVED
  (the directory IS the git dir), never taken from `core.bare`, which is a
  claim any repository can make and which disabled both content checks.
- **Uncommitted work** — `git status --porcelain -uall` on the live repo.
  Anything it reports is work no bundle carries; the pipeline's
  `checkpointRepo` step should have committed it, so anything left means that
  step was skipped or failed.
- **Content the checks CANNOT SEE** — a `skip-worktree`/`assume-unchanged`
  index bit makes git report the index and ignore the file on disk, so both
  sides agree while the bytes differ; the executable bit of a tracked file in a
  repo that ignores modes (`core.fileMode=false`) is in no bundle. Both are
  reported rather than assumed harmless.

Then, from the independent enumeration: every repository path the archive does
NOT cover is reported as `unarchived-repo` — unless git PROVES it holds
nothing (no refs, no commits, no uncommitted files), because `git bundle
create` refuses to write an empty bundle, so an empty mirror could not have
been archived by anyone, or unless git says the path is part of an archived
BARE repository's own object store — and every archived repo the enumeration
did NOT see is reported as `enumeration-incomplete`, as is a walk that did not
arrive whole: a mechanism that cannot even find the repos we know about has not
proven anything.

WHAT IT DOES NOT COVER, stated plainly so nobody reads more into an `ok: true`
than it says: this is GIT-based archival, so the unit of proof is a
REPOSITORY, and the unit of transport is a BUNDLE.

- Content that belongs to no repository — loose files in a workspace whose root
  is not itself a repo — is not archived by this package and is not accounted
  for here.
- `.gitignore`d files are outside it too, by design: they are reproducible
  (`node_modules/`, `dist/`) or re-assembled from the control-plane vault
  (`.env*`). Note the gate DOES defeat host-level ignore configuration
  (`core.excludesFile`), so a file ignored only by the HOST is reported.
- The GIT DIR's own contents, which no bundle carries and no restore
  reproduces: hooks (`.git/hooks/*` or a `core.hooksPath` tree), the repo's
  `config` and its remotes (re-add them from the captured
  `DiscoveredRepo.remotes`), `.git/info/exclude`, reflogs (and therefore every
  stash below the top one), and `.git/lfs/objects`. A caller that needs those
  must copy them separately. A whole REPOSITORY parked inside a `.git`
  directory is a different matter and IS reported — only git's own submodule
  and linked-worktree admin dirs are exempt, and those belong to repositories
  enumerated at their working trees.

The bundles are restored into `scratchDir` and LEFT THERE, so a caller can
inspect any difference before deciding. This package deletes nothing, ever.

COST: this restores every bundle, so it takes about as long as the archive did
and needs room for a full checkout of every repo. That is the price of not
guessing.

```typescript
function verifyWorkspaceReconstruction(exec: GitExec, workspaceRoot: string, restored: readonly ArchivedRepo[], scratchDir: string): Promise<ReconstructionReport>
```

- `exec` — The injected git executor.
- `workspaceRoot` — Absolute path of the workspace about to be released.
- `restored` — Every repo that was archived, as `{ repoPath, bundlePath }`. `repoPath` is the workspace-relative path discovery reported ('.' for the root); `bundlePath` is the bundle written for it.
- `scratchDir` — Absolute path of an EMPTY directory to restore into. Each repo gets its own subdirectory; the caller owns and removes it. Reusing a populated scratch directory makes every restore fail.

**Returns:** The report. `ok` is true ONLY when nothing differed and nothing was left unarchived. A CALLER MUST NOT RELEASE, DELETE, OR OVERWRITE THE WORKSPACE UNLESS `ok === true` AND `mismatches` IS EMPTY — every mismatch is work that would not come back.

### Constants

#### `DEFAULT_SKIP_DIRS`

Directories never searched for repos.

Deliberately SHORT. Every name here is machine-written content that is never a
project repository root and inside which a `.git` is never the user's own work.
A directory that merely *usually* holds generated output does NOT qualify: a
`gh-pages` worktree lives in `dist/`, a vendored submodule lives in `vendor/`,
a scratch repo lives in `tmp/`, and skipping those loses real work — so
`dist`, `build`, `out`, `coverage`, `vendor`, `Pods`, `target`, `venv`,
`.venv`, `.tox`, `.gradle`, `.terraform`, `.next`, `.nuxt`, `.svelte-kit`,
`.output`, `.turbo`, `.cache`, `.vite` and `.parcel-cache` are NOT skipped.
They are searched like any other directory.

Per-entry justification:

- `node_modules` — npm/yarn/pnpm install output. Never a project repo root,
  and a `.git` inside it belongs to a dependency, not the user. It is also the
  only entry that matters for walk COST: one `node_modules` holds tens of
  thousands of directories, which is the difference between discovery in
  milliseconds and discovery that is unusable.
- `.git` — a repository's own object store. ALWAYS skipped regardless of this
  list (a custom `skipDirs` cannot re-enable descending into it), and never
  reported as a skipped directory, since its parent is already reported as a repo.
- `.pnpm-store` — pnpm's content-addressed package store: hard-linked package
  contents, never a project repo root.
- `.yarn` — Yarn Berry's `cache/`, `releases/`, and `unplugged/` trees: zipped
  or extracted dependency copies, never a project repo root.
- `bower_components` — legacy Bower install output; the same class as
  `node_modules`.
- `__pycache__` — CPython bytecode cache; only ever holds `.pyc` files written
  by the interpreter.

```typescript
const DEFAULT_SKIP_DIRS: readonly string[]
```

#### `RECONSTRUCTION_MISMATCH_KINDS`

Values used for {@link ReconstructionMismatch.kind}.

All of them are fatal. They are distinguished so an operator can tell "the
archive is missing a whole repository" from "one file's content differs"
without reading prose.

```typescript
const RECONSTRUCTION_MISMATCH_KINDS: { readonly unarchivedRepo: "unarchived-repo"; readonly unverifiableRepo: "unverifiable-repo"; readonly bundleUnrestorable: "bundle-unrestorable"; readonly headMismatch: "head-mismatch"; readonly refMismatch: "ref-mismatch"; readonly contentMismatch: "content-mismatch"; readonly unattestableContent: "unattestable-content"; readonly uncommittedWork: "uncommitted-work"; readonly enumerationIncomplete: "enumeration-incomplete"; }
```

#### `UNREADABLE_REASONS`

Leading tokens used in {@link UnreadableRepo.reason}, so a caller can branch on
the cause without parsing prose.

Each value is a PREFIX: the rest of the string carries git's or the OS's own
message.

```typescript
const UNREADABLE_REASONS: { readonly gitRefused: "git-refused"; readonly skippedDirectory: "skipped-directory"; readonly depthLimit: "depth-limit"; readonly unreadableDirectory: "unreadable-directory"; readonly symlinkedDirectory: "symlinked-directory"; }
```

## Injection Notes

THIS PACKAGE RUNS IMMEDIATELY BEFORE SOMETHING DELETES THE USER'S ONLY COPY.
Every API here is therefore built so that "we archived less" can never be read
as "there was less to archive". Returning fewer repos, a bundle that only
looks intact, or a "pushed" flag that no remote ever confirmed are all the
same bug, and they all end with deleted work.

- **EVERY GIT COMMAND RUNS ON PINNED CONFIGURATION, because the repository
  being inspected configures the inspector.** `status.showUntrackedFiles=no` —
  an ordinary large-repo performance setting — makes `git status --porcelain`
  print NOTHING about untracked files, and measured, that silenced the whole
  pipeline at once: `checkpointRepo` found a "clean" tree and committed
  nothing, the bundle carried neither of the user's new files, and the gate's
  own status was blind in exactly the same way, so it reported `ok: true` for
  an archive missing a whole feature directory. `core.excludesFile` (a HOST
  ignore file) does the same to `git add -A`; `core.fsmonitor` is a user
  PROGRAM whose "nothing changed" answer git trusts; `core.hooksPath` can veto
  or mutate what the archiver runs; `core.quotePath`/`core.ignorecase`/
  `core.precomposeUnicode` decide whether two spellings of a path can even be
  matched up. All of them are pinned with a command-line `-c`, which outranks
  every config scope, in the ONE place every command passes through. The rule
  is "no command runs on unpinned config", not "fix the command that broke".
- **`ok: true` IS NECESSARY BUT NOT SUFFICIENT TO DELETE. Read this before
  wiring a release.** Seven rounds of adversarial review were run against this
  package. Every round closed real defects, and every round found a NEW git
  CONFIGURATION SURFACE that produced `ok: true` while content was lost:
  `status.showUntrackedFiles`, `core.bare`, `skip-worktree`/`assume-unchanged`,
  `core.fileMode`, clean/smudge filters, commit hooks, and finally
  `core.worktree` + `extensions.worktreeConfig` (which relocate the working
  tree, so the checkpoint committed an EMPTY tree and the gate saw nothing
  missing). Each is fixed and pinned by a test. The pattern is the finding: the
  surface is large, attacker-controlled by the very repo being inspected, and
  there is no evidence the list is complete — an absence of known defects is
  not proof of correctness.

  Therefore: run the archive pipeline in REPORT-ONLY mode first, recording what
  it WOULD have released, and require real-world evidence (agreement across a
  meaningful sample of live projects) before enabling deletion — narrowest
  blast radius first. Archiving and deleting are separable operations; only the
  second is irreversible, and nothing here is strong enough to justify
  automating it on day one.

- **`verifyWorkspaceReconstruction` is the STRONGEST available screen.**
  Deciding "this workspace is safe to delete" by enumerating an adversarial
  surface — every git repo shape, every config knob, every filesystem trick —
  is unbounded, and four rounds of review each closed a real defect and each
  found a NEW one of the same class: something invisible, or a safety signal
  that was falsely positive. So the trust boundary moved. Instead of trying to
  be sure discovery understood everything, PROVE THE ARCHIVE RECONSTRUCTS THE
  WORKSPACE with a check that does not depend on discovery being right: a
  second, dumber enumeration (`find`) plus a real restore of every bundle,
  compared against the live repo (HEAD, HEAD state, the full ref set, and the
  `git ls-files -s` fingerprint of every tracked file). An unknown edge case
  then degrades to "the comparison failed, so we did not delete" instead of
  "we deleted something we never archived". RELEASE ONLY WHEN `ok === true`
  AND `mismatches` IS EMPTY. Its unit of proof is a REPOSITORY and its unit of
  transport is a BUNDLE, so three things are outside what an `ok: true`
  asserts, all stated on the function itself: content belonging to no
  repository (loose files in a workspace whose root is not a repo);
  `.gitignore`d files, which are reproducible by design (host-level ignore
  configuration is NOT accepted — only the repository's own); and the GIT
  DIR's own contents, which no bundle carries — hooks, `config` and its
  remotes, `info/exclude`, reflogs (so every stash below the top one), and
  `.git/lfs/objects`. A whole REPOSITORY parked inside a `.git` directory is a
  different matter and IS reported; only git's own submodule and
  linked-worktree admin dirs are exempt, because they belong to repositories
  enumerated at their working trees.
- **The gate proves its own enumeration ARRIVED WHOLE.** `find` is asked to
  print the workspace root last (`-depth`), and a walk whose final record is
  not that path is reported as `enumeration-incomplete`: an executor that caps
  stdout would otherwise return a short list with exit 0, and a short list
  reads as "nothing else is unarchived".
- **Everything else is an ADVISORY INPUT to that gate, not a licence to
  delete.** `discoverRepos`' `unreadable` list, `headOnRemoteTrackingRef`,
  `headOnRemote` and `verifyBundle` each answer one narrow question and each
  has been wrong in the fatal direction at least once. Use them to decide what
  to archive and what to retry; use the reconstruction gate to decide whether
  the workspace may go.

- **A workspace contains MANY repos — never assume one.** The shape to design
  for is a thin repo at the root plus independent repos in subdirectories,
  each with its own remote, GITIGNORED by the root. Git does not recurse into
  a nested repo, so `git bundle` at the root captures NOTHING of the children
  and `git ls-files`/`git status` cannot even see them. `discoverRepos` does a
  FILESYSTEM walk for `.git` (handling `.git` as a directory OR as a file, as
  linked worktrees and submodules use). Checkpoint and bundle EVERY returned
  repo independently, and derive each bundle's FILENAME from the repo's
  workspace path (`encodeURIComponent(repo.path)`) — a workspace routinely has
  two repos called `api`, and a name taken from the basename overwrites one
  archive with the other.
- **BARE repos are repos.** A `git init --bare` mirror (`team-mirror.git/`)
  has no `.git` entry, so a walk that matches only on `.git` returns
  `{ repos: [], unreadable: [] }` for a workspace containing one — ZERO
  signal, and a caller obeying the contract below deletes it. Discovery
  therefore also matches the bare shape — a `HEAD` file beside an `objects/`
  directory. `refs/` is NOT part of that shape, although git's own
  `is_git_directory()` checks for it: a PACKED mirror (`git gc`, the normal
  state of an idle one) keeps its refs in `packed-refs`, and the then-empty
  `refs/` does not survive a zip, an object-storage key sync or a `git
  archive` — measured, such a directory holding the only copy of a commit was
  nominated by nobody and the gate said `ok: true`.
- **Bareness is OBSERVED, not read from `core.bare`.** A repository IS bare
  when its directory IS its git dir (`git rev-parse --absolute-git-dir`), not
  when its config claims so. That claim is wrong in the wild in BOTH
  directions, and both hurt: `core.bare=true` on a repo with a real working
  tree made every content check skip it, so an edited file archived at its OLD
  content and an untracked file was dropped, with `ok: true`; `core.bare=false`
  on a genuine mirror turned an archivable repo into an `unreadable` entry. A
  repo that has a working tree while claiming to be bare is checkpointed and
  compared like any other (measured: that needs an explicit `--work-tree`;
  `-c core.bare=false` alone is not enough for `status`/`add`).
  A genuinely bare repo reports `bare: true` with `dirty: false` and is never
  descended into. It makes `checkpointRepo` THROW (no working tree, nothing to
  commit) and must still be passed to `bundleRepo`, which handles it normally —
  except an EMPTY bare mirror (no refs at all), which `bundleRepo` names
  explicitly as "skip it", since there is no working tree to checkpoint and
  nothing to bundle.
- **A bare repo narrows coverage for NOTHING beyond its own object store.**
  Whether a path inside one is "just git storage" is decided by asking git
  (`rev-parse --absolute-git-dir` there must answer with that mirror's git
  dir), never by a path prefix. Measured: a prefix rule swallowed a real
  repository nested under a mirror, and — when the workspace ROOT was itself a
  bare repo — matched every path in the workspace, turning the entire coverage
  check into a no-op that reported `ok: true` for an archive holding one
  repository out of two.
- **A bare-SHAPED directory git does not confirm must never remove its
  subtree.** The shape is matched cheaply and generously, so an interrupted
  `cp` of a mirror (a zero-length `HEAD` beside `objects/` and `refs/`) or
  three dangling symlinks with those names also match. Because a confirmed
  bare repo is not descended into, a REJECTED one used to take every
  repository below it out of the results with zero signal — strictly worse
  than not looking for bare repos at all. Discovery now re-searches it: git
  refusing it yields a `git-refused` entry AND the subtree is searched; git
  attributing it to the enclosing repository yields no entry, because nothing
  is then unsearched.
- **`discoverRepos` returns `{ repos, unreadable }`, and a non-empty
  `unreadable` means DO NOT RELEASE THE WORKSPACE.** Anything git declines to
  open goes there with git's own message rather than being dropped: "dubious
  ownership" (the standard Docker bind-mount uid mismatch — under it EVERY
  repo would otherwise disappear and the archive would report success with
  zero bundles), EACCES, an unknown `extensions.*` from a newer git, a stale
  worktree pointer. So do a repository hiding inside a skipped directory
  (`skipped-directory`), a directory that could not be listed
  (`unreadable-directory`), a symlinked directory pointing OUT of the
  workspace (`symlinked-directory` — links are never followed, so its contents
  are neither searched nor archived, and a restored workspace holds a dangling
  link), and a search truncated at `maxDepth` (`depth-limit`) — a truncated
  search must never look exhaustive. A missing or unreadable `workspaceRoot`
  THROWS instead of returning an empty result. This list says where discovery
  could NOT look; it is an input to the safety gate, never a substitute for it.
- **`headOnRemoteTrackingRef` is CACHED LOCAL STATE and must never justify
  skipping a bundle.** It reads `refs/remotes/<name>/`, which is a local cache
  of what a remote looked like at the last fetch/push. This package does not
  contact any remote to compute it, so it stays `true` after the branch is
  deleted on the remote, after the remote repository is deleted entirely, and
  after a force-push rewrites the history away. Scanning per CONFIGURED remote
  at least keeps it self-consistent (it can never be `true` with `remotes: []`,
  which the old whole-namespace scan reported once a remote was removed from
  config). The only signal that may justify skipping a bundle is
  `headOnRemote`, which opens a connection (`git ls-remote`), needs network and
  credentials, and fails CLOSED — any error means "bundle it". Note that a
  repo skipped on that basis is a repo the reconstruction gate will then report
  as `unarchived-repo`: skipping bundles and releasing the workspace are two
  different decisions, and only the gate authorises the second.
- **`headOnRemote` needs `{ workspaceRoot }`, or it can bless a remote that is
  about to be deleted too.** Wire a workspace's own bare mirror as `origin`
  for a working repo beside it, push, and `headOnRemote` answers `true` — so
  the caller skips that repo's bundle because it is "safe on the remote", and
  then deletes the workspace, taking the mirror with it. BOTH copies die.
  Passing `workspaceRoot` makes a remote whose URL resolves INSIDE the
  workspace (a plain path or `file://`) return `false`: a remote inside the
  archive is not an offsite copy. Network remotes are unaffected.
- **Containment is judged on CANONICAL paths, because a symlink defeated the
  arithmetic one.** Comparing path strings answered "outside the workspace"
  for an `origin` that was a symlink to the in-workspace mirror, and for a
  `workspaceRoot` handed in as a symlink while the remote was spelled
  canonically — reopening the two-copy loss with one `ln -s`. Both paths are
  now resolved through the OS (`readlink -f`, then `realpath`) before the
  comparison, and a LOCAL remote that cannot be resolved returns `false`
  (fail closed: it might be inside).
- **`verifyBundle` is a HEADER check, not an integrity check.** `git bundle
  verify` parses the header and checks prerequisites; it does not read the
  packfile. A bundle truncated to 90% of its bytes, and one with a byte
  flipped inside the pack, BOTH still report "is okay" (measured against git
  2.43 and pinned by this package's tests). `verifyBundleRestorable` restores
  the bundle for real, so index-pack recomputes the pack checksum and inflates
  every object — that is what makes it meaningful, and it is the right
  per-bundle check. It is still only PER-BUNDLE: it says nothing about a repo
  that was never bundled, or a bundle that restores cleanly to something other
  than what the workspace holds. `verifyWorkspaceReconstruction` answers those,
  and it is the only result that may precede releasing the workspace.
- **`restoreRepo` brings back EVERY ref, because `git clone` does not.** A
  clone materialises one branch, files the rest under `refs/remotes/origin/*`,
  and drops `refs/notes/*` and `refs/stash` completely — unreferenced, they
  die at the next `gc` — while a bundle whose HEAD is unborn clones into a
  repository with no branch and no checkout at all. Restore is therefore
  `git init` + `git fetch <bundle> '+refs/*:refs/*'`, which copies the ref
  namespace verbatim, then puts HEAD back where the bundle's HEAD was (on the
  matching branch, or detached), or leaves it unborn when the bundle carries
  no HEAD. The restored repo has NO remote pointing at the bundle; re-add the
  project's real remotes from the captured `DiscoveredRepo.remotes`. Restore
  parents before children — a non-empty destination is refused.
- **Pass `restoreRepo`'s `{ headBranch }` — a bundle cannot record which
  branch HEAD was on.** The bundle's `HEAD` line is a bare commit sha, so when
  several branches point at that commit the source's actual branch is not in
  the file: a source on `main` with `aaa` (or `feature/just-merged`) at the
  same tip restores onto the wrong one. No refs or objects are lost — the ref
  set is exact — but the checkout is wrong. The caller already has the answer
  in `DiscoveredRepo.branch`; pass it. Omitting it falls back to a documented
  guess (first branch in the bundle's ref order at HEAD's commit), which is
  NOT what `git clone` does either (`guess_remote_head` prefers
  `init.defaultBranch`, then `refs/heads/master`, then ref order). For a
  DETACHED source (`branch === null` with a `headSha`) pass
  `{ detachedHead: true }` instead: a branch name cannot express "on no branch",
  and without it the restore lands on whichever branch shares the commit, where
  the next commit would advance a branch the source never moved.
- **No bundle carries REFLOGS, so stashes are only partly archivable.** A
  bundle holds refs and objects; a restored repo therefore has no `git reflog`
  and an empty `git stash list`. The most recent stash survives as the ref
  `refs/stash` (`git stash apply refs/stash` replays it), but OLDER stash
  entries live only in the stash reflog and are NOT archived by git — warn
  users to pop or commit stashes they care about before a workspace is
  archived. (`git clone` drops `refs/stash` as well, losing even that one.)
- **`checkpointRepo` refuses a repo mid-operation, and a BARE one.** A merge,
  rebase, cherry-pick, `git am` or bisect that has not finished leaves
  conflict markers and a half-applied state in the working tree; committing
  that writes `<<<<<<< HEAD` onto the user's branch. It throws instead, naming
  the state and how to finish or abandon it. A bare repo has no working tree
  at all, so it throws there too — bundle it directly. Otherwise it stages
  with `git add -A` (which respects `.gitignore`, so `node_modules/`, `dist/`,
  and `.env*` stay out) and supplies a machine identity when the repo has no
  `user.email`. It returns null on a clean tree.
- **NO HOOK CAN VETO A CHECKPOINT — and `--no-verify` is not what guarantees
  that.** Measured one hook at a time against git 2.43: `--no-verify` skips
  EXACTLY `pre-commit` and `commit-msg`. It does NOT skip
  `prepare-commit-msg`, which still runs and whose non-zero exit ABORTS the
  commit — so a husky `prepare-commit-msg` driving commitizen/commitlint
  (which fail closed in a sandbox without them) made EVERY archive for that
  project throw with the user's work still uncommitted. The commit therefore
  also runs with `-c core.hooksPath=/dev/null/…`, a path under a character
  device where no hook file can exist, which overrides both `.git/hooks` and a
  repo-level `core.hooksPath`. `--no-verify` and `--no-gpg-sign` are kept
  (`commit.gpgsign` must not veto archival either).
- **NO CONTENT FILTER CAN VETO ONE EITHER — the same veto, a different knob.**
  A git-lfs repo configures `filter.lfs.process` + `filter.lfs.required=true`;
  in an archival sandbox without the `git-lfs` binary that filter fails, and
  measured on git 2.43 it takes down `git status`, `git add -A` AND `git
  commit` (which refreshes the index and re-runs the clean filter). Every
  git-lfs project therefore failed to archive. Each step now RETRIES with
  every configured driver neutralised — `filter.<d>.process=`, `.clean=`,
  `.smudge=`, `.required=false`, which is the combination that actually works
  (`required=false` alone does NOT: the process filter still fails to start) —
  and git stores the raw bytes, which an archive wants anyway. The retry
  happens only AFTER a real failure, so a repo whose git-lfs works keeps
  producing pointers; if the retry fails too, `checkpointRepo` THROWS and NAMES
  the driver rather than committing content only some of whose files were
  filtered. Separately: a bundle does not carry `.git/lfs/objects`, so an LFS
  project's large files are NOT in the archive — only their pointers.
- **A `skip-worktree` / `assume-unchanged` bit hides a file from EVERY check,
  so the gate reports it instead of trusting it.** Both make git answer from
  the INDEX and never look at the file on disk — which is exactly why they are
  the documented recipe for keeping local edits to a tracked config file out
  of commits, and what sparse-checkout sets. Measured: with them set, `git
  status` is silent and the live and restored `ls-files -s` agree perfectly
  while the working tree holds different bytes, so the gate passed an archive
  that restored the OLD content of an edited file. `git ls-files -v` sees the
  bits (`S`, or a lowercase tag) and every such path is reported as
  `unattestable-content`: its true content cannot be attested, so it is not
  claimed.
- **`headSha === null` does NOT mean "empty, safe to skip".** A repo on an
  unborn branch can still carry branches, tags, notes and stashes. `bundleRepo`
  throws ONLY for a repo with no refs at all AND an unborn HEAD; that error —
  not `headSha` — is the signal that there is genuinely nothing to archive.
- **Nothing is lost by omitting `.env*`**: secrets live encrypted in the
  control-plane vault and the sandbox `.env` is assembled at boot. Everything
  else `.gitignore` drops (`node_modules/`, `dist/`, vendored packages,
  coverage) is reproducible.
- **`DEFAULT_SKIP_DIRS` is deliberately short.** Only machine-written trees
  that are never a project repo root are skipped (`node_modules`, `.git`,
  `.pnpm-store`, `.yarn`, `bower_components`, `__pycache__`). `dist`, `build`,
  `out`, `vendor`, `Pods`, `target`, `venv`, `tmp` and friends ARE searched: a
  `gh-pages` worktree lives in `dist/`, a vendored submodule lives in
  `vendor/`, and skipping those silently never archived them.
- **`GitRemote.url` may embed credentials** (the `user:token@host` userinfo form) —
  git stores them that way. Treat it as a secret: do not log it or surface it
  in archive metadata.
- Discovery, the mid-operation check, and the restore destination check read
  the filesystem directly, so those paths must be visible to THIS process (run
  it inside the sandbox, or over the mounted volume) and should be the same
  absolute paths the executor understands. Symlinked directories are never
  followed, and linked worktrees are reported as separate repos (their bundle
  carries the main repo's refs — duplicated data, never lost data).
- **Two checks need an OS tool, not git**, and reach it through the same
  injected executor (git runs a `!`-prefixed alias as a shell command, with
  every argument still a separate argv element, so nothing is interpolated):
  the reconstruction gate's independent enumeration (`find` — deliberately
  sharing no logic with discovery) and the containment check's path
  canonicalisation (`readlink -f`, then `realpath`). Without them the gate
  THROWS (it will not report "nothing unarchived" it cannot back up) and
  `headOnRemote` returns `false` for local remotes (it will not bless one it
  cannot place).
