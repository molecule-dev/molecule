import { execFile, execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

import {
  judgeChange,
  readRevisionFiles,
  versionsWithoutChangelog,
} from '../check-version-changelogs.mjs'

const SCRIPT = join(import.meta.dirname, '../check-version-changelogs.mjs')
const MOLECULE = join(import.meta.dirname, '../..')
const HOOK = join(MOLECULE, '.husky/pre-commit')
const CI = join(MOLECULE, '.github/workflows/ci.yml')
const PKG = 'packages/api/core/thing'
const CHANGELOG = `# @molecule/api-thing\n\n## 1.1.0\n\n### Minor Changes\n\n- New thing.\n`
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
const thing = (version, extra = {}) => ({ name: '@molecule/api-thing', version, ...extra })

/**
 * A scratch molecule-shaped repo holding one published package at 1.0.0 with no CHANGELOG.md.
 *
 * @returns The repo root.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'version-changelogs-'))
  roots.push(root)
  write(root, `${PKG}/package.json`, thing('1.0.0'))
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'fixture@example.com')
  git(root, 'config', 'user.name', 'Fixture')
  git(root, 'add', '.')
  git(root, 'commit', '-qm', 'fixture')
  return root
}

/** What `changeset version` leaves in the working tree: the bump and a NEW CHANGELOG.md. */
const changesetVersion = (root) => {
  write(root, `${PKG}/package.json`, thing('1.1.0'))
  write(root, `${PKG}/CHANGELOG.md`, CHANGELOG)
}

/**
 * Run the CLI in a fixture repo.
 *
 * @param root - The fixture repo.
 * @param args - CLI arguments.
 * @param env - Extra environment.
 * @returns Its exit status, stdout and stderr.
 */
const run = (root, args, env = {}) =>
  new Promise((resolve) => {
    const clean = { ...process.env }
    for (const name of ['GITHUB_EVENT_NAME', 'GITHUB_EVENT_BEFORE', 'GITHUB_BASE_REF'])
      delete clean[name]
    execFile(
      process.execPath,
      [SCRIPT, ...args],
      { cwd: root, encoding: 'utf8', env: { ...clean, ...env } },
      (error, stdout, stderr) => resolve({ status: error ? (error.code ?? 1) : 0, stdout, stderr }),
    )
  })

describe('a raised version ships with its CHANGELOG section', () => {
  it('known-bad: refuses a version commit of tracked files only, and names the file to stage (923334bb5d)', async () => {
    const root = fixture()
    changesetVersion(root)
    git(root, 'add', '-u')
    const result = await run(root, ['--staged'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      `@molecule/api-thing: the version goes 1.0.0 → 1.1.0, but ${PKG}/CHANGELOG.md has no \`## 1.1.0\` section`,
    )
    expect(result.stderr).toContain(`git add ${PKG}/CHANGELOG.md`)
  })

  it('accepts the same commit once it stages the CHANGELOG.md', async () => {
    const root = fixture()
    changesetVersion(root)
    git(root, 'add', '-u')
    git(root, 'add', `${PKG}/CHANGELOG.md`)
    expect((await run(root, ['--staged'])).status).toBe(0)
  })

  it('refuses a CHANGELOG that has only older sections', async () => {
    const root = fixture()
    write(root, `${PKG}/package.json`, thing('1.1.0'))
    write(root, `${PKG}/CHANGELOG.md`, '# @molecule/api-thing\n\n## 1.0.0\n\n- First.\n')
    git(root, 'add', '.')
    expect((await run(root, ['--staged'])).status).toBe(1)
  })

  it('judges the index against MOL_PRECOMMIT_BASE when a private-index commit names one', async () => {
    const root = fixture()
    const base = git(root, 'rev-parse', 'HEAD')
    write(root, `${PKG}/package.json`, thing('1.0.0', { description: 'A thing.' }))
    git(root, 'commit', '-qam', 'a later commit')
    changesetVersion(root)
    git(root, 'add', '-u')
    expect((await run(root, ['--staged'], { MOL_PRECOMMIT_BASE: base })).status).toBe(1)
  })

  it('does not judge a lowered version, a new package, a private package or a manifest edit', () => {
    const files = {
      before: {
        'packages/a/package.json': JSON.stringify({ name: '@molecule/a', version: '1.2.0' }),
        'packages/c/package.json': JSON.stringify({
          name: '@molecule/c',
          version: '1.0.0',
          private: true,
        }),
        'packages/d/package.json': JSON.stringify({ name: '@molecule/d', version: '1.0.0' }),
      },
      after: {
        'packages/a/package.json': JSON.stringify({ name: '@molecule/a', version: '1.1.9' }),
        'packages/b/package.json': JSON.stringify({ name: '@molecule/b', version: '1.0.0' }),
        'packages/c/package.json': JSON.stringify({
          name: '@molecule/c',
          version: '1.1.0',
          private: true,
        }),
        'packages/d/package.json': JSON.stringify({
          name: '@molecule/d',
          version: '1.0.0',
          description: 'x',
        }),
      },
    }
    expect(
      versionsWithoutChangelog({
        manifests: Object.keys(files.after),
        before: (file) => files.before[file] ?? null,
        after: (file) => files.after[file] ?? null,
      }),
    ).toEqual([])
  })

  it('judges a pushed range: refused until a later commit in the range adds the section', async () => {
    const root = fixture()
    const base = git(root, 'rev-parse', 'HEAD')
    changesetVersion(root)
    git(root, 'commit', '-qam', 'chore: version packages')
    const refused = await run(root, [`--base=${base}`])
    expect(refused.status).toBe(1)
    expect(refused.stderr).toContain('has no `## 1.1.0` section')
    const ci = await run(root, ['--base=ci'], {
      GITHUB_EVENT_NAME: 'push',
      GITHUB_EVENT_BEFORE: base,
    })
    expect(ci.status).toBe(1)
    git(root, 'add', `${PKG}/CHANGELOG.md`)
    git(root, 'commit', '-qm', 'chore: add the changelog')
    expect((await run(root, [`--base=${base}`])).status).toBe(0)
  })

  it('judges nothing, and says so, for --base=ci outside a push or pull request', async () => {
    const root = fixture()
    changesetVersion(root)
    git(root, 'commit', '-qam', 'chore: version packages')
    const result = await run(root, ['--base=ci'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('no push or pull-request base')
  })

  it('known-bad: refuses molecule 923334bb5d itself, for its three document-text packages', () => {
    const manifests = execFileSync(
      'git',
      [
        '-C',
        MOLECULE,
        'diff-tree',
        '-r',
        '--no-commit-id',
        '--name-only',
        '923334bb5d^',
        '923334bb5d',
      ],
      { encoding: 'utf8' },
    )
      .split('\n')
      .filter((file) => file.endsWith('/package.json'))
    expect(manifests.length).toBeGreaterThan(3)
    const missing = judgeChange(MOLECULE, manifests, '923334bb5d^', '923334bb5d')
    expect(missing.map(({ name }) => name)).toEqual([
      '@molecule/api-document-text',
      '@molecule/api-document-text-molecule',
      '@molecule/api-document-text-pdfjs',
    ])
  })

  it('reads files at revisions and in the index by bytes, and a name that resolves to nothing as null', () => {
    const root = fixture()
    write(root, 'notes.md', 'Grüße — ✓\n')
    git(root, 'add', 'notes.md')
    const files = readRevisionFiles(root, [
      `HEAD:${PKG}/package.json`,
      ':notes.md',
      'HEAD:notes.md',
      `HEAD:${PKG}`,
      ':notes.md',
    ])
    expect(JSON.parse(files.get(`HEAD:${PKG}/package.json`)).version).toBe('1.0.0')
    expect(files.get(':notes.md')).toBe('Grüße — ✓\n')
    expect(files.get('HEAD:notes.md')).toBeNull()
    expect(files.get(`HEAD:${PKG}`)).toBeNull()
  })

  it('runs in the pre-commit hook and in CI on the pushed range', () => {
    expect(readFileSync(HOOK, 'utf8')).toContain(
      'node scripts/check-version-changelogs.mjs --staged',
    )
    const ci = readFileSync(CI, 'utf8')
    const step = ci.indexOf('npm run check:version-changelogs -- --base=ci')
    expect(step).toBeGreaterThan(-1)
    expect(ci.slice(step, step + 200)).toContain('GITHUB_EVENT_BEFORE: ${{ github.event.before }}')
  })
})
