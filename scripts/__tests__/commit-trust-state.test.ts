/**
 * `trust:new` commits the ledger it just changed — and only the ledger. Real temporary git repos,
 * because the property that matters (another session's staged file stays out of the commit) is a
 * git behavior, not something a mock can show.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { commitTrustState, trustCommitMessage } from '../lib/commit-trust-state.mjs'

const LEDGER = '.trust-state.json'
let dir: string | null = null

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = null
})

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

/** A repo with the ledger and one other file already committed. */
function repo(): string {
  dir = mkdtempSync(join(tmpdir(), 'trust-commit-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'test@example.com')
  git(dir, 'config', 'user.name', 'Test')
  git(dir, 'config', 'commit.gpgsign', 'false')
  writeFileSync(join(dir, LEDGER), '[\n  "@molecule/a"\n]\n')
  writeFileSync(join(dir, 'other.txt'), 'one\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'initial')
  return dir
}

describe('trustCommitMessage', () => {
  it('names the package when one was added', () => {
    expect(trustCommitMessage(['@molecule/b'])).toBe(
      'chore(trust): record @molecule/b in the trust state',
    )
  })

  it('counts and lists the packages when several were added', () => {
    const message = trustCommitMessage(['@molecule/b', '@molecule/c'])
    expect(message.split('\n')[0]).toBe('chore(trust): record 2 newly trusted packages')
    expect(message).toContain('- @molecule/b')
    expect(message).toContain('- @molecule/c')
  })
})

describe('commitTrustState', () => {
  it('commits the changed ledger and nothing else, leaving another file staged', () => {
    const root = repo()
    writeFileSync(join(root, LEDGER), '[\n  "@molecule/a",\n  "@molecule/b"\n]\n')
    // another session's work, already staged in the shared checkout
    writeFileSync(join(root, 'other.txt'), 'two\n')
    git(root, 'add', 'other.txt')

    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] })

    expect(result.committed).toBe(true)
    expect(result.sha).toMatch(/^[0-9a-f]{7,}$/)
    expect(git(root, 'show', '--name-only', '--format=%s', 'HEAD').split('\n')).toEqual([
      'chore(trust): record @molecule/b in the trust state',
      '',
      LEDGER,
    ])
    // the other file is still staged and still unpublished
    expect(git(root, 'diff', '--cached', '--name-only')).toBe('other.txt')
    expect(git(root, 'status', '--porcelain', '--', LEDGER)).toBe('')
  })

  it('does nothing when the run added no package', () => {
    const root = repo()
    const before = git(root, 'rev-parse', 'HEAD')
    const result = commitTrustState({ root, file: LEDGER, added: [] })
    expect(result.committed).toBe(false)
    expect(result.reason).toMatch(/nothing was added/)
    expect(git(root, 'rev-parse', 'HEAD')).toBe(before)
  })

  it('does nothing when the ledger file has no change', () => {
    const root = repo()
    const before = git(root, 'rev-parse', 'HEAD')
    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/a'] })
    expect(result.committed).toBe(false)
    expect(result.reason).toMatch(/no change/)
    expect(git(root, 'rev-parse', 'HEAD')).toBe(before)
  })

  it('leaves an untracked ledger alone instead of force-adding an ignored file', () => {
    const root = repo()
    writeFileSync(join(root, '.gitignore'), `${LEDGER}\n`)
    git(root, 'rm', '-q', '--cached', LEDGER)
    git(root, 'add', '.gitignore')
    git(root, 'commit', '-q', '-m', 'ledger becomes untracked')
    writeFileSync(join(root, LEDGER), '["@molecule/z"]\n')
    const before = git(root, 'rev-parse', 'HEAD')

    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/z'] })

    expect(result.committed).toBe(false)
    expect(result.reason).toMatch(/not tracked/)
    expect(git(root, 'rev-parse', 'HEAD')).toBe(before)
  })

  it('reports a directory that is not a git work tree', () => {
    dir = mkdtempSync(join(tmpdir(), 'trust-nogit-'))
    mkdirSync(join(dir, 'sub'))
    writeFileSync(join(dir, LEDGER), '[]\n')
    const result = commitTrustState({ root: dir, file: LEDGER, added: ['@molecule/b'] })
    expect(result.committed).toBe(false)
    expect(result.reason).toMatch(/not inside a git work tree|not tracked/)
  })

  it('reports a failed commit with the file to commit by hand, instead of throwing', () => {
    const root = repo()
    writeFileSync(join(root, LEDGER), '[\n  "@molecule/a",\n  "@molecule/b"\n]\n')
    // a pre-commit hook that refuses everything
    const hooks = join(root, '.git', 'hooks')
    writeFileSync(join(hooks, 'pre-commit'), '#!/bin/sh\necho refused-by-hook >&2\nexit 1\n', {
      mode: 0o755,
    })

    const result = commitTrustState({ root, file: LEDGER, added: ['@molecule/b'] })

    expect(result.committed).toBe(false)
    expect(result.reason).toContain(`commit ${LEDGER} by hand`)
    expect(result.reason).toContain('refused-by-hook')
  })
})
