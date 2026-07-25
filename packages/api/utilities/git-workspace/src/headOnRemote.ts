/**
 * The ONLY network-touching check in this package: does a remote really have
 * this commit?
 *
 * @module
 */

import { isAbsolute, relative, resolve, sep } from 'node:path'

import { runGitAllowFail } from './git.js'
import { realPath } from './shell.js'
import type { GitExec } from './types.js'

/** Where a remote URL points, as far as this package needs to care. */
type RemoteLocation =
  /** A real network location (ssh, https, git, …) — it cannot be inside a local workspace. */
  | { kind: 'offsite' }
  /** A filesystem path, absolute or relative to the repo it is configured in. */
  | { kind: 'local'; path: string }
  /** Could not be classified, so containment cannot be ruled out — fail closed. */
  | { kind: 'undecidable' }

/**
 * Classifies a remote URL as a local filesystem path or a genuine network
 * location, using git's own rules (`connect.c`).
 *
 * - `<scheme>://…` is a URL. Only `file://` is local; every other scheme (ssh,
 *   git, http, https, ftp) is offsite. A `file://` path is percent-decoded, as
 *   git decodes it.
 * - `[user@]host:path` — a colon appearing before any slash — is scp-style ssh,
 *   so offsite. (This is git's rule verbatim, including its consequence that a
 *   Windows `C:\repo` reads as a host; use `file://` for those.)
 * - Anything else is a local path, absolute or relative.
 *
 * @param url - The remote URL, already expanded by `git ls-remote --get-url`.
 * @returns Where the remote points, or `undecidable` when it cannot be told.
 */
const classifyRemoteUrl = (url: string): RemoteLocation => {
  const trimmed = url.trim()

  if (trimmed === '') {
    return { kind: 'undecidable' }
  }

  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(trimmed)

  if (scheme !== null) {
    if (scheme[1]?.toLowerCase() !== 'file') {
      return { kind: 'offsite' }
    }

    // file://<host>/<path>; git ignores the host component (empty or localhost)
    // and takes everything from the first slash on as the path.
    const afterScheme = trimmed.slice(scheme[0].length)
    const firstSlash = afterScheme.indexOf('/')
    const path = firstSlash === -1 ? '' : afterScheme.slice(firstSlash)

    if (path === '') {
      return { kind: 'undecidable' }
    }

    try {
      return { kind: 'local', path: decodeURIComponent(path) }
    } catch (_error) {
      // Documented noop: a malformed percent-escape means the path this URL
      // really names is unknown, and an unknown path cannot be proven to lie
      // OUTSIDE the workspace. Fail closed (undecidable => bundle it) rather
      // than compare a form git would not have used.
      return { kind: 'undecidable' }
    }
  }

  const colon = trimmed.indexOf(':')
  const slash = trimmed.indexOf('/')

  if (colon !== -1 && (slash === -1 || colon < slash)) {
    return { kind: 'offsite' }
  }

  return { kind: 'local', path: trimmed }
}

/**
 * Reports whether a path lies inside a directory (or is that directory), by PURE
 * PATH ARITHMETIC.
 *
 * Not sufficient on its own: a symlink makes two spellings of the same directory
 * give opposite answers, and the dangerous direction (a remote that really is
 * inside the workspace looking outside it) is the one an attacker-free ordinary
 * setup produces by accident. See {@link isInsideResolved}.
 *
 * @param workspaceRoot - The containing directory.
 * @param candidate - The absolute path to test.
 * @returns True when `candidate` is `workspaceRoot` or below it, spelling-wise.
 */
const isInside = (workspaceRoot: string, candidate: string): boolean => {
  const relativePath = relative(resolve(workspaceRoot), candidate)

  return (
    relativePath === '' ||
    (!isAbsolute(relativePath) && relativePath !== '..' && !relativePath.startsWith(`..${sep}`))
  )
}

/** How a containment question was answered. */
type Containment =
  /** Proven inside the workspace — the remote is not an offsite copy. */
  | 'inside'
  /** Proven outside, by BOTH spelling and canonical path. */
  | 'outside'
  /** Not decidable, because a path could not be canonicalised. */
  | 'unknown'

/**
 * Reports whether a path lies inside a directory, WITH SYMLINKS RESOLVED.
 *
 * Path arithmetic alone was defeated twice, both times returning "outside" for a
 * remote that a release would delete:
 *
 * 1. `origin` is a symlink (`/workspace/link-to-mirror`) whose target is the
 *    in-workspace bare mirror. Arithmetic compares the LINK's path, which is not
 *    under the workspace, so the remote reads as offsite, the working repo's
 *    bundle is skipped, and both copies die together.
 * 2. `workspaceRoot` is handed in as a symlink (`/workspace` →
 *    `/data/projects/<id>`, or macOS `/tmp` → `/private/tmp`) while the remote is
 *    spelled canonically. Same directory, two spellings, opposite answers.
 *
 * So both paths are canonicalised through the OS (`readlink -f`, then
 * `realpath`) and compared again. The arithmetic answer is still trusted when it
 * says "inside" — that is the safe direction and it needs no filesystem access.
 *
 * @param exec - The injected git executor, used to canonicalise the paths.
 * @param workspaceRoot - The containing directory.
 * @param candidate - The absolute path to test.
 * @returns `inside`, `outside`, or `unknown` when either path could not be
 *   canonicalised — which the caller MUST treat as "cannot rule out containment".
 */
const isInsideResolved = async (
  exec: GitExec,
  workspaceRoot: string,
  candidate: string,
): Promise<Containment> => {
  if (isInside(workspaceRoot, candidate)) {
    return 'inside'
  }

  const [realRoot, realCandidate] = await Promise.all([
    realPath(exec, workspaceRoot),
    realPath(exec, candidate),
  ])

  if (realRoot === null || realCandidate === null) {
    return 'unknown'
  }

  return isInside(realRoot, realCandidate) ? 'inside' : 'outside'
}

/**
 * Asks the REMOTE whether it currently has the repo's HEAD commit as a branch or
 * tag tip (`git ls-remote --heads --tags`).
 *
 * THIS TOUCHES THE NETWORK. Unlike {@link DiscoveredRepo.headOnRemoteTrackingRef}
 * — which reads `refs/remotes/*`, a LOCAL CACHE that keeps saying "pushed" after
 * the branch, or the whole repository, was deleted on the remote — this function
 * opens a connection to the remote and reads what is there now. It therefore
 * needs network access and whatever credentials the remote requires, and it can
 * be slow. Give the injected executor a timeout and a non-interactive
 * environment (`GIT_TERMINAL_PROMPT=0`) so a credential prompt cannot hang it.
 *
 * IT IS THE ONLY SIGNAL IN THIS PACKAGE THAT MAY JUSTIFY SKIPPING A BUNDLE, and
 * even then only for the exact commit it was asked about.
 *
 * PASS `options.workspaceRoot`. WITHOUT IT THIS FUNCTION GIVES THE DANGEROUS
 * ANSWER FOR A REMOTE THAT IS ITSELF ABOUT TO BE DELETED — that is the entire
 * reason the parameter exists. The two-copy-loss scenario, in full:
 *
 * 1. A workspace holds a working repo `app/` and, beside it, a bare mirror
 *    `team-mirror.git/` (a `git init --bare` push target — an utterly ordinary
 *    thing to keep in a workspace, and one {@link discoverRepos} now reports
 *    with `bare: true`).
 * 2. `app/`'s `origin` is that bare mirror, and `app/`'s HEAD is pushed to it.
 * 3. Asked "is HEAD on origin?", this function opens the mirror, finds the
 *    commit, and answers TRUE — truthfully, but about a repository INSIDE the
 *    tree that is about to be released.
 * 4. The caller — obeying the documented contract that this is the only signal
 *    which may justify skipping a bundle — skips `app/`'s bundle.
 * 5. The workspace is deleted. `app/` was skipped because it was safe on the
 *    mirror; the mirror is deleted along with it. BOTH copies are gone.
 *
 * Neither half is wrong alone; together they are fatal. So when
 * `options.workspaceRoot` is given, the remote's URL is expanded
 * (`git ls-remote --get-url`, which also applies `url.<base>.insteadOf`) and, if
 * it is a LOCAL path (no scheme, or `file://`) that resolves INSIDE that root,
 * this returns FALSE without asking anything: a remote inside the archive is not
 * an offsite copy. A remote outside the workspace, and every network remote, is
 * asked as usual.
 *
 * CONTAINMENT IS DECIDED ON CANONICAL PATHS, NOT SPELLING. Path arithmetic alone
 * answered "outside" for a symlinked remote whose target sits in the workspace,
 * and for a workspace root handed in as a symlink — the same two-copy loss, one
 * `ln -s` away. Both paths are therefore canonicalised through the OS
 * (`readlink -f`, then `realpath`, run through the injected executor). A local
 * remote that CANNOT be canonicalised is treated as possibly-inside and returns
 * `false`: in an environment without those tools, a local remote never licenses
 * skipping a bundle. Network remotes never need resolving and are unaffected.
 *
 * IT FAILS CLOSED, BY DESIGN. Every failure — no commits yet, an unreachable or
 * deleted remote, a DNS failure, expired credentials, a rejected TLS handshake,
 * a remote URL that cannot be classified, the executor itself blowing up —
 * returns `false`, which means "archive it". The cost of a false `false` is a
 * bundle that was not strictly necessary; the cost of a false `true` is the
 * user's only copy of their work.
 *
 * NOTE ON PRECISION: `ls-remote` lists ref TIPS. A HEAD that is an ancestor of a
 * remote branch tip (someone pushed further commits on top) reports `false` even
 * though the commit is safely on the remote. That is the conservative direction
 * and is deliberate — this function never needs to be right about "safe", only
 * about "not safe".
 *
 * @param exec - The injected git executor.
 * @param repoPath - Absolute path of the repo whose HEAD is being checked. A
 *   relative local remote URL is resolved against it, as git does.
 * @param remote - Remote NAME (`origin`) or URL to ask. A name is resolved
 *   through the repo's config, so a remote that was removed from config fails
 *   closed rather than answering from stale local refs.
 * @param options - Optional containment check.
 * @param options.workspaceRoot - Absolute path of the workspace about to be
 *   archived/released. ALWAYS PASS IT when this answer may skip a bundle: a
 *   remote resolving inside this root returns `false`, because deleting the
 *   workspace deletes that remote too. Omitting it restores the pre-fix
 *   behaviour, in which an in-workspace mirror answers `true`. A LOCAL remote is
 *   compared on canonical paths (symlinks resolved via the executor), so this
 *   root and the remote must be paths the executor can resolve.
 * @returns True only when the remote lives outside `options.workspaceRoot` (when
 *   given), answered, and one of its branch or tag tips is exactly this repo's
 *   HEAD commit; false for every other outcome.
 */
export async function headOnRemote(
  exec: GitExec,
  repoPath: string,
  remote: string,
  options: { workspaceRoot?: string } = {},
): Promise<boolean> {
  try {
    const head = await runGitAllowFail(exec, ['rev-parse', '--verify', 'HEAD'], repoPath)

    if (head.exitCode !== 0) {
      return false
    }

    const headSha = head.stdout.trim()

    if (headSha === '') {
      return false
    }

    if (options.workspaceRoot !== undefined) {
      // `--get-url` expands a remote NAME (and any `url.<base>.insteadOf`
      // rewrite) and exits WITHOUT contacting the remote; a value that is not a
      // configured remote is echoed back unchanged, which is exactly the
      // behaviour wanted for a caller that passed a URL directly.
      const expanded = await runGitAllowFail(
        exec,
        ['ls-remote', '--get-url', '--', remote],
        repoPath,
      )

      if (expanded.exitCode !== 0) {
        return false
      }

      const location = classifyRemoteUrl(expanded.stdout)

      if (location.kind === 'undecidable') {
        return false
      }

      if (location.kind === 'local') {
        const containment = await isInsideResolved(
          exec,
          options.workspaceRoot,
          resolve(repoPath, location.path),
        )

        if (containment !== 'outside') {
          // A remote INSIDE the tree being archived is not an offsite copy: it
          // is about to be deleted along with the repo it is supposedly
          // protecting. `unknown` lands here too — a remote that cannot be
          // PROVEN to be outside the workspace must not license skipping a
          // bundle.
          return false
        }
      }
    }

    // `--` keeps a remote name or URL that begins with a dash from being parsed
    // as an option (argv arrays already rule out shell injection).
    const listed = await runGitAllowFail(
      exec,
      ['ls-remote', '--heads', '--tags', '--', remote],
      repoPath,
    )

    if (listed.exitCode !== 0) {
      return false
    }

    return listed.stdout.split('\n').some((line) => {
      const tab = line.indexOf('\t')

      return tab > 0 && line.slice(0, tab).trim() === headSha
    })
  } catch (_error) {
    // Documented noop: this function's entire contract is FAIL CLOSED — any
    // failure to prove the commit is on the remote must read as "not on the
    // remote", so the caller bundles it. The `_` binding marks the discard as
    // deliberate; a caller that wants the underlying error (to log or retry)
    // runs `git ls-remote` through its own executor, where it throws normally.
    return false
  }
}
