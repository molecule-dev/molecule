/**
 * Commit the trust ledger (`.trust-state.json`) after `trust:new` records packages in it.
 *
 * The ledger is the record of which packages are already published and trusted. A run that
 * adds to it and leaves the file dirty strands that record in the working tree — the next
 * session finds an unexplained modification. So the run that changes it commits it.
 *
 * The commit names only the ledger path (`git commit -- <file>`), so anything else that is
 * staged in the shared checkout stays staged and out of this commit. It never pushes.
 * A tracked-file-only rule applies: an untracked ledger (the file is also in `.gitignore`)
 * is left alone rather than force-added.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'

/**
 * The commit subject for the packages a run added.
 *
 * @param added - Package names newly recorded.
 * @returns The commit message (subject, plus a body listing names when there are several).
 */
export function trustCommitMessage(added) {
  if (added.length === 1) return `chore(trust): record ${added[0]} in the trust state`
  return `chore(trust): record ${added.length} newly trusted packages\n\n${added.map((n) => `- ${n}`).join('\n')}`
}

/**
 * Commit the ledger if this run changed it.
 *
 * @param options - What to commit and where.
 * @param options.root - The repository root (where the ledger lives).
 * @param options.file - The ledger path, relative to `root`.
 * @param options.added - Package names this run added to the ledger.
 * @param [options.run] - Command runner (injected by tests).
 * @returns What happened. A failure to commit
 *   is reported in `reason`, never thrown: the trust work is already done and saved.
 */
export function commitTrustState({ root, file, added, run = execFileSync }) {
  if (!added.length) return { committed: false, reason: 'nothing was added to the ledger' }
  const git = (args) => run('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' })
  try {
    git(['rev-parse', '--is-inside-work-tree'])
  } catch (_error) {
    // git's non-zero exit IS the answer to "is this a work tree?"; it is reported through `reason`.
    return { committed: false, reason: 'not inside a git work tree' }
  }
  try {
    git(['ls-files', '--error-unmatch', '--', file])
  } catch (_error) {
    // `--error-unmatch` exits non-zero for an untracked path; that is the answer, reported through `reason`.
    return { committed: false, reason: `${file} is not tracked by git — commit it by hand` }
  }
  if (!git(['status', '--porcelain', '--', file]).trim()) {
    return { committed: false, reason: `${file} has no change to commit` }
  }
  try {
    git(['commit', '-m', trustCommitMessage(added), '--', file])
    return { committed: true, sha: git(['rev-parse', '--short', 'HEAD']).trim() }
  } catch (error) {
    const detail = String(error?.stderr || error?.stdout || error?.message || error).trim()
    return {
      committed: false,
      reason: `the commit failed — commit ${file} by hand:\n${detail.slice(0, 600)}`,
    }
  }
}
