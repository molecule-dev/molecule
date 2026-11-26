import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { findSourcelessEntries } from '../check-entry-sources.mjs'

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
        problem: expect.stringContaining('no src/elements/index.{ts,tsx,svelte,js,…} builds it'),
      },
      {
        dir: 'packages/app/frameworks/react-native-ui',
        entry: 'dist/elements/index.js',
        problem: expect.stringContaining('no src/elements/index.'),
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
          exports: {
            '.': entry('index'),
            './Field.svelte': { svelte: './dist/Field.svelte' },
            './bag': entry('bag'),
          },
        },
        'src/index.js': '',
        'src/Field.svelte': '',
        'src/bag.svelte.ts': '',
      },
      'packages/app/x/types-only': {
        'package.json': { name: '@molecule/d', types: './dist/globals.d.ts' },
        'src/globals.d.ts': '',
      },
    })
    expect(findSourcelessEntries(root, files)).toEqual([])
  })

  it('requires an entry outside dist to be in the tree itself', () => {
    const { root, files } = tree({
      'packages/app/x/styles': {
        'package.json': {
          name: '@molecule/e',
          exports: { './styles.css': './src/styles.css', './theme.css': './src/theme.css' },
        },
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

  it('leaves private packages, wildcard exports and nested fixture manifests alone', () => {
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
        'src/__tests__/fixtures/app/package.json': { name: 'fixture-app', main: 'dist/app.js' },
      },
    })
    expect(findSourcelessEntries(root, files)).toEqual([])
  })
})
