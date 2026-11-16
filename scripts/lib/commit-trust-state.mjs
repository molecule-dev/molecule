/**
 * Commit only the trust ledger additions this run owns.
 *
 * A private index contains the inspected HEAD plus the exact added names. Hooks
 * run against that index; commit-tree names that HEAD and update-ref uses CAS.
 * Unexpected same-ledger edits refuse without rewriting the ledger or another
 * session's staging. Another writer holding the index lock, or moving HEAD or the
 * shared index while the hook runs, is retried from the new state a few times
 * (2026-11-16: one held index.lock left a run's ledger uncommitted). Standard Git commands keep
 * the tool standalone; it never imports a workspace sibling or pushes.
 */
import { execFileSync } from 'node:child_process'
import {
  closeSync,
  copyFileSync,
  mkdtempSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

/**
 * The end of a failed git call's output, where a hook prints the line that says why it
 * refused. A pre-commit hook logs every passing check first, so the start of its output
 * holds only passes (2026-11-16: the reason "run-on-index: the commit does not carry …"
 * was cut off by keeping the first 600 characters).
 *
 * @param error - What execFileSync threw.
 * @param lines - How many trailing lines to keep.
 * @returns The last lines of stderr and stdout, or the error message.
 */
export function failureTail(error, lines = 12) {
  const output = [error?.stderr, error?.stdout]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join('\n')
  const text = output || String(error?.message || error).trim()
  return text.split('\n').slice(-lines).join('\n')
}

/**
 * The commit subject for the packages a run added.
 * @param added - Package names newly recorded.
 * @returns The commit message, with a body listing multiple names.
 */
export function trustCommitMessage(added) {
  if (added.length === 1) return `chore(trust): record ${added[0]} in the trust state`
  return `chore(trust): record ${added.length} newly trusted packages\n\n${added.map((n) => `- ${n}`).join('\n')}`
}

/**
 * Commit a tracked ledger only when its changes are exactly this run's additions.
 *
 * @param options - What to commit and where.
 * @param options.root - Repository root.
 * @param options.file - Ledger path relative to root.
 * @param options.added - Package names newly recorded by this run.
 * @param [options.run] - Command runner injected by tests.
 * @param [options.attempts] - Attempts when another git writer gets in the way.
 * @param [options.waitMs] - Wait before the second attempt; each later wait grows by this much.
 * @param [options.wait] - Blocks for the given milliseconds (tests pass a stand-in).
 * @returns Commit result or a refusal reason; trust work remains saved on failure.
 */
export function commitTrustState({
  root,
  file,
  added,
  run = execFileSync,
  attempts = 5,
  waitMs = 3000,
  wait = sleepSync,
}) {
  if (!added.length) return { committed: false, reason: 'nothing was added to the ledger' }
  for (let attempt = 1; ; attempt++) {
    const result = commitOnce({ root, file, added, run })
    if (!result.contended) return result
    if (attempt >= attempts)
      return {
        committed: false,
        reason: `${result.contended} on each of ${attempts} attempts — commit ${file} by hand`,
      }
    wait(waitMs * attempt)
  }
}

/**
 * Another git writer got in the way: it held the index lock, or moved HEAD or the shared index
 * while the hook ran. Nothing was changed, and the next attempt starts from the new state.
 */
class Contention extends Error {}

/**
 * Blocks the thread for `ms` (this module is synchronous, like the git calls it makes).
 *
 * @param ms - Milliseconds.
 */
function sleepSync(ms) {
  if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/**
 * One attempt at the commit.
 *
 * @param options - As for commitTrustState.
 * @returns The result, or `{ contended }` naming what another writer did.
 */
function commitOnce({ root, file, added, run }) {
  const git = (args, env, input) =>
    run('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
      ...(env ? { env: { ...process.env, ...env } } : {}),
      ...(input !== undefined ? { input } : {}),
    })
  try {
    git(['rev-parse', '--is-inside-work-tree'])
  } catch (_error) {
    return { committed: false, reason: 'not inside a git work tree' }
  }
  try {
    git(['ls-files', '--error-unmatch', '--', file])
  } catch (_error) {
    return { committed: false, reason: `${file} is not tracked by git — commit it by hand` }
  }
  let committedSha
  let scratch,
    indexLock,
    lockOwned = false
  try {
    const parent = git(['rev-parse', 'HEAD']).trim()
    const gitDir = git(['rev-parse', '--absolute-git-dir']).trim()
    const sharedIndex = join(gitDir, 'index')
    const sharedEnv = { GIT_INDEX_FILE: sharedIndex }
    const beforeIndex = readFileSync(sharedIndex)
    const head = git(['show', `${parent}:${file}`])
    const names = JSON.parse(head)
    if (
      !Array.isArray(names) ||
      names.some((name) => typeof name !== 'string') ||
      added.some((name) => typeof name !== 'string')
    )
      throw new Error('trust state must remain an array of package names')
    const expected = `${JSON.stringify([...new Set([...names, ...added])].sort(), null, 2)}\n`
    const worktree = readFileSync(join(root, file), 'utf8')
    const staged = git(['show', `:${file}`], sharedEnv)
    if (worktree !== expected || (staged !== head && staged !== expected))
      return {
        committed: false,
        reason: `${file} has changes beyond this run's exact trusted-name additions; retained index and working tree`,
      }
    if (head === expected) return { committed: false, reason: `${file} has no change to commit` }
    scratch = mkdtempSync(join(gitDir, 'trust-commit-'))
    const index = join(scratch, 'commit.index')
    const env = { GIT_INDEX_FILE: index, MOL_PRECOMMIT_BASE: parent }
    git(['read-tree', parent], env)
    const blob = git(['hash-object', '-w', '--stdin'], undefined, expected).trim()
    const modes = git(['ls-tree', parent, '--', file]).trim()
    if (!modes.startsWith('100644 ')) throw new Error(`${file} must be an ordinary tracked ledger`)
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${file}`], env)
    // Hooks see only our private index; the shared index remains owned by peers.
    git(['hook', 'run', '--ignore-missing', 'pre-commit'], env)
    if (
      git(['diff', '--cached', '--name-only', parent], env).trim() !== file ||
      git(['rev-parse', `:${file}`], env).trim() !== blob
    )
      throw new Error('pre-commit changed the inspected trust-only commit')
    const tree = git(['write-tree'], env).trim()
    // Prepare the eventual shared index with Git itself, preserving every other
    // staged path. Publication below uses Git's standard index.lock protocol.
    const reconciled = join(scratch, 'shared.index')
    copyFileSync(sharedIndex, reconciled)
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${file}`], {
      GIT_INDEX_FILE: reconciled,
    })
    indexLock = join(gitDir, 'index.lock')
    let fd
    try {
      fd = openSync(indexLock, 'wx')
    } catch (error) {
      if (error?.code === 'EEXIST') throw new Contention('another git process held the index lock')
      throw error
    }
    lockOwned = true
    closeSync(fd)
    if (
      git(['rev-parse', 'HEAD']).trim() !== parent ||
      !readFileSync(sharedIndex).equals(beforeIndex) ||
      readFileSync(join(root, file), 'utf8') !== worktree
    )
      throw new Contention('HEAD, index, or trust ledger changed during the hook')
    // The shared index is locked and the inspected HEAD is named explicitly.
    // A peer moving HEAD from another private index makes update-ref refuse.
    writeFileSync(indexLock, readFileSync(reconciled))
    const commit = git(['commit-tree', tree, '-p', parent, '-m', trustCommitMessage(added)]).trim()
    try {
      git(['update-ref', '-m', trustCommitMessage(added).split('\n')[0], 'HEAD', commit, parent])
    } catch (_error) {
      // update-ref names the inspected HEAD: it refuses when a peer moved HEAD meanwhile.
      throw new Contention('HEAD moved before the commit could land')
    }
    committedSha = commit
    renameSync(indexLock, sharedIndex)
    lockOwned = false
    return { committed: true, sha: commit.slice(0, 7) }
  } catch (error) {
    if (error instanceof Contention && !committedSha) return { contended: error.message }
    const detail = failureTail(error)
    if (committedSha)
      return {
        committed: true,
        sha: committedSha.slice(0, 7),
        reason: `the trust commit landed, but the shared index could not be updated; reconcile ${file} staging before another commit:\n${detail}`,
      }
    return {
      committed: false,
      reason: `the commit failed — commit ${file} by hand:\n${detail}`,
    }
  } finally {
    if (lockOwned) rmSync(indexLock, { force: true })
    if (scratch) rmSync(scratch, { recursive: true, force: true })
  }
}
