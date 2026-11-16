/**
 * `trust:new` builds a brand-new package and its dependencies from an export of HEAD, never from
 * the shared checkout (`lib/committed-export.mjs`). On 2026-11-14 another session's uncommitted
 * edit to `@molecule/app-angular` (an import it had removed) failed the owner's run, because the
 * build read the working tree. Real temporary git repos and the real `scripts/build.js`, run
 * exactly as the script runs it (`node scripts/build.js --only=<pkg>`).
 */
import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire as createRequireFrom } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { createCommittedExport, missingInstalls } from '../lib/committed-export.mjs'

const BUILD_JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'build.js')

/**
 * A package build that refuses a source holding the marker a broken edit writes, and records
 * where each `@molecule` dependency resolved, so the test can see which copy the build read.
 */
const PACKAGE_BUILD = `import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
const source = readFileSync('src/index.js', 'utf8')
if (source.includes('BROKEN')) { console.error('src/index.js: BROKEN'); process.exit(2) }
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
const require = createRequire(process.cwd() + '/')
const resolved = Object.keys(manifest.dependencies ?? {}).map(
  (name) => name + '=' + realpathSync(require.resolve(name + '/src/index.js')),
)
mkdirSync('dist', { recursive: true })
writeFileSync('dist/index.js', source)
writeFileSync('dist/resolved.txt', resolved.join('\\n'))
`

const dirs: string[] = []
const exports: { dispose: () => void }[] = []

afterEach(() => {
  for (const tree of exports.splice(0)) tree.dispose()
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()

/** Write one package directory: manifest, source and its build. */
function writePackage(
  root: string,
  dir: string,
  name: string,
  source: string,
  dependencies: Record<string, string> = {},
): void {
  mkdirSync(join(root, dir, 'src'), { recursive: true })
  writeFileSync(
    join(root, dir, 'package.json'),
    `${JSON.stringify({ name, version: '1.0.0', type: 'module', scripts: { build: 'node build.mjs' }, dependencies }, null, 2)}\n`,
  )
  writeFileSync(join(root, dir, 'src', 'index.js'), source)
  writeFileSync(join(root, dir, 'build.mjs'), PACKAGE_BUILD)
}

/**
 * A checkout shaped like this repo: a workspace root whose node_modules links each workspace
 * `@molecule` package, a registry-installed `@molecule` copy, a third-party install and a
 * package-local install, with two committed packages (`b` depends on `a`).
 */
function checkout(): string {
  const root = mkdtempSync(join(tmpdir(), 'committed-export-'))
  dirs.push(root)
  git(root, 'init', '-q', '-b', 'main')
  git(root, 'config', 'user.email', 'test@example.com')
  git(root, 'config', 'user.name', 'test')
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify({ name: 'fixture', private: true, type: 'module', workspaces: ['packages/*/*'] }, null, 2)}\n`,
  )
  writeFileSync(join(root, '.gitignore'), 'node_modules\ndist\n')
  mkdirSync(join(root, 'scripts'))
  copyFileSync(BUILD_JS, join(root, 'scripts', 'build.js'))
  writePackage(root, 'packages/core/a', '@molecule/a', 'export const a = 1\n')
  writePackage(root, 'packages/bonds/b', '@molecule/b', 'export const b = 2\n', {
    '@molecule/a': '1.0.0',
  })
  git(root, 'add', '.')
  git(root, 'commit', '-q', '-m', 'packages')

  const scope = join(root, 'node_modules', '@molecule')
  mkdirSync(scope, { recursive: true })
  symlinkSync('../../packages/core/a', join(scope, 'a'))
  symlinkSync('../../packages/bonds/b', join(scope, 'b'))
  mkdirSync(join(scope, 'registry-copy'))
  writeFileSync(
    join(scope, 'registry-copy', 'package.json'),
    '{"name":"@molecule/registry-copy"}\n',
  )
  mkdirSync(join(root, 'node_modules', 'left-pad'))
  writeFileSync(join(root, 'node_modules', 'left-pad', 'index.js'), 'export default 1\n')
  mkdirSync(join(root, 'packages', 'bonds', 'b', 'node_modules', 'local-only'), {
    recursive: true,
  })
  return root
}

/** Run the build exactly as trust:new does. */
const build = (cwd: string, name: string) =>
  spawnSync(process.execPath, ['scripts/build.js', `--only=${name}`], { cwd, encoding: 'utf8' })

describe('createCommittedExport', () => {
  it('builds the committed packages while the checkout holds a broken uncommitted edit', () => {
    const root = checkout()
    // Another session's half-done edit to the dependency, and a package it has not committed.
    writeFileSync(join(root, 'packages/core/a/src/index.js'), 'BROKEN\n')
    writePackage(root, 'packages/core/new', '@molecule/new', 'export const n = 3\n')
    symlinkSync('../../packages/core/new', join(root, 'node_modules', '@molecule', 'new'))

    // The defect: the working-tree build compiles the broken edit and fails.
    const live = build(root, '@molecule/b')
    expect(live.status).not.toBe(0)
    expect(`${live.stdout}${live.stderr}`).toContain('src/index.js: BROKEN')

    const tree = createCommittedExport({ root })
    exports.push(tree)
    expect(tree.sha).toBe(git(root, 'rev-parse', 'HEAD'))
    const exported = build(tree.dir, '@molecule/b')
    expect(`${exported.stdout}${exported.stderr}`).not.toContain('BROKEN')
    expect(exported.status).toBe(0)
    // The dependency was compiled from the export's committed source, not the checkout's copy.
    expect(readFileSync(join(tree.dir, 'packages/core/a/dist/index.js'), 'utf8')).toBe(
      'export const a = 1\n',
    )
    expect(readFileSync(join(tree.dir, 'packages/bonds/b/dist/resolved.txt'), 'utf8')).toBe(
      `@molecule/a=${realpathSync(join(tree.dir, 'packages/core/a/src/index.js'))}`,
    )
    // Nothing was written into the checkout.
    expect(existsSync(join(root, 'packages/core/a/dist'))).toBe(false)
    // The uncommitted package is not in the export, and nothing in it resolves there.
    expect(existsSync(join(tree.dir, 'packages/core/new'))).toBe(false)
    expect(existsSync(join(tree.dir, 'node_modules/@molecule/new'))).toBe(false)
    // Two real build.js runs: past vitest's 5 s default on a loaded machine (2026-11-16).
  }, 60_000)

  it('resolves installs that are not workspace links to the checkout', () => {
    const root = checkout()
    const tree = createCommittedExport({ root })
    exports.push(tree)
    expect(realpathSync(join(tree.dir, 'node_modules/left-pad'))).toBe(
      realpathSync(join(root, 'node_modules/left-pad')),
    )
    expect(realpathSync(join(tree.dir, 'node_modules/@molecule/registry-copy'))).toBe(
      realpathSync(join(root, 'node_modules/@molecule/registry-copy')),
    )
    expect(realpathSync(join(tree.dir, 'packages/bonds/b/node_modules'))).toBe(
      realpathSync(join(root, 'packages/bonds/b/node_modules')),
    )
  })

  it('removes only the export when disposed', () => {
    const root = checkout()
    const tree = createCommittedExport({ root })
    tree.dispose()
    expect(existsSync(tree.dir)).toBe(false)
    expect(existsSync(join(root, 'node_modules/left-pad/index.js'))).toBe(true)
    expect(existsSync(join(root, 'node_modules/@molecule/registry-copy/package.json'))).toBe(true)
    expect(existsSync(join(root, 'packages/bonds/b/node_modules/local-only'))).toBe(true)
    expect(lstatSync(join(root, 'node_modules/@molecule/a')).isSymbolicLink()).toBe(true)
  })
})

/** Write `manifest` as the package.json of `dir` under `root`. */
const writeManifest = (root: string, dir: string, manifest: Record<string, unknown>) => {
  mkdirSync(join(root, dir), { recursive: true })
  writeFileSync(join(root, dir, 'package.json'), JSON.stringify(manifest))
}

/** An empty install of `name` under `modules`. */
const install = (modules: string, name: string) => {
  mkdirSync(join(modules, name), { recursive: true })
  writeFileSync(join(modules, name, 'package.json'), JSON.stringify({ name }))
}

describe('missingInstalls', () => {
  it('names a dependency installed only above the checkout, which the export cannot see', () => {
    // A workspace whose root install holds a dependency the checkout's own install lacks:
    // the checkout's build finds it by walking up, the export (under the temp dir) does not.
    const workspace = mkdtempSync(join(tmpdir(), 'committed-export-ws-'))
    dirs.push(workspace)
    const root = join(workspace, 'molecule')
    mkdirSync(root)
    git(root, 'init', '-q', '-b', 'main')
    git(root, 'config', 'user.email', 'test@example.com')
    git(root, 'config', 'user.name', 'test')
    writeManifest(root, 'packages/core/base', {
      name: '@molecule/base',
      version: '1.0.0',
      dependencies: { 'only-above': '1.0.0', 'here-too': '1.0.0' },
    })
    writeManifest(root, 'packages/bonds/user', {
      name: '@molecule/user',
      version: '1.0.0',
      devDependencies: { '@molecule/base': '1.0.0' },
    })
    writeManifest(root, 'packages/bonds/apart', { name: '@molecule/apart', version: '1.0.0' })
    git(root, 'add', 'packages')
    git(root, 'commit', '-q', '-m', 'packages')
    install(join(workspace, 'node_modules'), 'only-above')
    install(join(root, 'node_modules'), 'here-too')
    // The checkout's own build finds it.
    const fromBase = createRequireFrom(join(root, 'packages/core/base/package.json'))
    expect(realpathSync(fromBase.resolve('only-above/package.json'))).toBe(
      realpathSync(join(workspace, 'node_modules/only-above/package.json')),
    )

    const tree = createCommittedExport({ root })
    exports.push(tree)
    expect(
      missingInstalls(tree.dir, [
        'packages/core/base',
        'packages/bonds/user',
        'packages/bonds/apart',
      ]),
    ).toEqual(
      new Map([
        ['packages/core/base', ['only-above']],
        // Through its workspace dependency, which its build builds first.
        ['packages/bonds/user', ['only-above']],
      ]),
    )
  })

  it('finds package-local installs, skips optional peers and ends on a dependency cycle', () => {
    const root = mkdtempSync(join(tmpdir(), 'committed-export-deps-'))
    dirs.push(root)
    writeManifest(root, 'packages/a', {
      name: '@molecule/a',
      dependencies: { '@molecule/b': '1.0.0', 'local-dep': '1.0.0' },
      peerDependencies: { 'needed-peer': '*', 'optional-peer': '*' },
      peerDependenciesMeta: { 'optional-peer': { optional: true } },
    })
    writeManifest(root, 'packages/b', {
      name: '@molecule/b',
      dependencies: { '@molecule/a': '1.0.0', 'root-dep': '1.0.0' },
    })
    install(join(root, 'packages/a/node_modules'), 'local-dep')
    install(join(root, 'node_modules'), 'root-dep')
    expect(missingInstalls(root, ['packages/a', 'packages/b'])).toEqual(
      new Map([
        ['packages/a', ['needed-peer']],
        ['packages/b', ['needed-peer']],
      ]),
    )
    install(join(root, 'node_modules'), 'needed-peer')
    expect(missingInstalls(root, ['packages/a', 'packages/b'])).toEqual(new Map())
  })
})
