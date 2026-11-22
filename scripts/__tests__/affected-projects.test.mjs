/** Real Git scope and unchanged CI-shell consumer controls; no package install. */
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

import { vitestBin } from '../vitest-with-tmp-root.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const scratch = path.resolve(ROOT, '../.experiments/affected-project-tests')
const fixtures = []

/** A tiny repository with real affected logic, npm runner and Vitest projects. */
function fixture() {
  fs.mkdirSync(scratch, { recursive: true })
  const dir = fs.mkdtempSync(path.join(scratch, 'git-'))
  fixtures.push(dir)
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), text)
  }
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  for (const file of [
    'scripts/affected-projects.mjs',
    'scripts/vitest-grouped.mjs',
    'scripts/vitest-budget-reporter.mjs',
    'scripts/vitest-with-tmp-root.mjs',
    'scripts/vitest.config.ts',
    'vitest.config.ts',
  ]) {
    write(file, fs.readFileSync(path.join(ROOT, file), 'utf8'))
  }
  write(
    'package.json',
    JSON.stringify({
      name: 'affected-fixture',
      private: true,
      type: 'module',
      scripts: {
        test: JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts.test,
      },
    }),
  )
  write('.trust-state.json', '[]\n')
  write('.gitignore', 'node_modules/\ntmp/\n')
  write(
    'scripts/__tests__/meta.test.ts',
    "import {it,expect} from 'vitest';it('meta guard',()=>expect(1).toBe(1))\n",
  )
  for (const name of ['a', 'b', 'c', 'd', 'unrelated', 'testing', 'lint']) {
    const pkg =
      name === 'testing'
        ? 'packages/api/testing'
        : name === 'lint'
          ? 'packages/tooling/lint'
          : `packages/api/core/${name}`
    const dependencies = { b: { '@molecule/a': '1.0.0' }, lint: { '@molecule/d': '1.0.0' } }[name]
    write(
      `${pkg}/package.json`,
      JSON.stringify({
        name: `@molecule/${name}`,
        version: '1.0.0',
        ...(dependencies ? { dependencies } : {}),
      }),
    )
    write(
      `${pkg}/vitest.config.ts`,
      `import {defineConfig} from 'vitest/config';export default defineConfig({test:{name:${JSON.stringify(name)},root:import.meta.dirname,include:['src/__tests__/*.test.ts'],environment:'node',maxWorkers:1}})\n`,
    )
    write(`${pkg}/src/index.ts`, 'export const value=1\n')
    write(
      `${pkg}/src/__tests__/sample.test.ts`,
      `import {it,expect} from 'vitest';it('${name} package',()=>expect(1).toBe(${name === 'unrelated' ? 2 : 1}))\n`,
    )
  }
  fs.mkdirSync(path.join(dir, 'tmp'))
  fs.symlinkSync(path.dirname(path.dirname(vitestBin(ROOT))), path.join(dir, 'node_modules'), 'dir')
  git('init', '-q')
  git('config', 'user.name', 'Affected test')
  git('config', 'user.email', 'affected@example.invalid')
  git('config', 'commit.gpgsign', 'false')
  git('add', '.')
  git('commit', '-qm', 'fixture baseline')
  let base = git('rev-parse', 'HEAD')
  const change = (changes) => {
    base = git('rev-parse', 'HEAD')
    for (const [file, text] of Object.entries(changes)) write(file, text)
    git('add', '--', ...Object.keys(changes))
    git('commit', '-qm', 'fixture change')
  }
  // The fixture is its own unsharded CI job. Every CI test shard sets MOL_VITEST_SHARD=<i>/8, and an inherited
  // shard selected 0 of the fixture's one project, so its `npm test` exited 0 having run nothing.
  const env = (extra = {}) => ({
    ...Object.fromEntries(
      Object.entries(process.env).filter(([name]) => !name.startsWith('MOL_VITEST_')),
    ),
    TMPDIR: path.join(dir, 'tmp'),
    GITHUB_EVENT_NAME: 'push',
    GITHUB_EVENT_BEFORE: base,
    ...extra,
  })
  const select = (extra = {}) =>
    spawnSync(process.execPath, ['scripts/affected-projects.mjs'], {
      cwd: dir,
      env: env(extra),
      encoding: 'utf8',
    })
  const consume = () =>
    spawnSync('bash', ['-c', 'npm test -- $(node scripts/affected-projects.mjs)'], {
      cwd: dir,
      env: env(),
      encoding: 'utf8',
      timeout: 30000,
    })
  return { dir, git, write, change, select, consume }
}

afterEach(() => {
  for (const dir of fixtures.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

// Each test builds a real Git fixture and spawns Node, so it gets the same limit as the suite runs it drives.
describe('trust-only affected scope', { timeout: 30000 }, () => {
  it('uses the identical CI rule in a committed export with an explicit changed-file inventory', () => {
    const f = fixture()
    f.change({ 'packages/api/core/a/src/index.ts': 'export const changed = true\n' })
    const expected = f.select().stdout
    expect(expected).toContain('packages/api/core/a')
    const actual = spawnSync(
      process.execPath,
      ['scripts/affected-projects.mjs', '--changed-files'],
      {
        cwd: f.dir,
        input: JSON.stringify(['packages/api/core/a/src/index.ts']),
        env: { ...process.env, GITHUB_EVENT_NAME: 'schedule' },
        encoding: 'utf8',
      },
    )
    expect(actual.status).toBe(0)
    expect(actual.stdout).toBe(expected)
    const structured = (files) =>
      spawnSync(process.execPath, ['scripts/affected-projects.mjs', '--changed-files', '--json'], {
        cwd: f.dir,
        input: JSON.stringify(files),
        encoding: 'utf8',
      })
    const scoped = structured(['packages/api/core/a/src/index.ts'])
    expect(() => JSON.parse(scoped.stdout)).not.toThrow()
    expect(JSON.parse(scoped.stdout)).toEqual({
      full: false,
      filter: expected,
      guards: ['scripts/__tests__'],
    })
    expect(JSON.parse(structured(['scripts/global.mjs']).stdout)).toEqual({
      full: true,
      filter: '',
      guards: ['scripts/__tests__'],
    })
  })

  it('runs real meta tests through the unchanged CI shell, without unrelated package tests', () => {
    const f = fixture()
    f.change({ '.trust-state.json': '["@molecule/a"]\n' })
    expect(f.select().stdout).toBe('scripts/__tests__')
    const actual = f.consume()
    expect(actual.status, actual.stdout + actual.stderr).toBe(0)
    expect(actual.stdout).toMatch(/1 passed/)
    expect(actual.stdout + actual.stderr).not.toContain('unrelated package')
  }, 30000)

  it('still fails a real bad meta test on a trust-only commit', () => {
    const f = fixture()
    f.change({
      'scripts/__tests__/meta.test.ts':
        "import {it,expect} from 'vitest';it('meta guard',()=>expect(1).toBe(2))\n",
    })
    f.change({ '.trust-state.json': '["@molecule/a"]\n' })
    const actual = f.consume()
    expect(actual.status).toBe(1)
    expect(actual.stdout + actual.stderr).toContain('meta guard')
    expect(actual.stdout + actual.stderr).not.toContain('unrelated package')
  }, 30000)

  it('retains source and transitive dependents when trust metadata is mixed with source', () => {
    const f = fixture()
    f.change({
      '.trust-state.json': '["@molecule/a"]\n',
      'packages/api/core/a/src/index.ts': 'export const value=2\n',
    })
    expect(f.select().stdout).toBe('packages/api/core/a packages/api/core/b scripts/__tests__')
  })

  it('fails a real source regression while retaining its dependents', () => {
    const f = fixture()
    f.change({
      '.trust-state.json': '["@molecule/a"]\n',
      'packages/api/core/a/src/__tests__/sample.test.ts':
        "import {it,expect} from 'vitest';it('a package',()=>expect(1).toBe(2))\n",
    })
    expect(f.select().stdout).toBe('packages/api/core/a packages/api/core/b scripts/__tests__')
    const actual = f.consume()
    expect(actual.status).toBe(1)
    expect(actual.stdout + actual.stderr).toContain('a package')
    expect(actual.stdout + actual.stderr).not.toContain('unrelated package')
  }, 30000)
})

describe('source-only affected scope', { timeout: 30000 }, () => {
  it('selects a project tooling package that depends on a changed package', () => {
    const f = fixture()
    f.change({ 'packages/api/core/d/src/index.ts': 'export const value=2\n' })
    expect(f.select().stdout).toBe('packages/api/core/d packages/tooling/lint scripts/__tests__')
    f.change({ 'packages/tooling/lint/src/index.ts': 'export const value=2\n' })
    expect(f.select().stdout).toBe('packages/tooling/lint scripts/__tests__')
  })

  it('runs the repository guards with the affected packages', () => {
    const f = fixture()
    f.change({ 'packages/api/core/c/src/index.ts': 'export const value=2\n' })
    expect(f.select().stdout).toBe('packages/api/core/c scripts/__tests__')
    const actual = f.consume()
    expect(actual.status, actual.stdout + actual.stderr).toBe(0)
    expect(actual.stdout).toMatch(/2 passed/)
    expect(actual.stdout + actual.stderr).not.toContain('unrelated package')
  }, 30000)

  it('fails a package-only push when a repository guard fails', () => {
    const f = fixture()
    // A guard that a package change (not a scripts/ change) turns red, the way
    // a new UI bond without a conformance test turns the conformance gate red.
    f.change({
      'scripts/__tests__/meta.test.ts':
        "import {it,expect} from 'vitest';import {existsSync} from 'node:fs';it('meta guard',()=>expect(existsSync(new URL('../../packages/api/core/c/src/forbidden.ts', import.meta.url))).toBe(false))\n",
    })
    f.change({ 'packages/api/core/c/src/forbidden.ts': 'export const forbidden=1\n' })
    expect(f.select().stdout).toBe('packages/api/core/c scripts/__tests__')
    const actual = f.consume()
    expect(actual.status).toBe(1)
    expect(actual.stdout + actual.stderr).toContain('meta guard')
  }, 30000)

  it('uses a known pull-request merge base for the same exact metadata scope', () => {
    const f = fixture()
    f.change({ '.trust-state.json': '["@molecule/a"]\n' })
    f.git('update-ref', 'refs/remotes/origin/main', f.git('rev-parse', 'HEAD^'))
    expect(f.select({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'main' }).stdout).toBe(
      'scripts/__tests__',
    )
  })

  it.each([
    'vitest.config.ts',
    'package.json',
    'package-lock.json',
    'scripts/shared.mjs',
    '.github/workflows/ci.yml',
    'unknown.txt',
  ])('keeps full fallback for trust plus %s', (file) => {
    const f = fixture()
    const existing = fs.existsSync(path.join(f.dir, file))
      ? fs.readFileSync(path.join(f.dir, file), 'utf8')
      : ''
    f.change({
      '.trust-state.json': '["@molecule/a"]\n',
      [file]:
        file === 'package.json'
          ? JSON.stringify({ ...JSON.parse(existing), version: '1.0.0' })
          : existing + '\nchanged\n',
    })
    expect(f.select().stdout).toBe('')
    expect(f.select().stderr).toContain('FULL')
  })

  it.each([
    { GITHUB_EVENT_NAME: 'schedule' },
    { GITHUB_EVENT_BEFORE: '0'.repeat(40) },
    { GITHUB_EVENT_BEFORE: 'missing-revision' },
  ])('keeps full fallback when the base/event is unknown: %j', (extra) => {
    const f = fixture()
    f.change({ '.trust-state.json': '["@molecule/a"]\n' })
    expect(f.select(extra).stdout).toBe('')
    expect(f.select(extra).stderr).toContain('FULL')
  })
})
