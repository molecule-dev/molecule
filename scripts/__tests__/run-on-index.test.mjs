import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

const SCRIPTS = join(import.meta.dirname, '..')
const RUNNER = join(SCRIPTS, 'run-on-index.mjs')
const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const write = (root, file, value) => {
  const path = join(root, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`)
}
const git = (root, args, env = process.env) =>
  execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', env }).trim()
const run = (root, commands, env = process.env) =>
  spawnSync(process.execPath, [RUNNER, ...commands], { cwd: root, encoding: 'utf8', env })

/** Prints every file the export holds under packages/, one per line. */
const LIST = `import { readdirSync } from 'node:fs'
console.log(readdirSync('packages', { recursive: true }).sort().join('\\n'))
`

/**
 * A committed one-package npm workspace with an in-sync lock file, no external
 * dependencies (so \`npm ci --dry-run\` needs no network), molecule's real
 * lock-file check, and a \`prepare\` script whose tool is not installed.
 *
 * @returns The repo root.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'run-on-index-'))
  roots.push(root)
  write(root, 'package.json', {
    name: 'fixture',
    private: true,
    workspaces: ['packages/*'],
    scripts: { prepare: 'husky' },
  })
  write(root, '.npmrc', 'legacy-peer-deps=true\n')
  write(root, 'packages/a/package.json', { name: 'a', version: '1.0.0' })
  write(root, 'package-lock.json', {
    name: 'fixture',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: 'fixture', workspaces: ['packages/*'] },
      'node_modules/a': { resolved: 'packages/a', link: true },
      'packages/a': { name: 'a', version: '1.0.0' },
    },
  })
  mkdirSync(join(root, 'scripts/lib'), { recursive: true })
  copyFileSync(join(SCRIPTS, 'lib/is-main.mjs'), join(root, 'scripts/lib/is-main.mjs'))
  copyFileSync(join(SCRIPTS, 'check-lockfile.js'), join(root, 'scripts/check-lockfile.js'))
  copyFileSync(
    join(SCRIPTS, 'lib/lockfile-ranges.mjs'),
    join(root, 'scripts/lib/lockfile-ranges.mjs'),
  )
  write(root, 'scripts/list.mjs', LIST)
  write(root, 'scripts/fail.mjs', 'process.exit(3)\n')
  write(root, '.gitignore', 'node_modules\n')
  git(root, ['init', '-q'])
  git(root, ['add', '.'])
  git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init'])
  // The check's one dependency, resolved through the export's node_modules link.
  mkdirSync(join(root, 'node_modules'))
  symlinkSync(join(SCRIPTS, '../node_modules/semver'), join(root, 'node_modules/semver'), 'dir')
  return root
}

describe('run-on-index', () => {
  it('links the aggregate install when a sibling checkout has no local install', () => {
    const root = fixture()
    const parent = mkdtempSync(join(tmpdir(), 'run-on-index-sibling-'))
    roots.push(parent)
    const aggregate = join(parent, 'aggregate')
    const checkout = join(parent, 'molecule')
    mkdirSync(aggregate)
    write(aggregate, 'package.json', { name: 'molecule-workspace' })
    symlinkSync('../molecule', join(aggregate, 'molecule'))
    renameSync(root, checkout)
    renameSync(join(checkout, 'node_modules'), join(aggregate, 'node_modules'))

    const result = run(checkout, ['scripts/check-lockfile.js'])
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('Lock file OK')
  })

  it('runs a script on the tree the index carries, without untracked or unstaged files', () => {
    const root = fixture()
    write(root, 'packages/b/package.json', { name: 'b', version: '1.0.0' })
    write(root, 'packages/a/extra.txt', 'unstaged\n')
    write(root, 'packages/c/package.json', { name: 'c', version: '1.0.0' })
    git(root, ['add', 'packages/c/package.json'])

    const result = run(root, ['scripts/list.mjs'])
    expect(result.status).toBe(0)
    expect(result.stdout.trim().split('\n')).toEqual(['a', 'a/package.json', 'c', 'c/package.json'])
  })

  it('passes the lock file check where an untracked package refuses the worktree form', () => {
    const root = fixture()
    write(root, 'packages/b/package.json', { name: 'b', version: '1.0.0' })

    const worktree = spawnSync(process.execPath, ['scripts/check-lockfile.js'], {
      cwd: root,
      encoding: 'utf8',
    })
    expect(worktree.status).toBe(1)
    expect(worktree.stderr).toContain('Missing: b@1.0.0 from lock file')

    const result = run(root, ['scripts/check-lockfile.js'])
    expect(result.stdout).toContain('Lock file OK')
    expect(result.status).toBe(0)
  })

  it('ignores a dependency added to a tracked manifest but not staged', () => {
    const root = fixture()
    write(root, 'packages/a/package.json', {
      name: 'a',
      version: '1.0.0',
      dependencies: { 'left-pad': '1.3.0' },
    })

    expect(run(root, ['scripts/check-lockfile.js']).status).toBe(0)
  })

  it('refuses a staged package the lock file lacks', () => {
    const root = fixture()
    write(root, 'packages/b/package.json', { name: 'b', version: '1.0.0' })
    git(root, ['add', 'packages/b/package.json'])

    const result = run(root, ['scripts/check-lockfile.js'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Missing: b@1.0.0 from lock file')
  })

  it('refuses a staged version bump the lock file does not record', () => {
    const root = fixture()
    write(root, 'packages/a/package.json', { name: 'a', version: '1.0.1' })
    git(root, ['add', 'packages/a/package.json'])

    const result = run(root, ['scripts/check-lockfile.js'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('a is 1.0.1 but the lock file has 1.0.0')
  })

  it('reads the private index GIT_INDEX_FILE names', () => {
    const root = fixture()
    write(root, 'packages/b/package.json', { name: 'b', version: '1.0.0' })
    const env = { ...process.env, GIT_INDEX_FILE: join(root, '.git', 'private-index') }
    git(root, ['read-tree', 'HEAD'], env)
    git(root, ['add', 'packages/b/package.json'], env)

    expect(run(root, ['scripts/check-lockfile.js']).status).toBe(0)
    const result = run(root, ['scripts/check-lockfile.js'], env)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Missing: b@1.0.0 from lock file')
  })

  it('runs every command, exits with the first failure and passes arguments', () => {
    const root = fixture()
    write(root, 'scripts/args.mjs', 'console.log(process.argv.slice(2).join(","))\n')
    git(root, ['add', 'scripts/args.mjs'])

    const result = run(root, ['scripts/fail.mjs', 'scripts/args.mjs --check -x'])
    expect(result.status).toBe(3)
    expect(result.stdout).toContain('--check,-x')
  })

  it('refuses a script the commit does not carry', () => {
    const root = fixture()
    write(root, 'scripts/untracked.mjs', 'console.log("ran")\n')

    const result = run(root, ['scripts/untracked.mjs'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('the commit does not carry scripts/untracked.mjs')
    expect(result.stdout).not.toContain('ran')
  })

  describe('the undeclared-imports check the pre-commit hook runs', () => {
    /**
     * The fixture plus molecule's real import check and the TypeScript parser it loads.
     *
     * @returns The repo root.
     */
    function importFixture() {
      const root = fixture()
      copyFileSync(
        join(SCRIPTS, 'check-undeclared-imports.mjs'),
        join(root, 'scripts/check-undeclared-imports.mjs'),
      )
      copyFileSync(
        join(SCRIPTS, 'lib/module-imports.mjs'),
        join(root, 'scripts/lib/module-imports.mjs'),
      )
      git(root, ['add', 'scripts'])
      git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'import check'])
      // The check's parser, resolved through the export's node_modules link like semver.
      symlinkSync(
        join(SCRIPTS, '../node_modules/typescript'),
        join(root, 'node_modules/typescript'),
        'dir',
      )
      return root
    }
    const ROUTER = "import { Router } from 'express'\n\nexport const router = Router()\n"

    it('refuses a staged package whose shipped source imports a runtime dependency it does not declare', () => {
      const root = importFixture()
      write(root, 'packages/b/package.json', { name: 'b', version: '1.0.0' })
      write(root, 'packages/b/src/router.ts', ROUTER)
      git(root, ['add', 'packages/b'])

      const result = run(root, ['scripts/check-undeclared-imports.mjs'])
      expect(result.stderr).toContain('b imports express without declaring it — src/router.ts')
      expect(result.status).toBe(1)
    })

    it('does not judge an untracked package in the worktree', () => {
      const root = importFixture()
      write(root, 'packages/b/package.json', { name: 'b', version: '1.0.0' })
      write(root, 'packages/b/src/router.ts', ROUTER)

      const result = run(root, ['scripts/check-undeclared-imports.mjs'])
      expect(result.stdout).toContain('every package declares what its source imports')
      expect(result.status).toBe(0)
    })

    it('accepts the import once the package declares express as a peer', () => {
      const root = importFixture()
      write(root, 'packages/b/package.json', {
        name: 'b',
        version: '1.0.0',
        peerDependencies: { express: '^5.0.0' },
      })
      write(root, 'packages/b/src/router.ts', ROUTER)
      git(root, ['add', 'packages/b'])

      const result = run(root, ['scripts/check-undeclared-imports.mjs'])
      expect(result.stdout).toContain('every package declares what its source imports')
      expect(result.status).toBe(0)
    })
  })

  it('tells each command the repository the export came from', () => {
    const root = fixture()
    write(root, 'scripts/repo.mjs', 'console.log(process.env.MOL_INDEX_REPO)\n')
    git(root, ['add', 'scripts/repo.mjs'])

    const result = run(root, ['scripts/repo.mjs'])
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe(git(root, ['rev-parse', '--show-toplevel']))
  })
})
