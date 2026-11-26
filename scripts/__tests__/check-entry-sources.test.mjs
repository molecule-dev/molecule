import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'

import { afterEach, describe, expect, it } from 'vitest'

import { findSourcelessEntries } from '../check-entry-sources.mjs'
import { listFiles } from '../check-published-tests.mjs'

const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/**
 * A scratch tree of packages, each written from its files map.
 *
 * @param packages - `{ dir: { 'package.json': {...}, 'src/…': '…' } }`.
 * @returns The root and every file path, as the check's file listing returns them.
 */
function tree(packages) {
  const root = mkdtempSync(join(tmpdir(), 'check-entry-sources-'))
  roots.push(root)
  const files = []
  for (const [dir, contents] of Object.entries(packages))
    for (const [file, value] of Object.entries(contents)) {
      const path = join(root, dir, file)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`)
      files.push(`${dir}/${file}`)
    }
  return { root, files }
}

const entry = (path) => ({ types: `./dist/${path}.d.ts`, import: `./dist/${path}.js` })

describe('check:entry-sources', () => {
  it('refuses an export whose dist files have no source (the app-ui-react-native 2.0.0 shape)', () => {
    const { root, files } = tree({
      'packages/app/frameworks/react-native-ui': {
        'package.json': {
          name: '@molecule/app-ui-react-native',
          exports: { '.': entry('index'), './elements': entry('elements/index') },
        },
        'src/index.ts': 'export {}\n',
      },
    })
    expect(findSourcelessEntries(root, files)).toEqual([
      {
        dir: 'packages/app/frameworks/react-native-ui',
        entry: 'dist/elements/index.d.ts',
        problem: expect.stringContaining('dist/elements/index.d.ts'),
      },
      {
        dir: 'packages/app/frameworks/react-native-ui',
        entry: 'dist/elements/index.js',
        problem: expect.stringContaining('dist/elements/index.js'),
      },
    ])
  })

  it('accepts every source a build emits a dist file from', () => {
    const { root, files } = tree({
      'packages/app/x/ts': {
        'package.json': { name: '@molecule/a', main: 'dist/index.js', types: 'dist/index.d.ts' },
        'src/index.ts': '',
      },
      'packages/app/x/solid': {
        'package.json': { name: '@molecule/b', exports: { '.': { import: './dist/index.jsx' } } },
        'src/index.tsx': '',
      },
      'packages/app/x/svelte': {
        'package.json': {
          name: '@molecule/c',
          scripts: { build: 'svelte-package --input src --output dist' },
          exports: {
            '.': entry('index'),
            './Field.svelte': { svelte: './dist/Field.svelte', types: './dist/Field.svelte.d.ts' },
            './bag': entry('bag.svelte'),
            './styles.css': './dist/styles.css',
          },
        },
        'src/index.js': '',
        'src/Field.svelte': '',
        'src/bag.svelte.ts': '',
        'src/styles.css': '',
      },
      'packages/app/x/types-only': {
        'package.json': {
          name: '@molecule/d',
          scripts: { build: 'svelte-package --input src --output dist' },
          types: './dist/globals.d.ts',
        },
        'src/globals.d.ts': '',
      },
    })
    expect(findSourcelessEntries(root, files)).toEqual([])
  })

  it('checks the targets of nested export conditions against the kinds of source they can use', () => {
    const { root, files } = tree({
      'packages/app/x/conditions': {
        'package.json': {
          name: '@molecule/conditions',
          scripts: { build: 'tsc' },
          exports: {
            '.': {
              'react-native': { default: './dist/native.js' },
              require: './dist/legacy.cjs',
              import: './dist/modern.mjs',
              types: './dist/modern.d.mts',
            },
            './package.json': './package.json',
            './declaration-only': './dist/ambient.d.ts',
            './wrong-format': './dist/wrong.mjs',
          },
        },
        'src/native.d.ts': '',
        'src/legacy.cts': '',
        'src/modern.mts': '',
        'src/ambient.d.ts': '',
        'src/wrong.cts': '',
      },
      'packages/app/x/svelte-component': {
        'package.json': {
          name: '@molecule/svelte-component',
          scripts: { build: 'svelte-package --input src --output dist' },
          exports: {
            '.': { svelte: './dist/Missing.svelte', types: './dist/Missing.svelte.d.ts' },
          },
        },
        'src/Missing.ts': '',
      },
    })
    expect(findSourcelessEntries(root, files).map(({ entry }) => entry)).toEqual([
      'dist/native.js',
      'dist/ambient.d.ts',
      'dist/wrong.mjs',
      'dist/Missing.svelte',
      'dist/Missing.svelte.d.ts',
    ])
  })

  it('requires the declared inputs of generated or renamed entry points', () => {
    const { root, files } = tree({
      'packages/app/x/renamed': {
        'package.json': {
          name: '@molecule/renamed',
          main: './fesm2022/library.mjs',
          exports: { './theme.css': './dist/theme.css', './notes': './dist/README.md' },
          molecule: {
            entrySources: {
              'fesm2022/library.mjs': ['ng-package.json', 'src/public-api.ts'],
              'dist/theme.css': ['src/styles/main.css'],
              'dist/README.md': ['scripts/notes.mjs', 'docs/intro.md'],
            },
          },
        },
        'ng-package.json': { lib: { entryFile: 'src/public-api.ts' } },
        'src/public-api.ts': '',
        'src/styles/main.css': '',
        'scripts/notes.mjs': '',
        'dist/README.md': 'an old build output',
      },
    })
    expect(findSourcelessEntries(root, files)).toEqual([
      expect.objectContaining({
        entry: 'dist/README.md',
        problem: expect.stringContaining('docs/intro.md'),
      }),
    ])
  })

  it('requires an entry outside dist to be in the tree itself', () => {
    const { root, files } = tree({
      'packages/app/x/styles': {
        'package.json': {
          name: '@molecule/e',
          main: './src/index.js',
          exports: { './styles.css': './src/styles.css', './theme.css': './src/theme.css' },
        },
        'src/index.js': '',
        'src/styles.css': '',
      },
    })
    expect(findSourcelessEntries(root, files)).toEqual([
      {
        dir: 'packages/app/x/styles',
        entry: 'src/theme.css',
        problem: 'names src/theme.css, which is not in the tree',
      },
    ])
  })

  it('ignores fixture manifests the publisher ignores and checks real packages regardless of path', () => {
    const { root, files } = tree({
      'packages/app/x/private': {
        'package.json': { name: '@molecule/f', private: true, main: 'dist/gone.js' },
      },
      'packages/app/x/wild': {
        'package.json': { name: '@molecule/g', exports: { './*': './dist/*.js' } },
      },
      'packages/app/x/host': {
        'package.json': { name: '@molecule/h', main: 'dist/index.js' },
        'src/index.ts': '',
        'src/__fixtures__/app/package.json': { name: 'fixture-app', main: 'dist/app.js' },
        'src/__fixtures__/invalid/package.json': '{ this fixture intentionally does not parse',
        'templates/example/package.json': { name: 'example-app', main: 'dist/app.js' },
        'test/fixtures/app/package.json': { name: 'test-app', main: 'dist/app.js' },
        'test/data/app/package.json': { main: 'dist/app.js' },
        'templates/scoped/package.json': {
          name: '@molecule/template',
          private: true,
          main: 'dist/app.js',
        },
      },
      'packages/api/bonds/fixtures/vendor': {
        'package.json': { name: '@molecule/real-bond', main: 'dist/gone.js' },
      },
    })
    expect(findSourcelessEntries(root, files).map(({ dir }) => dir)).toEqual([
      'packages/api/bonds/fixtures/vendor',
    ])
  })

  it('reads literal filenames in a checkout the same way it would in an export', () => {
    const { root } = tree({
      'packages/app/entries/módulo': {
        'package.json': { name: '@molecule/entry', main: 'dist/résumé.js' },
        'src/résumé.ts': '',
      },
    })
    execFileSync('git', ['init', '-q'], { cwd: root })
    execFileSync('git', ['config', 'core.quotePath', 'true'], { cwd: root })
    const files = listFiles(realpathSync(root))
    expect(files).toContain('packages/app/entries/módulo/package.json')
    expect(findSourcelessEntries(root, files)).toEqual([])
  })

  it('runs on staged new packages and sources without walking generated directories', () => {
    const staged = 'packages/app/x/staged'
    const { root } = tree({
      [staged]: {
        'package.json': { name: '@molecule/staged', main: 'dist/index.js' },
        'src/index.ts': '',
        'dist/index.js': '',
        'dist/nested/package.json': { name: '@molecule/dist-copy', main: 'dist/gone.js' },
        'node_modules/a/package.json': { name: '@molecule/installed-copy', main: 'dist/gone.js' },
      },
      'packages/app/x/unstaged': {
        'package.json': { name: '@molecule/unstaged', main: 'dist/gone.js' },
      },
    })
    for (const file of [
      'check-entry-sources.mjs',
      'check-published-tests.mjs',
      'lib/aggregate-root.mjs',
      'lib/assert-pack-complete.mjs',
      'lib/is-main.mjs',
      'run-on-index.mjs',
    ]) {
      const dest = join(root, 'scripts', file)
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(join(import.meta.dirname, '..', file), dest)
    }
    const git = (...args) => execFileSync('git', args, { cwd: root })
    git('init', '-q')
    git('add', 'scripts', `${staged}/package.json`)
    git('add', '-f', `${staged}/dist`, `${staged}/node_modules`)
    const check = () =>
      spawnSync(process.execPath, ['scripts/run-on-index.mjs', 'scripts/check-entry-sources.mjs'], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, MOL_RUN_ON_INDEX: 'tree', MOL_PRECOMMIT_BASE: '' },
      })
    const refused = check()
    expect(refused.status).toBe(1)
    expect(refused.stdout.split('\n').filter((line) => line.startsWith('✗'))).toEqual([
      expect.stringContaining(`${staged}: names dist/index.js`),
    ])
    git('add', `${staged}/src/index.ts`)
    const accepted = check()
    expect(accepted.stderr).toBe('')
    expect(accepted.status).toBe(0)
  })
})
