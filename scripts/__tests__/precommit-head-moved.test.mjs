import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

import { revertedSince } from '../precommit-head-moved.mjs'

const SCRIPT = join(import.meta.dirname, '../precommit-head-moved.mjs')
const HOOK = join(import.meta.dirname, '../../.husky/pre-commit')
const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@t',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@t',
}
delete ENV.GIT_INDEX_FILE
delete ENV.GIT_DIR

let repo = ''
afterEach(() => {
  if (repo) rmSync(repo, { recursive: true, force: true })
  repo = ''
})

/** Run git in the fixture. */
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', env: ENV }).trim()

/**
 * A repository at one commit, with an edit of `a.md` staged (the commit in progress), and the HEAD
 * that edit's hook started from.
 */
function started() {
  repo = mkdtempSync(join(tmpdir(), 'head-moved-'))
  git('init', '-q')
  writeFileSync(join(repo, 'a.md'), 'a1\n')
  writeFileSync(join(repo, 'README.md'), 'generated 1\n')
  git('add', '-A')
  git('commit', '-q', '-m', 'start')
  writeFileSync(join(repo, 'a.md'), 'a2\n')
  git('add', 'a.md')
  return git('rev-parse', 'HEAD')
}

/**
 * A peer's commit that lands during the hook through its own index, as commit-staged-paths does:
 * the shared index is not touched.
 */
function peerCommits(files) {
  const index = join(repo, '.git', 'peer-index')
  const env = { ...ENV, GIT_INDEX_FILE: index }
  const run = (...args) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8', env, input: '' }).trim()
  run('read-tree', 'HEAD')
  for (const [path, text] of Object.entries(files)) {
    const sha = execFileSync('git', ['hash-object', '-w', '--stdin'], {
      cwd: repo,
      encoding: 'utf8',
      env,
      input: text,
    }).trim()
    run('update-index', '--add', '--cacheinfo', `100644,${sha},${path}`)
  }
  const tree = run('write-tree')
  const parent = run('rev-parse', 'HEAD')
  const commit = execFileSync('git', ['commit-tree', tree, '-p', parent, '-m', 'peer'], {
    cwd: repo,
    encoding: 'utf8',
    env,
  }).trim()
  run('update-ref', 'HEAD', commit, parent)
  rmSync(index, { force: true })
  return commit
}

describe('a commit that lands while the pre-commit hook runs', () => {
  it('names the paths the moved HEAD changed that the index would put back', () => {
    const start = started()
    peerCommits({ 'README.md': 'generated 2\n', 'new.md': 'added\n' })
    expect(revertedSince(start, repo).paths).toEqual(['README.md', 'new.md'])
    const run = spawnSync(process.execPath, [SCRIPT, start], {
      cwd: repo,
      encoding: 'utf8',
      env: ENV,
    })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain('this commit would revert 2 path(s)')
    expect(run.stderr).toContain('    README.md')
  })

  it('passes when the index already carries the moved HEAD, or HEAD did not move', () => {
    const start = started()
    expect(revertedSince(start, repo).paths).toEqual([])
    const peer = peerCommits({ 'README.md': 'generated 2\n' })
    // The peer settled the shared index after landing (reconcile-stale-index does).
    git('update-index', '--cacheinfo', `100644,${git('rev-parse', `${peer}:README.md`)},README.md`)
    expect(revertedSince(start, repo).paths).toEqual([])
    const run = spawnSync(process.execPath, [SCRIPT, start], {
      cwd: repo,
      encoding: 'utf8',
      env: ENV,
    })
    expect(run.status).toBe(0)
  })

  it('keeps a path this commit itself changes, even one the moved HEAD changed too', () => {
    const start = started()
    peerCommits({ 'a.md': 'peer\n' })
    // The staged a.md is this commit's own edit, not the starting blob: it is a conflict the
    // author resolves in their own commit, not a silent revert.
    expect(revertedSince(start, repo).paths).toEqual([])
  })
})

describe('the hook', () => {
  const hook = readFileSync(HOOK, 'utf8')

  it('records the HEAD it starts from before any check runs', () => {
    const recorded = hook.indexOf('HOOK_START_HEAD=$(git rev-parse -q --verify HEAD')
    expect(recorded).toBeGreaterThan(0)
    expect(recorded).toBeLessThan(hook.indexOf('staged_diff() {'))
  })

  it('refuses a moved HEAD before it publishes docs, and publishes over the starting HEAD only', () => {
    const check = hook.indexOf('node scripts/precommit-head-moved.mjs "$HOOK_START_HEAD"')
    const publish = hook.indexOf('PUBLISH_BASE=')
    expect(check).toBeGreaterThan(0)
    expect(check).toBeLessThan(publish)
    expect(hook).toContain('PUBLISH_BASE=${DIFF_BASE:-${HOOK_START_HEAD:-HEAD}}')
    expect(hook).not.toContain('PUBLISH_BASE=${DIFF_BASE:-HEAD}')
  })
})
