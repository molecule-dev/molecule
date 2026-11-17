import { execFile, execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

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
/**
 * A stand-in npm registry: package name → its published versions; a name it does not list is a
 * 404, and `down` answers every request with a 503.
 */
const npm = { published: new Map([['@molecule/a', ['1.0.0']]]), down: false, requests: 0 }
let registry = ''
const server = createServer((request, response) => {
  npm.requests += 1
  if (npm.down) return response.writeHead(503).end()
  const versions = npm.published.get(decodeURIComponent(request.url.slice(1)))
  if (!versions) return response.writeHead(404).end()
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ versions: Object.fromEntries(versions.map((v) => [v, {}])) }))
})
beforeAll(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  registry = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => new Promise((resolve) => server.close(resolve)))
afterEach(() => {
  npm.published = new Map([['@molecule/a', ['1.0.0']]])
  npm.down = false
  npm.requests = 0
})

/**
 * Run the gate in a fixture repo against the stand-in registry.
 *
 * @param root - The fixture repo.
 * @returns Its exit status and stderr.
 */
const run = (root) =>
  new Promise((resolve) => {
    execFile(
      process.execPath,
      [SCRIPT],
      { cwd: root, encoding: 'utf8', env: { ...process.env, npm_config_registry: registry } },
      (error, _stdout, stderr) => resolve({ status: error ? (error.code ?? 1) : 0, stderr }),
    )
  })

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
  it('refuses staged source without a pending changeset and prints the one-line fix', async () => {
    const root = fixture()
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    const result = await run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('@molecule/a')
    expect(result.stderr).toContain('npx changeset')
  })

  it('accepts source when a staged pending changeset names the package', async () => {
    const root = fixture()
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    stage(root, '.changeset/calm-pandas.md', "---\n'@molecule/a': patch\n---\n\nFix a.\n")
    expect((await run(root)).status).toBe(0)
  })

  it('checks exports, not unrelated manifest metadata or test-only source', async () => {
    const root = fixture()
    stage(root, 'packages/a/package.json', {
      name: '@molecule/a',
      version: '1.0.0',
      description: 'metadata only',
      exports: './src/index.ts',
    })
    stage(root, 'packages/a/src/__tests__/a.test.ts', 'export const testOnly = 2\n')
    expect((await run(root)).status).toBe(0)
    stage(root, 'packages/a/package.json', {
      name: '@molecule/a',
      version: '1.0.0',
      description: 'metadata only',
      exports: { '.': './src/index.ts' },
    })
    expect((await run(root)).status).toBe(1)
  })

  it('treats a test in a nested __tests__ directory as unpublished, like a top-level one', async () => {
    // 2026-11-16: test-only changes to @molecule/app-vue's src/composables/__tests__/ were refused
    // as published source, though its build excludes src/**/__tests__/** and the tarball has none.
    const root = fixture()
    stage(root, 'packages/a/src/composables/__tests__/useA.test.ts', 'export const nested = 1\n')
    expect((await run(root)).status).toBe(0)
    stage(root, 'packages/a/src/composables/useA.ts', 'export const useA = 1\n')
    expect((await run(root)).status).toBe(1)
  })

  it('refuses a deleted published source even though the hook’s format list excludes deletions', async () => {
    const root = fixture()
    git(root, 'rm', '-q', 'packages/a/src/index.ts')
    const result = await run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('@molecule/a')
  })

  it('accepts removing a whole package, which has no next version to describe', async () => {
    const root = fixture()
    git(root, 'rm', '-rq', 'packages/a')
    expect((await run(root)).status).toBe(0)
  })

  it('refuses a staged changeset that names a private package, and names the line to delete', async () => {
    const root = fixture()
    stage(root, 'packages/kit/package.json', {
      name: '@molecule/kit',
      version: '0.0.0',
      private: true,
    })
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    stage(
      root,
      '.changeset/calm-pandas.md',
      "---\n'@molecule/a': patch\n'@molecule/kit': patch\n---\n\nFix a.\n",
    )
    const result = await run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('.changeset/calm-pandas.md names @molecule/kit')
    expect(result.stderr).toContain("delete the `'@molecule/kit': …` line")
    expect(result.stderr).not.toContain('@molecule/a')
  })

  it('accepts the same changeset once it names only published packages', async () => {
    const root = fixture()
    stage(root, 'packages/kit/package.json', {
      name: '@molecule/kit',
      version: '0.0.0',
      private: true,
    })
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    stage(root, '.changeset/calm-pandas.md', "---\n'@molecule/a': patch\n---\n\nFix a.\n")
    expect((await run(root)).status).toBe(0)
  })

  /**
   * Commit the state an earlier \`changeset version\` leaves: `@molecule/a` at 1.0.1 with its CHANGELOG
   * section, not yet published.
   *
   * @param root - The fixture repo.
   */
  const versioned = (root) => {
    stage(root, 'packages/a/package.json', {
      name: '@molecule/a',
      version: '1.0.1',
      exports: './src/index.ts',
    })
    stage(root, 'packages/a/CHANGELOG.md', CHANGELOG)
    git(root, 'commit', '-qm', 'chore: version packages')
  }
  const CHANGELOG =
    '# @molecule/a\n\n## 1.0.1\n\n### Patch Changes\n\n- Earlier fix.\n\n## 1.0.0\n\n- First.\n'
  const withLine = (version, line) =>
    CHANGELOG.replace(`## ${version}\n\n### Patch Changes\n\n`, (m) => `${m}- ${line}\n`)

  it('accepts a change to a versioned, unpublished package that adds its line to that version', async () => {
    const root = fixture()
    versioned(root)
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    stage(root, 'packages/a/CHANGELOG.md', withLine('1.0.1', 'Fix a.'))
    expect((await run(root)).status).toBe(0)
  })

  it('refuses that change without its CHANGELOG line, and names the section to add it to', async () => {
    const root = fixture()
    versioned(root)
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    const result = await run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('@molecule/a@1.0.1 is not on npm yet')
    expect(result.stderr).toContain('`## 1.0.1` in packages/a/CHANGELOG.md')
  })

  it('still refuses a change to a published version, even with a CHANGELOG line', async () => {
    const root = fixture()
    npm.published.set('@molecule/a', ['1.0.0', '1.0.1'])
    versioned(root)
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    stage(root, 'packages/a/CHANGELOG.md', withLine('1.0.1', 'Fix a.'))
    const result = await run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('npx changeset')
    expect(result.stderr).not.toContain('is not on npm yet')
  })

  it('still refuses when the CHANGELOG line goes under an older version', async () => {
    const root = fixture()
    versioned(root)
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    stage(
      root,
      'packages/a/CHANGELOG.md',
      CHANGELOG.replace('## 1.0.0\n\n', '## 1.0.0\n\n- Fix a.\n'),
    )
    expect((await run(root)).status).toBe(1)
  })

  it('refuses when npm cannot say whether the version is published', async () => {
    const root = fixture()
    npm.down = true
    versioned(root)
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    stage(root, 'packages/a/CHANGELOG.md', withLine('1.0.1', 'Fix a.'))
    const result = await run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('npm could not say whether @molecule/a@1.0.1 is published')
    expect(result.stderr).toContain('npx changeset')
  })

  it('asks npm nothing when a changeset covers every change', async () => {
    const root = fixture()
    stage(root, 'packages/a/src/index.ts', 'export const a = 2\n')
    stage(root, '.changeset/calm-pandas.md', "---\n'@molecule/a': patch\n---\n\nFix a.\n")
    expect((await run(root)).status).toBe(0)
    expect(npm.requests).toBe(0)
  })

  it('is wired into the real pre-commit hook before its non-deletion early exit', () => {
    const hook = readFileSync(HOOK, 'utf8')
    expect(hook).toContain('node scripts/precommit-changeset.mjs')
    expect(hook.indexOf('node scripts/precommit-changeset.mjs')).toBeLessThan(
      hook.indexOf('if [ -z "$STAGED" ]'),
    )
  })
})
