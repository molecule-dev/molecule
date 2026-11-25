#!/usr/bin/env node
/* global console, process */
/**
 * Refuse a direct commit whose index would revert a commit that landed while the pre-commit hook
 * ran. `git commit` takes the HEAD of the moment it writes the commit as the parent, after a hook
 * that runs for minutes, while every check in the hook judged the index against the HEAD it started
 * from. A path the commits in between changed, whose index entry still holds the starting HEAD's
 * blob, is written back to that blob: the commit reverts it (2026-11-25: a direct commit's hook
 * published READMEs generated from the tree before ebdd62942b over the ones that commit had just
 * landed). A private-index commit through `scripts/lib/commit-staged-paths.mjs` names its parent
 * and never meets this; its hook runs with `MOL_PRECOMMIT_BASE` set and skips this check.
 *
 * usage: node scripts/precommit-head-moved.mjs <the HEAD the hook started from>
 * Exits 1, naming each such path, when the commit would revert one; 0 otherwise.
 */
import { spawnSync } from 'node:child_process'

import { isMainModule } from './lib/is-main.mjs'

/**
 * Run git in the current repository (its index is whatever `GIT_INDEX_FILE` names).
 *
 * @param args - git arguments.
 * @param cwd - The repository.
 * @returns stdout, or null when git fails (an object that does not exist).
 */
function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 })
  return result.status === 0 ? result.stdout : null
}

/**
 * The object id a revision names, or an empty string when it names none.
 *
 * @param rev - `<commit>:<path>` or `:<path>` (the index entry).
 * @param cwd - The repository.
 * @returns The id, or ''.
 */
const objectAt = (rev, cwd) => (git(['rev-parse', '-q', '--verify', rev], cwd) ?? '').trim()

/**
 * The paths a commit built from the index now would put back as they were at `start`.
 *
 * @param start - The HEAD the hook started from.
 * @param cwd - The repository.
 * @returns The current HEAD and the paths, in git's order.
 */
export function revertedSince(start, cwd = process.cwd()) {
  const head = objectAt('HEAD', cwd)
  if (!start || head === start) return { head, paths: [] }
  const changed = (git(['diff', '--name-only', '--no-renames', start, head], cwd) ?? '')
    .split('\n')
    .filter(Boolean)
  const paths = changed.filter((path) => {
    const entry = objectAt(`:${path}`, cwd)
    return entry !== objectAt(`${head}:${path}`, cwd) && entry === objectAt(`${start}:${path}`, cwd)
  })
  return { head, paths }
}

if (isMainModule(import.meta.url)) {
  const start = process.argv[2] ?? ''
  const { head, paths } = revertedSince(start)
  if (paths.length) {
    console.error(
      `✗ HEAD moved from ${start.slice(0, 10)} to ${head.slice(0, 10)} while this hook ran, and this commit would revert ${paths.length} path(s) those commits changed:`,
    )
    for (const path of paths) console.error(`    ${path}`)
    console.error(
      '  Nothing was committed. Re-stage those paths from HEAD (or your own edit of them) and commit again,',
    )
    console.error(
      '  or commit through scripts/lib/commit-staged-paths.mjs, which names its parent and merges a moved HEAD.',
    )
    process.exit(1)
  }
}
