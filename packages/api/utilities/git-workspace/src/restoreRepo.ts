/**
 * Restores a bundled repository back onto disk — with EVERY ref it carried.
 *
 * @module
 */

import { readdir } from 'node:fs/promises'

import { configuredFilterDrivers, filterOverrides } from './filters.js'
import { gitError, runGit, runGitAllowFail } from './git.js'
import type { GitExec } from './types.js'

/**
 * Branch name HEAD is parked on when a bundle carries no HEAD of its own and the
 * name `git init` chose happens to collide with a restored branch.
 *
 * Pointing HEAD at a ref that does not exist is exactly what an unborn HEAD is —
 * it invents nothing. The alternative (leaving HEAD on a restored branch with an
 * empty working tree) makes `git status` report every tracked file as deleted,
 * one `git commit -a` away from destroying the tree.
 */
const UNBORN_PLACEHOLDER_BRANCH = 'refs/heads/molecule-restore-unborn'

/** One `<sha> <refname>` line of `git bundle list-heads` output. */
interface BundleRef {
  /** Object the ref points at. */
  sha: string
  /** Full ref name, or the literal `HEAD`. */
  name: string
}

/**
 * Parses `git bundle list-heads` output.
 *
 * @param stdout - Raw stdout, one `<sha> <refname>` line per ref.
 * @returns The refs, in the bundle's own order (refname-sorted for a
 *   `--all` bundle, with `HEAD` last).
 */
const parseBundleRefs = (stdout: string): BundleRef[] => {
  const refs: BundleRef[] = []

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    const space = trimmed.indexOf(' ')

    if (space <= 0) {
      continue
    }

    refs.push({ sha: trimmed.slice(0, space), name: trimmed.slice(space + 1).trim() })
  }

  return refs
}

/**
 * Turns a caller-supplied branch into a full ref name.
 *
 * Accepts the SHORT form recorded in {@link DiscoveredRepo.branch} (`main`,
 * `feature/x`) and passes an already-qualified `refs/…` through unchanged. The
 * full ref is what gets handed to git, so a branch name that looks like a flag
 * can never be parsed as one.
 *
 * @param branch - Branch name, short or fully qualified.
 * @returns The full ref name.
 * @throws {Error} When the branch name is empty.
 */
const toBranchRef = (branch: string): string => {
  if (branch.trim() === '') {
    throw new Error(
      `cannot restore: options.headBranch was empty. Pass the source repo's branch ` +
        `(DiscoveredRepo.branch), or omit it entirely for a detached/unborn HEAD.`,
    )
  }

  return branch.startsWith('refs/') ? branch : `refs/heads/${branch}`
}

/**
 * Materialises HEAD's tree into the working directory.
 *
 * `git reset --hard` runs SMUDGE filters, so in an environment where a
 * configured filter's program is missing (git-lfs in an archival sandbox — and
 * the driver can come from the HOST's global config, which a freshly restored
 * repo inherits) the checkout fails with exit 128 and the whole restore is
 * reported as unrecoverable, even though every object arrived intact. It is
 * therefore retried with the filters neutralised, which checks the raw archived
 * bytes out instead of running them through a filter that cannot run.
 *
 * @param exec - The injected git executor.
 * @param destination - The restored repository.
 * @returns Nothing; the working tree matches HEAD on success.
 * @throws {Error} When the checkout fails even with filters neutralised.
 */
const resetHard = async (exec: GitExec, destination: string): Promise<void> => {
  const args = ['reset', '--hard', '--quiet']
  const result = await runGitAllowFail(exec, args, destination)

  if (result.exitCode === 0) {
    return
  }

  const overrides = filterOverrides(await configuredFilterDrivers(exec, destination))

  if (overrides.length === 0) {
    throw gitError(args, result, destination)
  }

  const retried = await runGitAllowFail(exec, [...overrides, ...args], destination)

  if (retried.exitCode !== 0) {
    throw gitError([...overrides, ...args], retried, destination)
  }
}

/**
 * Refuses a destination that already holds anything.
 *
 * `git init` happily re-initialises a non-empty directory (unlike `git clone`,
 * which refuses), and the `git reset --hard` that follows would overwrite any
 * colliding file. The check therefore happens BEFORE anything is written, and
 * reads the filesystem directly — so `destination` must be an absolute path
 * visible to this process.
 *
 * @param destination - Absolute path the repository will be restored into.
 * @returns Nothing; returns normally when the destination is empty or absent.
 * @throws {Error} When the destination already exists and is not empty, or when
 *   it exists but cannot be listed (including when it is a file).
 */
const assertEmptyDestination = async (destination: string): Promise<void> => {
  let entries: string[] | null = null

  try {
    entries = await readdir(destination)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code

    if (code !== 'ENOENT') {
      throw new Error(
        `cannot restore into ${destination}: the destination could not be inspected ` +
          `(${(error as Error).message}). Restoring over a path this process cannot read ` +
          `risks overwriting whatever is there.`,
        { cause: error },
      )
    }

    // Documented noop: ENOENT is the good case — the destination does not exist
    // yet and `git init` will create it (including missing parents).
  }

  if (entries !== null && entries.length > 0) {
    throw new Error(
      `cannot restore into ${destination}: the destination already exists and is not empty ` +
        `(${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}). Restore into a new path — ` +
        `in a polyrepo workspace, restore parents before children.`,
    )
  }
}

/**
 * Restores a bundle into a working repository, with ALL of its refs.
 *
 * Implemented as `git init` + `git fetch <bundle> '+refs/*:refs/*'` rather than
 * `git clone`, because CLONE LOSES REFS. A clone materialises one branch, files
 * the rest under `refs/remotes/origin/*`, and drops `refs/notes/*` and
 * `refs/stash` entirely — they end up referenced by nothing and die at the next
 * `gc`. Worse, a bundle whose HEAD is unborn (an orphan checkout) clones into a
 * repository with no local branch and no checkout at all, even though the bundle
 * carried every commit. The `+refs/*:refs/*` refspec copies the ref namespace
 * VERBATIM: branches stay branches, tags stay tags, notes, stashes and the
 * source's own `refs/remotes/*` all come back exactly as they were.
 *
 * `--update-head-ok` is required, not incidental: `git fetch` otherwise refuses
 * to write `refs/heads/<branch>` while that branch is the one `git init` just
 * pointed HEAD at, which is precisely the common case (a `main` branch restored
 * into a repo whose `init.defaultBranch` is also `main`).
 *
 * This is also a REAL integrity check, and the only one there is: `git fetch`
 * runs index-pack over the bundle's packfile, recomputing its checksum and
 * inflating every object, so a truncated or bit-flipped bundle fails HERE —
 * where `verifyBundle` (header-only) still reports okay. See
 * {@link verifyBundleRestorable} for the scratch-directory form of this check.
 *
 * PASS `options.headBranch` — NO BUNDLE RECORDS A SYMBOLIC HEAD. A bundle's
 * `HEAD` line carries a COMMIT SHA and nothing else, so when several branches
 * point at that commit, which one the source was actually ON is simply not in
 * the file. The only component that knows is the caller, which captured it as
 * {@link DiscoveredRepo.branch} during discovery. Pass it and this checks out
 * exactly that branch.
 *
 * Without it, the branch is a documented BEST-EFFORT GUESS: the first branch, in
 * the bundle's ref order, whose tip is HEAD's commit. That is NOT what git does
 * and never was — `git clone`'s `guess_remote_head` prefers `init.defaultBranch`
 * first, then `refs/heads/master`, and only then falls back to ref order. So the
 * guess and a clone disagree, and both can differ from the truth (measured: a
 * source on `main` with `aaa` and `feature/just-merged` at the same tip restores
 * onto `aaa` / `feature/just-merged` here, and onto whatever the destination's
 * `init.defaultBranch` happens to be under clone). No refs or objects are lost
 * either way — the ref set is exact — but the checked-out branch is wrong, so
 * pass `headBranch` whenever the caller has it.
 *
 * Otherwise HEAD is restored from the bundle's own HEAD: onto the guessed
 * branch, or detached at that commit when no branch matches. When the bundle
 * carries no HEAD — the source's HEAD was unborn — the refs are restored and
 * HEAD is left unborn: no branch is checked out and none is invented. Passing
 * `headBranch` there restores the exact unborn branch the source sat on.
 *
 * PASS `options.detachedHead` FOR A SOURCE WHOSE HEAD WAS DETACHED. `headBranch`
 * names a branch, so it cannot express "on no branch at all" — and a source
 * detached at a commit that some branch ALSO points at was therefore restored
 * onto that branch, where the next `git commit` would advance a branch the
 * source never touched. The caller can tell the difference exactly
 * (`DiscoveredRepo.branch === null` with a non-null `headSha`), so it says so
 * with `{ detachedHead: true }` and HEAD comes back detached at the same commit.
 * (A source detached at a commit no branch points at restores detached either
 * way — that is the only way its commits stay reachable.)
 *
 * Unlike a clone, the restored repository has NO remote pointing at the bundle
 * file; re-add the project's real remotes from the captured
 * `DiscoveredRepo.remotes` when handing the workspace back.
 *
 * WHAT NO BUNDLE CAN CARRY: REFLOGS. A bundle holds refs and objects, so a
 * restored repo has no `git reflog` history and no `git stash list` output. The
 * MOST RECENT stash survives — it is the ref `refs/stash`, and
 * `git stash apply refs/stash` replays it — but OLDER stash entries
 * (`stash@{1}` and beyond) exist only in the stash reflog and are NOT archived
 * by git bundle. Tell users to pop or commit stashes they care about before a
 * workspace is archived. (`git clone` is worse: it drops `refs/stash` too, so
 * even the top stash is lost.)
 *
 * @param exec - The injected git executor.
 * @param bundlePath - Absolute path of the bundle to restore from.
 * @param destination - Absolute path to restore into. It must not already exist
 *   as a non-empty directory, and it is inspected by THIS process (not by the
 *   executor), so pass an absolute path this process can see. In a polyrepo
 *   workspace, restore each repo to its own recorded `DiscoveredRepo.path`,
 *   parents before children.
 * @param options - Optional HEAD fidelity.
 * @param options.headBranch - The branch the SOURCE repo's HEAD was on, i.e. the
 *   captured {@link DiscoveredRepo.branch}. Short (`main`) or fully qualified
 *   (`refs/heads/main`). Pass it whenever it is known: the bundle format cannot
 *   carry a symbolic HEAD, so this is the only way to restore the right branch
 *   when several point at HEAD's commit.
 * @param options.detachedHead - True when the SOURCE's HEAD was DETACHED
 *   (`DiscoveredRepo.branch === null` with a non-null `headSha`). HEAD is
 *   restored detached at the bundle's HEAD commit instead of being put on a
 *   branch that merely shares that commit. Cannot be combined with
 *   `headBranch` — they describe two different states.
 * @returns Nothing; the repository exists at `destination` on success.
 * @throws {Error} When the destination already exists and is not empty, when the
 *   bundle is missing, corrupt, truncated, or not self-contained — INCLUDING the
 *   case where it is damaged enough to list no refs at all, which `git fetch`
 *   otherwise reports as a successful transfer of nothing — when
 *   `options.headBranch` names a branch the bundle does not carry, when
 *   `headBranch` and `detachedHead` are both given, when `detachedHead` is asked
 *   for a bundle carrying no HEAD, or when any of the git steps fails.
 */
export async function restoreRepo(
  exec: GitExec,
  bundlePath: string,
  destination: string,
  options: { headBranch?: string; detachedHead?: boolean } = {},
): Promise<void> {
  if (options.detachedHead === true && options.headBranch !== undefined) {
    throw new Error(
      `cannot restore ${bundlePath} into ${destination}: options.headBranch and ` +
        `options.detachedHead describe different HEAD states, so only one may be given. A source ` +
        `repo is either on a branch (DiscoveredRepo.branch) or detached (branch === null).`,
    )
  }

  const requestedRef = options.headBranch === undefined ? null : toBranchRef(options.headBranch)

  await assertEmptyDestination(destination)

  // `--` guarantees a path beginning with a dash is treated as a path and never
  // as an option (argv arrays already rule out shell injection).
  await runGit(exec, ['init', '--quiet', '--', destination])
  await runGit(
    exec,
    ['fetch', '--update-head-ok', '--force', '--quiet', '--', bundlePath, '+refs/*:refs/*'],
    destination,
  )

  const bundleRefs = parseBundleRefs(
    (await runGit(exec, ['bundle', 'list-heads', '--', bundlePath], destination)).stdout,
  )
  if (bundleRefs.length === 0) {
    // A bundle with NO refs cannot have been written by `git bundle create`,
    // which refuses to create an empty bundle ("Refusing to create empty
    // bundle") and writes no file at all — so an empty ref list means the file
    // is truncated or corrupt. Measured: a bundle cut to 32 bytes keeps enough
    // header for `git fetch` to succeed having transferred NOTHING, leaving an
    // empty repository behind and reporting exit 0 — which made
    // verifyBundleRestorable answer TRUE for a bundle holding none of the user's
    // work. It is refused here, where every restore path sees it.
    throw new Error(
      `cannot restore ${bundlePath} into ${destination}: the bundle lists NO refs. git bundle ` +
        `create never writes an empty bundle, so this file is truncated or corrupt — it carries ` +
        `none of the repository's commits. Re-create it from the source repo; do NOT treat this ` +
        `as a successful restore.`,
    )
  }

  const bundleHead = bundleRefs.find((ref) => ref.name === 'HEAD')

  // A DETACHED SOURCE, restored detached. Only the caller knows this — a bundle
  // records HEAD as a bare commit sha, which is indistinguishable from a branch
  // tip — and without it the restore lands on whichever branch happens to share
  // the commit, where the next commit would advance a branch the source never
  // moved.
  if (options.detachedHead === true) {
    if (bundleHead === undefined) {
      throw new Error(
        `cannot restore ${bundlePath} into ${destination}: options.detachedHead was asked for, but ` +
          `the bundle carries no HEAD — the source's HEAD was UNBORN, which is a different state ` +
          `again. Every ref HAS been restored; pass the unborn branch as headBranch, or omit both.`,
      )
    }

    await runGit(exec, ['update-ref', '--no-deref', 'HEAD', bundleHead.sha], destination)
    await resetHard(exec, destination)

    return
  }

  // THE CALLER'S ANSWER WINS. Nothing in the bundle format records which branch
  // HEAD was a symbolic ref to, so when the caller knows (DiscoveredRepo.branch)
  // that is the only authoritative source there is.
  if (requestedRef !== null) {
    const exists = await runGitAllowFail(
      exec,
      ['rev-parse', '--verify', '--quiet', requestedRef],
      destination,
    )

    if (exists.exitCode === 0) {
      await runGit(exec, ['symbolic-ref', 'HEAD', requestedRef], destination)
      await resetHard(exec, destination)

      return
    }

    if (bundleHead === undefined) {
      // The source's HEAD was UNBORN on exactly this branch (a fresh `git init`,
      // or `git checkout --orphan <name>`): the ref could not exist, which is
      // what "unborn" means. Pointing HEAD at it reproduces that state exactly —
      // strictly better than the invented placeholder used when the caller does
      // not say. Nothing is checked out, so no reset.
      await runGit(exec, ['symbolic-ref', 'HEAD', requestedRef], destination)

      return
    }

    throw new Error(
      `cannot restore ${bundlePath} into ${destination}: options.headBranch asked for ` +
        `${requestedRef}, but the bundle carries no such ref. Every ref in the bundle HAS been ` +
        `restored — nothing was lost — but HEAD was not moved. Pass the branch recorded for THIS ` +
        `repo (DiscoveredRepo.branch), or omit it to fall back to the best-effort guess.`,
    )
  }

  if (bundleHead === undefined) {
    // The source's HEAD was unborn. Every ref is restored; no branch is
    // invented. Only re-point HEAD if `git init`'s default branch name collided
    // with a restored branch, which would otherwise leave the repo claiming a
    // checkout whose working tree is empty.
    const born = await runGitAllowFail(
      exec,
      ['rev-parse', '--verify', '--quiet', 'HEAD'],
      destination,
    )

    if (born.exitCode === 0) {
      const taken = new Set(bundleRefs.map((ref) => ref.name))
      let placeholder = UNBORN_PLACEHOLDER_BRANCH

      for (let suffix = 2; taken.has(placeholder); suffix += 1) {
        placeholder = `${UNBORN_PLACEHOLDER_BRANCH}-${suffix}`
      }

      await runGit(exec, ['symbolic-ref', 'HEAD', placeholder], destination)
    }

    return
  }

  // BEST-EFFORT GUESS, because the caller passed no headBranch: the first
  // branch, in the bundle's ref order, whose tip is the HEAD commit. A bundle
  // records HEAD as a bare commit sha, so when several branches share that
  // commit the real one is NOT recoverable from the file.
  //
  // This is deliberately NOT "git's own rule" — git has no such rule to copy.
  // `git clone` guesses too (guess_remote_head): it prefers init.defaultBranch,
  // then refs/heads/master, and only then falls back to ref order — a
  // DESTINATION-dependent answer that can differ from this one and from the
  // truth. Neither guess is authoritative; only DiscoveredRepo.branch is, which
  // is why callers should pass options.headBranch.
  const headBranch = bundleRefs.find(
    (ref) => ref.name.startsWith('refs/heads/') && ref.sha === bundleHead.sha,
  )

  if (headBranch === undefined) {
    // A detached HEAD in the source (a commit on no branch at all) is restored
    // as a detached HEAD at the same commit.
    await runGit(exec, ['update-ref', '--no-deref', 'HEAD', bundleHead.sha], destination)
  } else {
    // A full `refs/heads/...` ref, so a branch name that looks like a flag can
    // never be parsed as one.
    await runGit(exec, ['symbolic-ref', 'HEAD', headBranch.name], destination)
  }

  // The refs are in place but the index and working tree are still empty;
  // this materialises HEAD's tree.
  await resetHard(exec, destination)
}
