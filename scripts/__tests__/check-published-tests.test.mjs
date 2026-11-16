import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { findPublishedTests, withTestExclude } from '../check-published-tests.mjs'

const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/**
 * A scratch tree of packages, each written from its files map.
 *
 * @param packages - `{ dir: { 'package.json': {...}, 'tsconfig.json': '…', 'src/…': '…' } }`.
 * @returns The root and every file path, as `git ls-files` would list them.
 */
function tree(packages) {
  const root = mkdtempSync(join(tmpdir(), 'check-published-tests-'))
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

const tsc = (extra = {}) => ({
  'package.json': { name: '@molecule/x', scripts: { build: 'tsc' }, files: ['dist'], ...extra },
  'src/index.ts': 'export const x = 1\n',
  'src/__tests__/index.test.ts': 'export {}\n',
})

describe('check:published-tests', () => {
  it('refuses a tsc package whose tsconfig does not exclude its tests (the api-locales-ai shape)', () => {
    const { root, files } = tree({
      'packages/api/locales/ai': {
        ...tsc(),
        'tsconfig.json': '{\n  "include": [\n    "src"\n  ]\n}\n',
      },
    })
    expect(findPublishedTests(root, files)).toEqual([
      expect.objectContaining({
        dir: 'packages/api/locales/ai',
        problem: expect.stringContaining('src/**/__tests__/**'),
      }),
    ])
  })

  it('accepts the exclude, nested tests included, and reads the tsconfig a -p build names', () => {
    const { root, files } = tree({
      'packages/app/frameworks/vue': {
        ...tsc(),
        'src/composables/__tests__/useA.test.ts': 'export {}\n',
        'tsconfig.json':
          '{ "include": ["src"], "exclude": ["node_modules", "dist", "src/**/__tests__/**"] }\n',
      },
      'packages/app/bonds/b': {
        ...tsc({ scripts: { build: 'tsc -p tsconfig.build.json' } }),
        'tsconfig.json': '{ "include": ["src"] }\n',
        'tsconfig.build.json':
          '{\n  // comments are allowed\n  "include": ["src"],\n  "exclude": ["**/__tests__/**",],\n}\n',
      },
    })
    expect(findPublishedTests(root, files)).toEqual([])
  })

  it('holds a svelte-package build to its files negation, and ignores private packages', () => {
    const { root, files } = tree({
      'packages/app/features/a-svelte': {
        ...tsc({ scripts: { build: 'svelte-check && svelte-package -o dist' } }),
        'tsconfig.json': '{ "exclude": ["src/**/__tests__/**"] }\n',
      },
      'packages/app/features/b-svelte': {
        ...tsc({
          scripts: { build: 'svelte-package -o dist' },
          files: ['dist', '!dist/**/__tests__'],
        }),
      },
      'packages/app/private': { ...tsc({ private: true }), 'tsconfig.json': '{}\n' },
    })
    expect(findPublishedTests(root, files).map((finding) => finding.dir)).toEqual([
      'packages/app/features/a-svelte',
    ])
  })

  it('refuses an unknown build tool and a test file outside __tests__', () => {
    const { root, files } = tree({
      'packages/app/c': {
        ...tsc({ scripts: { build: 'vite build' } }),
        'src/loose.test.ts': 'export {}\n',
      },
    })
    const findings = findPublishedTests(root, files)
    expect(findings.map((finding) => finding.dir ?? finding.file)).toEqual([
      'packages/app/c/src/loose.test.ts',
      'packages/app/c',
    ])
    expect(findings[1].problem).toContain('unknown build (vite build)')
  })

  it('--fix adds the exclude in the file’s own formatting', () => {
    expect(withTestExclude('{\n  "include": [\n    "src"\n  ]\n}\n')).toBe(
      '{\n  "include": [\n    "src"\n  ],\n  "exclude": ["node_modules", "dist", "src/**/__tests__/**"]\n}\n',
    )
    expect(
      withTestExclude('{\n  "include": ["src/**/*"],\n  "exclude": ["node_modules", "dist"]\n}\n'),
    ).toBe(
      '{\n  "include": ["src/**/*"],\n  "exclude": ["node_modules", "dist", "src/**/__tests__/**"]\n}\n',
    )
    expect(withTestExclude('{\n  "exclude": [\n    "node_modules",\n    "dist"\n  ]\n}\n')).toBe(
      '{\n  "exclude": [\n    "node_modules",\n    "dist",\n    "src/**/__tests__/**"\n  ]\n}\n',
    )
  })
})
