/**
 * Commit only the trust ledger additions this run owns.
 *
 * A private index contains the inspected HEAD plus the exact added names. Hooks
 * run against that index; commit-tree names that HEAD and update-ref uses CAS.
 * Unexpected same-ledger edits or intervening HEAD/index changes refuse without
 * rewriting the ledger or another session's staging. Standard Git commands keep
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
 * @returns Commit result or a refusal reason; trust work remains saved on failure.
 */
export function commitTrustState({ root, file, added, run = execFileSync }) {
  if (!added.length) return { committed: false, reason: 'nothing was added to the ledger' }
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
    const fd = openSync(indexLock, 'wx')
    lockOwned = true
    closeSync(fd)
    if (
      git(['rev-parse', 'HEAD']).trim() !== parent ||
      !readFileSync(sharedIndex).equals(beforeIndex) ||
      readFileSync(join(root, file), 'utf8') !== worktree
    )
      throw new Error('HEAD, index, or trust ledger changed during the hook; retained peer work')
    // The shared index is locked and the inspected HEAD is named explicitly.
    // A peer moving HEAD from another private index makes update-ref refuse.
    writeFileSync(indexLock, readFileSync(reconciled))
    const commit = git(['commit-tree', tree, '-p', parent, '-m', trustCommitMessage(added)]).trim()
    git(['update-ref', '-m', trustCommitMessage(added).split('\n')[0], 'HEAD', commit, parent])
    committedSha = commit
    renameSync(indexLock, sharedIndex)
    lockOwned = false
    return { committed: true, sha: commit.slice(0, 7) }
  } catch (error) {
    const detail = String(error?.stderr || error?.stdout || error?.message || error).trim()
    if (committedSha)
      return {
        committed: true,
        sha: committedSha.slice(0, 7),
        reason: `the trust commit landed, but the shared index could not be updated; reconcile ${file} staging before another commit:\n${detail.slice(0, 600)}`,
      }
    return {
      committed: false,
      reason: `the commit failed — commit ${file} by hand:\n${detail.slice(0, 600)}`,
    }
  } finally {
    if (lockOwned) rmSync(indexLock, { force: true })
    if (scratch) rmSync(scratch, { recursive: true, force: true })
  }
}
