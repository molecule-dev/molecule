/**
 * Git-based source archival for a POLYREPO project workspace.
 *
 * Archives a dormant project's source VIA GIT instead of a bespoke tarball:
 * `discoverRepos` finds every repository in the workspace (and reports every
 * place it could NOT look), `checkpointRepo` commits whatever was left
 * uncommitted, `bundleRepo` writes each repo to one self-contained `.bundle`
 * file, `verifyBundleRestorable` proves that bundle can actually be restored,
 * `verifyWorkspaceReconstruction` proves the ARCHIVE AS A WHOLE rebuilds the
 * workspace, and `restoreRepo` brings each repo back with all of its refs. Git
 * gives delta compression across re-archives, a content-addressed integrity
 * model, a format users already understand, and zero cost when the user already
 * pushes to their own remote.
 *
 * Every function takes an injected `GitExec` — argv in, `{ stdout, stderr,
 * exitCode }` out — so the same code drives a sandbox exec, a local shell, or a
 * test double. This package never imports `child_process`, and never builds a
 * command by string interpolation, so a repo path containing a space, a quote,
 * or a leading dash cannot break, inject, or be parsed as a flag.
 *
 * @remarks
 * THIS PACKAGE RUNS IMMEDIATELY BEFORE SOMETHING DELETES THE USER'S ONLY COPY.
 * Every API here is therefore built so that "we archived less" can never be read
 * as "there was less to archive". Returning fewer repos, a bundle that only
 * looks intact, or a "pushed" flag that no remote ever confirmed are all the
 * same bug, and they all end with deleted work.
 *
 * - **EVERY GIT COMMAND RUNS ON PINNED CONFIGURATION, because the repository
 *   being inspected configures the inspector.** `status.showUntrackedFiles=no` —
 *   an ordinary large-repo performance setting — makes `git status --porcelain`
 *   print NOTHING about untracked files, and measured, that silenced the whole
 *   pipeline at once: `checkpointRepo` found a "clean" tree and committed
 *   nothing, the bundle carried neither of the user's new files, and the gate's
 *   own status was blind in exactly the same way, so it reported `ok: true` for
 *   an archive missing a whole feature directory. `core.excludesFile` (a HOST
 *   ignore file) does the same to `git add -A`; `core.fsmonitor` is a user
 *   PROGRAM whose "nothing changed" answer git trusts; `core.hooksPath` can veto
 *   or mutate what the archiver runs; `core.quotePath`/`core.ignorecase`/
 *   `core.precomposeUnicode` decide whether two spellings of a path can even be
 *   matched up. All of them are pinned with a command-line `-c`, which outranks
 *   every config scope, in the ONE place every command passes through. The rule
 *   is "no command runs on unpinned config", not "fix the command that broke".
 * - **`ok: true` IS NECESSARY BUT NOT SUFFICIENT TO DELETE. Read this before
 *   wiring a release.** Seven rounds of adversarial review were run against this
 *   package. Every round closed real defects, and every round found a NEW git
 *   CONFIGURATION SURFACE that produced `ok: true` while content was lost:
 *   `status.showUntrackedFiles`, `core.bare`, `skip-worktree`/`assume-unchanged`,
 *   `core.fileMode`, clean/smudge filters, commit hooks, and finally
 *   `core.worktree` + `extensions.worktreeConfig` (which relocate the working
 *   tree, so the checkpoint committed an EMPTY tree and the gate saw nothing
 *   missing). Each is fixed and pinned by a test. The pattern is the finding: the
 *   surface is large, attacker-controlled by the very repo being inspected, and
 *   there is no evidence the list is complete — an absence of known defects is
 *   not proof of correctness.
 *
 *   Therefore: run the archive pipeline in REPORT-ONLY mode first, recording what
 *   it WOULD have released, and require real-world evidence (agreement across a
 *   meaningful sample of live projects) before enabling deletion — narrowest
 *   blast radius first. Archiving and deleting are separable operations; only the
 *   second is irreversible, and nothing here is strong enough to justify
 *   automating it on day one.
 *
 * - **`verifyWorkspaceReconstruction` is the STRONGEST available screen.**
 *   Deciding "this workspace is safe to delete" by enumerating an adversarial
 *   surface — every git repo shape, every config knob, every filesystem trick —
 *   is unbounded, and four rounds of review each closed a real defect and each
 *   found a NEW one of the same class: something invisible, or a safety signal
 *   that was falsely positive. So the trust boundary moved. Instead of trying to
 *   be sure discovery understood everything, PROVE THE ARCHIVE RECONSTRUCTS THE
 *   WORKSPACE with a check that does not depend on discovery being right: a
 *   second, dumber enumeration (`find`) plus a real restore of every bundle,
 *   compared against the live repo (HEAD, HEAD state, the full ref set, and the
 *   `git ls-files -s` fingerprint of every tracked file). An unknown edge case
 *   then degrades to "the comparison failed, so we did not delete" instead of
 *   "we deleted something we never archived". RELEASE ONLY WHEN `ok === true`
 *   AND `mismatches` IS EMPTY. Its unit of proof is a REPOSITORY and its unit of
 *   transport is a BUNDLE, so three things are outside what an `ok: true`
 *   asserts, all stated on the function itself: content belonging to no
 *   repository (loose files in a workspace whose root is not a repo);
 *   `.gitignore`d files, which are reproducible by design (host-level ignore
 *   configuration is NOT accepted — only the repository's own); and the GIT
 *   DIR's own contents, which no bundle carries — hooks, `config` and its
 *   remotes, `info/exclude`, reflogs (so every stash below the top one), and
 *   `.git/lfs/objects`. A whole REPOSITORY parked inside a `.git` directory is a
 *   different matter and IS reported; only git's own submodule and
 *   linked-worktree admin dirs are exempt, because they belong to repositories
 *   enumerated at their working trees.
 * - **The gate proves its own enumeration ARRIVED WHOLE.** `find` is asked to
 *   print the workspace root last (`-depth`), and a walk whose final record is
 *   not that path is reported as `enumeration-incomplete`: an executor that caps
 *   stdout would otherwise return a short list with exit 0, and a short list
 *   reads as "nothing else is unarchived".
 * - **Everything else is an ADVISORY INPUT to that gate, not a licence to
 *   delete.** `discoverRepos`' `unreadable` list, `headOnRemoteTrackingRef`,
 *   `headOnRemote` and `verifyBundle` each answer one narrow question and each
 *   has been wrong in the fatal direction at least once. Use them to decide what
 *   to archive and what to retry; use the reconstruction gate to decide whether
 *   the workspace may go.
 *
 * - **A workspace contains MANY repos — never assume one.** The shape to design
 *   for is a thin repo at the root plus independent repos in subdirectories,
 *   each with its own remote, GITIGNORED by the root. Git does not recurse into
 *   a nested repo, so `git bundle` at the root captures NOTHING of the children
 *   and `git ls-files`/`git status` cannot even see them. `discoverRepos` does a
 *   FILESYSTEM walk for `.git` (handling `.git` as a directory OR as a file, as
 *   linked worktrees and submodules use). Checkpoint and bundle EVERY returned
 *   repo independently, and derive each bundle's FILENAME from the repo's
 *   workspace path (`encodeURIComponent(repo.path)`) — a workspace routinely has
 *   two repos called `api`, and a name taken from the basename overwrites one
 *   archive with the other.
 * - **BARE repos are repos.** A `git init --bare` mirror (`team-mirror.git/`)
 *   has no `.git` entry, so a walk that matches only on `.git` returns
 *   `{ repos: [], unreadable: [] }` for a workspace containing one — ZERO
 *   signal, and a caller obeying the contract below deletes it. Discovery
 *   therefore also matches the bare shape — a `HEAD` file beside an `objects/`
 *   directory. `refs/` is NOT part of that shape, although git's own
 *   `is_git_directory()` checks for it: a PACKED mirror (`git gc`, the normal
 *   state of an idle one) keeps its refs in `packed-refs`, and the then-empty
 *   `refs/` does not survive a zip, an object-storage key sync or a `git
 *   archive` — measured, such a directory holding the only copy of a commit was
 *   nominated by nobody and the gate said `ok: true`.
 * - **Bareness is OBSERVED, not read from `core.bare`.** A repository IS bare
 *   when its directory IS its git dir (`git rev-parse --absolute-git-dir`), not
 *   when its config claims so. That claim is wrong in the wild in BOTH
 *   directions, and both hurt: `core.bare=true` on a repo with a real working
 *   tree made every content check skip it, so an edited file archived at its OLD
 *   content and an untracked file was dropped, with `ok: true`; `core.bare=false`
 *   on a genuine mirror turned an archivable repo into an `unreadable` entry. A
 *   repo that has a working tree while claiming to be bare is checkpointed and
 *   compared like any other (measured: that needs an explicit `--work-tree`;
 *   `-c core.bare=false` alone is not enough for `status`/`add`).
 *   A genuinely bare repo reports `bare: true` with `dirty: false` and is never
 *   descended into. It makes `checkpointRepo` THROW (no working tree, nothing to
 *   commit) and must still be passed to `bundleRepo`, which handles it normally —
 *   except an EMPTY bare mirror (no refs at all), which `bundleRepo` names
 *   explicitly as "skip it", since there is no working tree to checkpoint and
 *   nothing to bundle.
 * - **A bare repo narrows coverage for NOTHING beyond its own object store.**
 *   Whether a path inside one is "just git storage" is decided by asking git
 *   (`rev-parse --absolute-git-dir` there must answer with that mirror's git
 *   dir), never by a path prefix. Measured: a prefix rule swallowed a real
 *   repository nested under a mirror, and — when the workspace ROOT was itself a
 *   bare repo — matched every path in the workspace, turning the entire coverage
 *   check into a no-op that reported `ok: true` for an archive holding one
 *   repository out of two.
 * - **A bare-SHAPED directory git does not confirm must never remove its
 *   subtree.** The shape is matched cheaply and generously, so an interrupted
 *   `cp` of a mirror (a zero-length `HEAD` beside `objects/` and `refs/`) or
 *   three dangling symlinks with those names also match. Because a confirmed
 *   bare repo is not descended into, a REJECTED one used to take every
 *   repository below it out of the results with zero signal — strictly worse
 *   than not looking for bare repos at all. Discovery now re-searches it: git
 *   refusing it yields a `git-refused` entry AND the subtree is searched; git
 *   attributing it to the enclosing repository yields no entry, because nothing
 *   is then unsearched.
 * - **`discoverRepos` returns `{ repos, unreadable }`, and a non-empty
 *   `unreadable` means DO NOT RELEASE THE WORKSPACE.** Anything git declines to
 *   open goes there with git's own message rather than being dropped: "dubious
 *   ownership" (the standard Docker bind-mount uid mismatch — under it EVERY
 *   repo would otherwise disappear and the archive would report success with
 *   zero bundles), EACCES, an unknown `extensions.*` from a newer git, a stale
 *   worktree pointer. So do a repository hiding inside a skipped directory
 *   (`skipped-directory`), a directory that could not be listed
 *   (`unreadable-directory`), a symlinked directory pointing OUT of the
 *   workspace (`symlinked-directory` — links are never followed, so its contents
 *   are neither searched nor archived, and a restored workspace holds a dangling
 *   link), and a search truncated at `maxDepth` (`depth-limit`) — a truncated
 *   search must never look exhaustive. A missing or unreadable `workspaceRoot`
 *   THROWS instead of returning an empty result. This list says where discovery
 *   could NOT look; it is an input to the safety gate, never a substitute for it.
 * - **`headOnRemoteTrackingRef` is CACHED LOCAL STATE and must never justify
 *   skipping a bundle.** It reads `refs/remotes/<name>/`, which is a local cache
 *   of what a remote looked like at the last fetch/push. This package does not
 *   contact any remote to compute it, so it stays `true` after the branch is
 *   deleted on the remote, after the remote repository is deleted entirely, and
 *   after a force-push rewrites the history away. Scanning per CONFIGURED remote
 *   at least keeps it self-consistent (it can never be `true` with `remotes: []`,
 *   which the old whole-namespace scan reported once a remote was removed from
 *   config). The only signal that may justify skipping a bundle is
 *   `headOnRemote`, which opens a connection (`git ls-remote`), needs network and
 *   credentials, and fails CLOSED — any error means "bundle it". Note that a
 *   repo skipped on that basis is a repo the reconstruction gate will then report
 *   as `unarchived-repo`: skipping bundles and releasing the workspace are two
 *   different decisions, and only the gate authorises the second.
 * - **`headOnRemote` needs `{ workspaceRoot }`, or it can bless a remote that is
 *   about to be deleted too.** Wire a workspace's own bare mirror as `origin`
 *   for a working repo beside it, push, and `headOnRemote` answers `true` — so
 *   the caller skips that repo's bundle because it is "safe on the remote", and
 *   then deletes the workspace, taking the mirror with it. BOTH copies die.
 *   Passing `workspaceRoot` makes a remote whose URL resolves INSIDE the
 *   workspace (a plain path or `file://`) return `false`: a remote inside the
 *   archive is not an offsite copy. Network remotes are unaffected.
 * - **Containment is judged on CANONICAL paths, because a symlink defeated the
 *   arithmetic one.** Comparing path strings answered "outside the workspace"
 *   for an `origin` that was a symlink to the in-workspace mirror, and for a
 *   `workspaceRoot` handed in as a symlink while the remote was spelled
 *   canonically — reopening the two-copy loss with one `ln -s`. Both paths are
 *   now resolved through the OS (`readlink -f`, then `realpath`) before the
 *   comparison, and a LOCAL remote that cannot be resolved returns `false`
 *   (fail closed: it might be inside).
 * - **`verifyBundle` is a HEADER check, not an integrity check.** `git bundle
 *   verify` parses the header and checks prerequisites; it does not read the
 *   packfile. A bundle truncated to 90% of its bytes, and one with a byte
 *   flipped inside the pack, BOTH still report "is okay" (measured against git
 *   2.43 and pinned by this package's tests). `verifyBundleRestorable` restores
 *   the bundle for real, so index-pack recomputes the pack checksum and inflates
 *   every object — that is what makes it meaningful, and it is the right
 *   per-bundle check. It is still only PER-BUNDLE: it says nothing about a repo
 *   that was never bundled, or a bundle that restores cleanly to something other
 *   than what the workspace holds. `verifyWorkspaceReconstruction` answers those,
 *   and it is the only result that may precede releasing the workspace.
 * - **`restoreRepo` brings back EVERY ref, because `git clone` does not.** A
 *   clone materialises one branch, files the rest under `refs/remotes/origin/*`,
 *   and drops `refs/notes/*` and `refs/stash` completely — unreferenced, they
 *   die at the next `gc` — while a bundle whose HEAD is unborn clones into a
 *   repository with no branch and no checkout at all. Restore is therefore
 *   `git init` + `git fetch <bundle> '+refs/*:refs/*'`, which copies the ref
 *   namespace verbatim, then puts HEAD back where the bundle's HEAD was (on the
 *   matching branch, or detached), or leaves it unborn when the bundle carries
 *   no HEAD. The restored repo has NO remote pointing at the bundle; re-add the
 *   project's real remotes from the captured `DiscoveredRepo.remotes`. Restore
 *   parents before children — a non-empty destination is refused.
 * - **Pass `restoreRepo`'s `{ headBranch }` — a bundle cannot record which
 *   branch HEAD was on.** The bundle's `HEAD` line is a bare commit sha, so when
 *   several branches point at that commit the source's actual branch is not in
 *   the file: a source on `main` with `aaa` (or `feature/just-merged`) at the
 *   same tip restores onto the wrong one. No refs or objects are lost — the ref
 *   set is exact — but the checkout is wrong. The caller already has the answer
 *   in `DiscoveredRepo.branch`; pass it. Omitting it falls back to a documented
 *   guess (first branch in the bundle's ref order at HEAD's commit), which is
 *   NOT what `git clone` does either (`guess_remote_head` prefers
 *   `init.defaultBranch`, then `refs/heads/master`, then ref order). For a
 *   DETACHED source (`branch === null` with a `headSha`) pass
 *   `{ detachedHead: true }` instead: a branch name cannot express "on no branch",
 *   and without it the restore lands on whichever branch shares the commit, where
 *   the next commit would advance a branch the source never moved.
 * - **No bundle carries REFLOGS, so stashes are only partly archivable.** A
 *   bundle holds refs and objects; a restored repo therefore has no `git reflog`
 *   and an empty `git stash list`. The most recent stash survives as the ref
 *   `refs/stash` (`git stash apply refs/stash` replays it), but OLDER stash
 *   entries live only in the stash reflog and are NOT archived by git — warn
 *   users to pop or commit stashes they care about before a workspace is
 *   archived. (`git clone` drops `refs/stash` as well, losing even that one.)
 * - **`checkpointRepo` refuses a repo mid-operation, and a BARE one.** A merge,
 *   rebase, cherry-pick, `git am` or bisect that has not finished leaves
 *   conflict markers and a half-applied state in the working tree; committing
 *   that writes `<<<<<<< HEAD` onto the user's branch. It throws instead, naming
 *   the state and how to finish or abandon it. A bare repo has no working tree
 *   at all, so it throws there too — bundle it directly. Otherwise it stages
 *   with `git add -A` (which respects `.gitignore`, so `node_modules/`, `dist/`,
 *   and `.env*` stay out) and supplies a machine identity when the repo has no
 *   `user.email`. It returns null on a clean tree.
 * - **NO HOOK CAN VETO A CHECKPOINT — and `--no-verify` is not what guarantees
 *   that.** Measured one hook at a time against git 2.43: `--no-verify` skips
 *   EXACTLY `pre-commit` and `commit-msg`. It does NOT skip
 *   `prepare-commit-msg`, which still runs and whose non-zero exit ABORTS the
 *   commit — so a husky `prepare-commit-msg` driving commitizen/commitlint
 *   (which fail closed in a sandbox without them) made EVERY archive for that
 *   project throw with the user's work still uncommitted. The commit therefore
 *   also runs with `-c core.hooksPath=/dev/null/…`, a path under a character
 *   device where no hook file can exist, which overrides both `.git/hooks` and a
 *   repo-level `core.hooksPath`. `--no-verify` and `--no-gpg-sign` are kept
 *   (`commit.gpgsign` must not veto archival either).
 * - **NO CONTENT FILTER CAN VETO ONE EITHER — the same veto, a different knob.**
 *   A git-lfs repo configures `filter.lfs.process` + `filter.lfs.required=true`;
 *   in an archival sandbox without the `git-lfs` binary that filter fails, and
 *   measured on git 2.43 it takes down `git status`, `git add -A` AND `git
 *   commit` (which refreshes the index and re-runs the clean filter). Every
 *   git-lfs project therefore failed to archive. Each step now RETRIES with
 *   every configured driver neutralised — `filter.<d>.process=`, `.clean=`,
 *   `.smudge=`, `.required=false`, which is the combination that actually works
 *   (`required=false` alone does NOT: the process filter still fails to start) —
 *   and git stores the raw bytes, which an archive wants anyway. The retry
 *   happens only AFTER a real failure, so a repo whose git-lfs works keeps
 *   producing pointers; if the retry fails too, `checkpointRepo` THROWS and NAMES
 *   the driver rather than committing content only some of whose files were
 *   filtered. Separately: a bundle does not carry `.git/lfs/objects`, so an LFS
 *   project's large files are NOT in the archive — only their pointers.
 * - **A `skip-worktree` / `assume-unchanged` bit hides a file from EVERY check,
 *   so the gate reports it instead of trusting it.** Both make git answer from
 *   the INDEX and never look at the file on disk — which is exactly why they are
 *   the documented recipe for keeping local edits to a tracked config file out
 *   of commits, and what sparse-checkout sets. Measured: with them set, `git
 *   status` is silent and the live and restored `ls-files -s` agree perfectly
 *   while the working tree holds different bytes, so the gate passed an archive
 *   that restored the OLD content of an edited file. `git ls-files -v` sees the
 *   bits (`S`, or a lowercase tag) and every such path is reported as
 *   `unattestable-content`: its true content cannot be attested, so it is not
 *   claimed.
 * - **`headSha === null` does NOT mean "empty, safe to skip".** A repo on an
 *   unborn branch can still carry branches, tags, notes and stashes. `bundleRepo`
 *   throws ONLY for a repo with no refs at all AND an unborn HEAD; that error —
 *   not `headSha` — is the signal that there is genuinely nothing to archive.
 * - **Nothing is lost by omitting `.env*`**: secrets live encrypted in the
 *   control-plane vault and the sandbox `.env` is assembled at boot. Everything
 *   else `.gitignore` drops (`node_modules/`, `dist/`, vendored packages,
 *   coverage) is reproducible.
 * - **`DEFAULT_SKIP_DIRS` is deliberately short.** Only machine-written trees
 *   that are never a project repo root are skipped (`node_modules`, `.git`,
 *   `.pnpm-store`, `.yarn`, `bower_components`, `__pycache__`). `dist`, `build`,
 *   `out`, `vendor`, `Pods`, `target`, `venv`, `tmp` and friends ARE searched: a
 *   `gh-pages` worktree lives in `dist/`, a vendored submodule lives in
 *   `vendor/`, and skipping those silently never archived them.
 * - **`GitRemote.url` may embed credentials** (the `user:token@host` userinfo form) —
 *   git stores them that way. Treat it as a secret: do not log it or surface it
 *   in archive metadata.
 * - Discovery, the mid-operation check, and the restore destination check read
 *   the filesystem directly, so those paths must be visible to THIS process (run
 *   it inside the sandbox, or over the mounted volume) and should be the same
 *   absolute paths the executor understands. Symlinked directories are never
 *   followed, and linked worktrees are reported as separate repos (their bundle
 *   carries the main repo's refs — duplicated data, never lost data).
 * - **Two checks need an OS tool, not git**, and reach it through the same
 *   injected executor (git runs a `!`-prefixed alias as a shell command, with
 *   every argument still a separate argv element, so nothing is interpolated):
 *   the reconstruction gate's independent enumeration (`find` — deliberately
 *   sharing no logic with discovery) and the containment check's path
 *   canonicalisation (`readlink -f`, then `realpath`). Without them the gate
 *   THROWS (it will not report "nothing unarchived" it cannot back up) and
 *   `headOnRemote` returns `false` for local remotes (it will not bless one it
 *   cannot place).
 *
 * @example
 * ```typescript
 * import {
 *   type ArchivedRepo,
 *   bundleRepo,
 *   checkpointRepo,
 *   discoverRepos,
 *   restoreRepo,
 *   verifyBundleRestorable,
 *   verifyWorkspaceReconstruction,
 *   type GitExec,
 * } from '@molecule/api-git-workspace'
 *
 * // Inject however you run git — a sandbox exec here; a local spawn elsewhere.
 * const exec: GitExec = async (args, options) => sandbox.exec('git', args, options)
 *
 * // 1. DISCOVER. `unreadable` is not advisory: each entry is a place user work
 * //    may exist that will NOT be archived. Fix the cause and re-run — this is
 * //    the cheap check that stops the expensive one from failing later.
 * const { repos, unreadable } = await discoverRepos(exec, '/workspace')
 *
 * if (unreadable.length > 0) {
 *   throw new Error(
 *     `workspace not fully readable, refusing to archive: ` +
 *       unreadable.map((entry) => `${entry.path} (${entry.reason})`).join('; '),
 *   )
 * }
 *
 * // Bundle filenames derive from the repo's WORKSPACE PATH, so 'api' and
 * // 'services/api' cannot overwrite each other's archive.
 * const bundleFor = (path: string) => `/archive/${encodeURIComponent(path)}.bundle`
 * const dirOf = (path: string) => (path === '.' ? '/workspace' : `/workspace/${path}`)
 * const archived: ArchivedRepo[] = []
 *
 * // 2. CHECKPOINT EVERY REPO FIRST, DEEPEST FIRST — then bundle in a SECOND
 * //    pass. Checkpointing and bundling one repo at a time looks tidier and
 * //    cannot work for a workspace with submodules or linked worktrees: a child
 * //    shares state with its parent, so committing the child AFTER the parent
 * //    was bundled either dirties the parent (its gitlink moves) or advances a
 * //    ref the parent's bundle predates — the gate reports it, correctly, and
 * //    the archive can never go green. Deepest-first means a parent is
 * //    checkpointed after every child that can move under it.
 * //
 * //    checkpointRepo is skipped for a BARE repo (no working tree — it throws),
 * //    and it throws if the repo is mid-merge/rebase/cherry-pick, which is
 * //    unfinished user work: resolve that and re-run rather than archiving.
 * //    Neither a hook nor a content filter nor a config knob can veto it.
 * const deepestFirst = [...repos].sort(
 *   (a, b) => b.path.split('/').length - a.path.split('/').length,
 * )
 *
 * for (const repo of deepestFirst) {
 *   if (!repo.bare) {
 *     await checkpointRepo(exec, dirOf(repo.path), 'chore: archive checkpoint')
 *   }
 * }
 *
 * for (const repo of repos) {
 *   const dir = dirOf(repo.path)
 *
 *   // 3. BUNDLE — every repo, unconditionally. Do NOT skip on
 *   //    `repo.headSha === null` (an unborn HEAD still carries branches, tags,
 *   //    notes and stashes) and do NOT skip on `repo.headOnRemoteTrackingRef`
 *   //    (cached local state; the remote may no longer have the commit).
 *   //    bundleRepo throws only for a repo with no refs at all AND an unborn
 *   //    HEAD — the one case where there is genuinely nothing to archive, and
 *   //    the one a caller must skip: an EMPTY bare mirror (a `git init --bare`
 *   //    nothing has been pushed to yet) cannot be bundled at all, because git
 *   //    refuses to write an empty bundle. The gate accepts a provably empty
 *   //    repository, so skipping it here does not block the release.
 *   const refs = await exec(['for-each-ref', '--count=1'], { cwd: dir })
 *
 *   if (repo.bare && refs.stdout.trim() === '') {
 *     continue
 *   }
 *
 *   await bundleRepo(exec, dir, bundleFor(repo.path))
 *   archived.push({ repoPath: repo.path, bundlePath: bundleFor(repo.path) })
 *
 *   // 4. PROVE EACH BUNDLE RESTORES. `verifyBundle` reads the header only and
 *   //    says "okay" for a truncated, bit-flipped bundle; this restores for
 *   //    real, and fails fast on the one bundle that is broken.
 *   const scratch = `/tmp/verify/${encodeURIComponent(repo.path)}`
 *
 *   if (!(await verifyBundleRestorable(exec, bundleFor(repo.path), scratch))) {
 *     throw new Error(`bundle is not restorable: ${bundleFor(repo.path)}`)
 *   }
 * }
 *
 * // 5. THE GATE. Everything above trusted discovery to have understood the
 * //    workspace. This does not: it enumerates the workspace again with `find`
 * //    (and proves that walk arrived whole) and compares every bundle, restored
 * //    for real, against the repo it claims to hold — HEAD, HEAD state, every
 * //    ref, every tracked file, plus the state no bundle carries (uncommitted
 * //    work, files hidden behind a skip-worktree bit, an executable bit the
 * //    index does not record). A repo shape nobody anticipated shows up here as
 * //    `unarchived-repo` instead of as a silent deletion.
 * const report = await verifyWorkspaceReconstruction(
 *   exec,
 *   '/workspace',
 *   archived,
 *   '/tmp/reconstruct',
 * )
 *
 * if (!report.ok || report.mismatches.length > 0) {
 *   throw new Error(
 *     `archive does not reconstruct the workspace, refusing to release: ` +
 *       report.mismatches.map((m) => `${m.path} [${m.kind}] ${m.detail}`).join('; '),
 *   )
 * }
 *
 * // 6. ONLY NOW may the source be released.
 * await releaseWorkspace('/workspace')
 *
 * // RESTORE: parents before children, then re-point each remote (a restored
 * // repo has none — the bundle is not a remote). `headBranch`/`detachedHead`
 * // come from discovery: no bundle records which branch HEAD was on, so without
 * // them a repo whose commit is shared by several branches comes back on the
 * // wrong one.
 * for (const repo of repos) {
 *   const destination = repo.path === '.' ? '/workspace' : `/workspace/${repo.path}`
 *
 *   await restoreRepo(exec, bundleFor(repo.path), destination, {
 *     ...(repo.branch === null
 *       ? repo.headSha === null
 *         ? {}
 *         : { detachedHead: true }
 *       : { headBranch: repo.branch }),
 *   })
 * }
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './bundleRepo.js'
export * from './checkpointRepo.js'
export * from './discoverRepos.js'
export * from './headOnRemote.js'
export * from './restoreRepo.js'
export * from './types.js'
export * from './verifyBundle.js'
export * from './verifyBundleRestorable.js'
export * from './verifyWorkspaceReconstruction.js'
