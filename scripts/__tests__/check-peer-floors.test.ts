/**
 * The peer-floor gate: every name a package imports from a `@molecule/*` peer must
 * exist in the lowest version that peer's range allows, or a user whose install
 * resolves that older version gets a missing export (npm workspaces link the
 * newest local source and hide the gap).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, describe, expect, it, vi } from 'vitest'

// The cache location is read when the module loads, so it is set before the import.
const cache = vi.hoisted(() => {
  const dir = `${process.env.TMPDIR ?? '/tmp'}/peer-floors-cache-${process.pid}-${Date.now()}`
  process.env.MOL_PEER_FLOORS_CACHE = dir
  return dir
})

import {
  declaredExports,
  findFloorGaps,
  namedImports,
  publishedExports,
  scanFleet,
  scriptText,
} from '../check-peer-floors.mjs'

afterAll(() => {
  rmSync(cache, { recursive: true, force: true })
  delete process.env.MOL_PEER_FLOORS_CACHE
})

/** Write files under a fresh temporary root. */
const tree = (files: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), 'peer-floors-'))
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), text)
  }
  return root
}

/** Imported names in the shape findFloorGaps takes. */
const importsOf = (peer: string, names: string[]) =>
  new Map([[peer, new Map(names.map((name) => [name, new Set(['src/a.ts'])]))]])

describe('scriptText', () => {
  it('passes TypeScript through', () => {
    expect(scriptText("import { a } from 'x'", 'a.ts')).toBe("import { a } from 'x'")
  })

  it('joins every <script> block of a Svelte or Vue component', () => {
    const sfc = [
      '<script context="module" lang="ts">',
      "import { a } from 'x'",
      '</script>',
      '<script lang="ts">',
      "import { b } from 'y'",
      '</script>',
      '<div>{a} {b}</div>',
    ].join('\n')
    for (const file of ['C.svelte', 'C.vue']) {
      const text = scriptText(sfc, file)
      expect(text).toContain("import { a } from 'x'")
      expect(text).toContain("import { b } from 'y'")
      expect(text).not.toContain('<div>')
    }
  })
})

describe('namedImports', () => {
  it('collects named, aliased, default and type-only imports and named re-exports', () => {
    const src = [
      "import def, { a, b as c } from '@molecule/x'",
      "import type { T } from '@molecule/x'",
      "import { type U } from '@molecule/y'",
      "export { d, e as f } from '@molecule/z'",
      "export type { V } from '@molecule/z'",
    ].join('\n')
    const found = namedImports(src, 'a.ts')
    expect([...found.get('@molecule/x')!].sort()).toEqual(['T', 'a', 'b', 'default'])
    expect([...found.get('@molecule/y')!]).toEqual(['U'])
    expect([...found.get('@molecule/z')!].sort()).toEqual(['V', 'd', 'e'])
  })

  it('skips imports that name nothing', () => {
    const src = [
      "import * as ns from '@molecule/ns'",
      "import '@molecule/side-effect'",
      "export * from '@molecule/star'",
      "const lazy = await import('@molecule/dynamic')",
    ].join('\n')
    expect([...namedImports(src, 'a.ts').keys()]).toEqual([])
  })

  it('parses TSX', () => {
    const src = "import { Button } from '@molecule/ui'\nexport const A = () => <Button />"
    expect([...namedImports(src, 'a.tsx').get('@molecule/ui')!]).toEqual(['Button'])
  })
})

describe('findFloorGaps', () => {
  const versions = new Map([['@molecule/core', '1.4.0']])
  const exportsAt = (name: string, version: string) =>
    name === '@molecule/core' && version === '1.0.0' ? new Set(['old']) : null

  it('names each import the floor lacks, with the range that fixes it', () => {
    const pkg = { peerDependencies: { '@molecule/core': '^1.0.0' } }
    expect(
      findFloorGaps(pkg, importsOf('@molecule/core', ['old', 'added']), versions, exportsAt),
    ).toEqual([
      {
        peer: '@molecule/core',
        range: '^1.0.0',
        floor: '1.0.0',
        fix: '^1.4.0',
        missing: [{ name: 'added', files: ['src/a.ts'] }],
      },
    ])
  })

  it('passes when the floor exports every imported name', () => {
    const pkg = { peerDependencies: { '@molecule/core': '^1.0.0' } }
    expect(findFloorGaps(pkg, importsOf('@molecule/core', ['old']), versions, exportsAt)).toEqual(
      [],
    )
  })

  it('skips a floor at or above the workspace version, and a floor npm never published', () => {
    const imports = importsOf('@molecule/core', ['added'])
    const read = vi.fn(exportsAt)
    expect(
      findFloorGaps({ peerDependencies: { '@molecule/core': '^1.4.0' } }, imports, versions, read),
    ).toEqual([])
    expect(read).not.toHaveBeenCalled()
    expect(
      findFloorGaps({ peerDependencies: { '@molecule/core': '^1.1.0' } }, imports, versions, read),
    ).toEqual([])
    expect(read).toHaveBeenCalledWith('@molecule/core', '1.1.0')
  })

  it('ignores peers outside @molecule and peers the package imports nothing from', () => {
    const pkg = { peerDependencies: { react: '^18.0.0', '@molecule/core': '^1.0.0' } }
    const read = vi.fn(exportsAt)
    expect(findFloorGaps(pkg, new Map(), versions, read)).toEqual([])
    expect(read).not.toHaveBeenCalled()
  })
})

describe('declaredExports', () => {
  it('follows export * chains and reads every exported value and type', () => {
    const root = tree({
      'index.d.ts': [
        "export * from './a.js'",
        'export declare function f(): void',
        'export type T = string',
        'declare const x: number',
        'export { x as y }',
      ].join('\n'),
      'a.d.ts': "export * from './b.js'\nexport interface A { a: string }",
      'b.d.ts': 'export declare const b: Promise<number>',
    })
    try {
      expect([...declaredExports(join(root, 'index.d.ts'))].sort()).toEqual([
        'A',
        'T',
        'b',
        'f',
        'y',
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('publishedExports', () => {
  it('reads the cached tarball through its manifest types entry and stores the list', () => {
    const pkgDir = join(cache, '@molecule+cached@1.0.0', 'package')
    mkdirSync(join(pkgDir, 'dist'), { recursive: true })
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({ exports: { '.': { types: './dist/index.d.ts' } } }),
    )
    writeFileSync(join(pkgDir, 'dist', 'index.d.ts'), 'export declare const one: 1')
    expect([...publishedExports('@molecule/cached', '1.0.0')!]).toEqual(['one'])
  })

  it('returns null for a version npm never published', () => {
    mkdirSync(join(cache, '@molecule+cached@0.9.0'), { recursive: true })
    writeFileSync(join(cache, '@molecule+cached@0.9.0', 'unpublished'), '')
    expect(publishedExports('@molecule/cached', '0.9.0')).toBeNull()
  })

  it('refuses a version that was never fetched', () => {
    expect(() => publishedExports('@molecule/cached', '0.1.0')).toThrow(/prefetchTarballs/)
  })
})

describe('scanFleet', () => {
  it('reports shipped imports a floor lacks, after prefetching every floor it reads', async () => {
    const root = tree({
      'packages/app/core/routing/package.json': JSON.stringify({
        name: '@molecule/app-routing',
        version: '1.2.0',
      }),
      'packages/app/core/routing/src/index.ts': 'export const getRouter = () => null',
      'packages/app/bonds/routing/x/package.json': JSON.stringify({
        name: '@molecule/app-routing-x',
        version: '1.0.0',
        peerDependencies: { '@molecule/app-routing': '^1.0.1', react: '^19.0.0' },
      }),
      'packages/app/bonds/routing/x/src/router.ts':
        "import { createHistoryRouter, getRouter } from '@molecule/app-routing'",
      'packages/app/bonds/routing/x/src/Link.svelte':
        '<script lang="ts">\nimport { resolveListRoute } from \'@molecule/app-routing\'\n</script>',
      // Tests, subpath imports and private packages are not what a user installs.
      'packages/app/bonds/routing/x/src/__tests__/router.test.ts':
        "import { testOnly } from '@molecule/app-routing'",
      'packages/app/bonds/routing/x/src/sub.ts':
        "import { subpathOnly } from '@molecule/app-routing/types.js'",
      'packages/app/private/package.json': JSON.stringify({
        name: '@molecule/private',
        version: '1.0.0',
        private: true,
        peerDependencies: { '@molecule/app-routing': '^1.0.1' },
      }),
      'packages/app/private/src/index.ts': "import { privateOnly } from '@molecule/app-routing'",
    })
    try {
      const prefetch = vi.fn(async () => undefined)
      const rows = await scanFleet(root, {
        prefetch,
        exportsAt: (name: string, version: string) =>
          name === '@molecule/app-routing' && version === '1.0.1' ? new Set(['getRouter']) : null,
      })
      expect(prefetch).toHaveBeenCalledWith(['@molecule/app-routing@1.0.1'])
      expect(rows).toEqual([
        {
          package: '@molecule/app-routing-x',
          dir: 'packages/app/bonds/routing/x',
          gaps: [
            {
              peer: '@molecule/app-routing',
              range: '^1.0.1',
              floor: '1.0.1',
              fix: '^1.2.0',
              missing: [
                {
                  name: 'createHistoryRouter',
                  files: ['packages/app/bonds/routing/x/src/router.ts'],
                },
                {
                  name: 'resolveListRoute',
                  files: ['packages/app/bonds/routing/x/src/Link.svelte'],
                },
              ],
            },
          ],
        },
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
