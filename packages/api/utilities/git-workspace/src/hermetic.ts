/**
 * Internal: running git on PINNED configuration.
 *
 * NOT part of the public surface (deliberately absent from the barrel).
 *
 * THE REPOSITORY BEING INSPECTED CONFIGURES THE INSPECTOR. Every command this
 * package runs reads its behaviour from the repo's own `.git/config` (plus the
 * host's global and system config), and several ordinary settings turn a check
 * into a no-op WITHOUT any error:
 *
 * - `status.showUntrackedFiles=no` — a routine large-repo performance setting —
 *   makes `git status --porcelain` print NOTHING for untracked files. Measured:
 *   the checkpoint then finds a "clean" tree and commits nothing, the bundle
 *   carries neither file, and the gate's own status is blind in exactly the same
 *   way, so an archive missing a whole new feature directory reported `ok: true`.
 * - `core.excludesFile` — a host-level ignore file — hides untracked work from
 *   `git status` AND from `git add -A`, so the checkpoint never stages it.
 * - `core.fsmonitor` names a USER PROGRAM whose "nothing changed here" answer git
 *   trusts instead of scanning the working tree.
 * - `core.hooksPath` (and `.git/hooks`) can veto or mutate what the archiver runs
 *   — the measurement is in {@link checkpointRepo}, where a `prepare-commit-msg`
 *   hook aborted every checkpoint.
 * - `core.attributesFile` can attach a content filter or an eol conversion the
 *   repository itself never declared.
 * - `core.quotePath`, `core.precomposeUnicode` and `core.ignorecase` decide how a
 *   path is SPELLED in output, i.e. whether two sides of a comparison can even be
 *   matched up.
 *
 * So no command in this package runs on configuration it did not choose. A
 * command-line `-c` outranks every config scope there is (system, global, repo,
 * worktree, and any `include.path` they pull in), and none of the pinned keys is
 * multi-valued, so a `-c` cannot be "added to" — it REPLACES. That is what makes
 * this list authoritative rather than advisory.
 *
 * WHY NOT `GIT_CONFIG_NOSYSTEM=1` AND AN EMPTY `GIT_CONFIG_GLOBAL` TOO? Because
 * this package is handed one capability — a {@link GitExec} taking argv and an
 * optional cwd — and deliberately cannot set environment variables (it never
 * imports `child_process`). It does not need to: `-c` already outranks the
 * scopes those variables would remove, for every key correctness depends on.
 * They are also not free — an emptied global config drops the user's
 * `safe.directory` grants, and under the standard Docker bind-mount uid mismatch
 * git then refuses EVERY repository ("detected dubious ownership"), turning a
 * readable workspace into one this package cannot inspect at all. A caller whose
 * executor does control the environment may still set them (and should, for
 * defence in depth) — but it must keep whatever `safe.directory` grants the
 * repositories need.
 *
 * @module
 */

/**
 * Where hooks are looked up for every command this package runs.
 *
 * `/dev/null` is a character device, so nothing can exist below it and every
 * hook lookup fails with ENOTDIR — which git treats as "there is no such hook".
 * See {@link checkpointRepo} for the measurement of why `--no-verify` is not
 * enough on its own.
 */
const NO_HOOKS_PATH = '/dev/null/molecule-archiver-no-hooks'

/**
 * The configuration every git command in this package is pinned to.
 *
 * Placed BEFORE the subcommand, so it applies to the command itself and to
 * anything it spawns. Each entry is here because leaving it to the repository
 * lets the repository decide what the archiver can see:
 *
 * - `status.showUntrackedFiles=all` — untracked files are the work no bundle
 *   carries; `no` (and `normal`, inside directories) hides them.
 * - `core.excludesFile=/dev/null` — a host ignore file must not remove a file
 *   from either the checkpoint or the report. (A repository's OWN `.gitignore`
 *   still applies: ignored content is documented as outside what this package
 *   archives.)
 * - `core.attributesFile=/dev/null` — host attributes must not attach filters or
 *   conversions the repository does not declare.
 * - `core.fsmonitor=false` — never trust an external program's claim that the
 *   working tree is unchanged.
 * - `core.hooksPath=…` — no hook may veto or alter an archival command.
 * - `core.quotePath=false` — no octal-escaped path spellings; the readers ask for
 *   NUL-delimited output, so paths arrive as exact bytes.
 * - `core.precomposeUnicode=false` — pins macOS NFD/NFC normalisation, so the
 *   same file cannot be spelled two ways on the two sides of a comparison.
 * - `core.ignorecase=false` — a case-only difference must be visible rather than
 *   folded away.
 * - `diff.noprefix=false`, `diff.ignoreSubmodules=none` — diff-based checks read
 *   what is actually there.
 *
 * DELIBERATELY NOT PINNED: `core.fileMode`. Forcing it to `true` on a filesystem
 * that cannot store the executable bit reports every `100755` file as modified,
 * which would block release for a whole class of workspaces. The executable bit
 * is instead OBSERVED directly (see the mode check in
 * {@link verifyWorkspaceReconstruction}), which cannot produce that false
 * positive.
 */
export const HERMETIC_CONFIG: readonly string[] = [
  '-c',
  'status.showUntrackedFiles=all',
  '-c',
  'core.excludesFile=/dev/null',
  '-c',
  'core.attributesFile=/dev/null',
  '-c',
  'core.fsmonitor=false',
  '-c',
  `core.hooksPath=${NO_HOOKS_PATH}`,
  '-c',
  'core.quotePath=false',
  '-c',
  'core.precomposeUnicode=false',
  '-c',
  'core.ignorecase=false',
  '-c',
  'diff.noprefix=false',
  '-c',
  'diff.ignoreSubmodules=none',
]

/**
 * Prepends the pinned configuration to an argv.
 *
 * @param args - Argv for git, excluding the program name.
 * @returns The same argv, preceded by {@link HERMETIC_CONFIG}.
 */
export const pinConfig = (args: readonly string[]): string[] => [...HERMETIC_CONFIG, ...args]

/**
 * Strips the pinned prefix from an argv for an ERROR MESSAGE.
 *
 * The pins are the same on every command, so repeating them in every error would
 * bury the part an operator has to read — the subcommand that failed. Anything a
 * CALLER-supplied step added (a filter override, an identity) is kept.
 *
 * @param args - Argv as it was passed to git.
 * @returns The argv without the pinned prefix.
 */
export const unpinConfig = (args: readonly string[]): string[] =>
  args.length >= HERMETIC_CONFIG.length &&
  HERMETIC_CONFIG.every((value, index) => args[index] === value)
    ? args.slice(HERMETIC_CONFIG.length)
    : [...args]
