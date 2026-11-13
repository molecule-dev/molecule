import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = join(import.meta.dirname, '../precommit-changeset.mjs')
const HOOK = join(import.meta.dirname, '../../.husky/pre-commit')
const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const write = (root, file, value) => {
  const path = join(root, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`)
}
const git = (root, ...args) =>
  execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim()
const stage = (root, file, value) => {
  write(root, file, value)
  git(root, 'add', file)
}
const run = (root) => spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: 'utf8' })

/**
 * A scratch molecule-shaped repo with one published package and one commit.
 *
 * @returns The repo root.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'precommit-changeset-'))
  roots.push(root)
  write(root, 'packages/a/package.json', {
    name: '@molecule/a',
    version: '1.0.0',
    exports: './src/index.ts',
  })
  write(root, 'packages/a/src/index.ts', 'export const a = 1\n')
  write(root, 'packages/a/src/__tests__/a.test.ts', 'export const testOnly = 1\n')
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'fixture@example.com')
  git(root, 'config', 'user.name', 'Fixture')
  git(root, 'add', '.')
  git(root, 'commit', '-qm', 'fixture')
  return root
}

describe('published-file changeset pre-commit gate', () => {
  it('refuses staged source without a pending changeset and prints the one-line fix', () => {
    const root = fixture()
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    const result = run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('@molecule/a')
    expect(result.stderr).toContain('npx changeset')
  })

  it('accepts source when a staged pending changeset names the package', () => {
    const root = fixture()
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    stage(root, '.changeset/calm-pandas.md', "---\n'@molecule/a': patch\n---\n\nFix a.\n")
    expect(run(root).status).toBe(0)
  })

  it('checks exports, not unrelated manifest metadata or test-only source', () => {
    const root = fixture()
    stage(root, 'packages/a/package.json', {
      name: '@molecule/a',
      version: '1.0.0',
      description: 'metadata only',
      exports: './src/index.ts',
    })
    stage(root, 'packages/a/src/__tests__/a.test.ts', 'export const testOnly = 2\n')
    expect(run(root).status).toBe(0)
    stage(root, 'packages/a/package.json', {
      name: '@molecule/a',
      version: '1.0.0',
      description: 'metadata only',
      exports: { '.': './src/index.ts' },
    })
    expect(run(root).status).toBe(1)
  })

  it('refuses a deleted published source even though the hook’s format list excludes deletions', () => {
    const root = fixture()
    git(root, 'rm', '-q', 'packages/a/src/index.ts')
    const result = run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('@molecule/a')
  })

  it('accepts removing a whole package, which has no next version to describe', () => {
    const root = fixture()
    git(root, 'rm', '-rq', 'packages/a')
    expect(run(root).status).toBe(0)
  })

  it('is wired into the real pre-commit hook before its non-deletion early exit', () => {
    const hook = readFileSync(HOOK, 'utf8')
    expect(hook).toContain('node scripts/precommit-changeset.mjs')
    expect(hook.indexOf('node scripts/precommit-changeset.mjs')).toBeLessThan(
      hook.indexOf('if [ -z "$STAGED" ]'),
    )
  })
})
