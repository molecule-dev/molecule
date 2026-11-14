/**
 * The peer-floor gate: every name a package imports from a `@molecule/*` peer must
 * exist in the lowest published version that peer's range allows, or a user whose
 * install resolves that older version gets a missing export (npm workspaces link the
 * newest local source and hide the gap).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
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
  fetchPublishedVersions,
  findFloorGaps,
  namedImports,
  prefetchTarballs,
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
  /** Exports per published version; reading any other version is a bug in the check. */
  const exportsOf =
    (table: Record<string, string[]>) =>
    (name: string, version: string): Set<string> => {
      const names = name === '@molecule/core' ? table[version] : undefined
      if (!names) throw new Error(`read ${name}@${version}, which npm does not publish`)
      return new Set(names)
    }
  /** The versions npm publishes of `@molecule/core`. */
  const publishing = (...list: string[]) => new Map([['@molecule/core', list]])
  const exportsAt = exportsOf({ '1.0.0': ['old'] })

  it('names each import the floor lacks, with the range that fixes it', () => {
    const pkg = { peerDependencies: { '@molecule/core': '^1.0.0' } }
    expect(
      findFloorGaps(
        pkg,
        importsOf('@molecule/core', ['old', 'added']),
        versions,
        exportsAt,
        publishing('1.0.0'),
      ),
    ).toEqual([
      {
        peer: '@molecule/core',
        range: '^1.0.0',
        floor: '1.0.0',
        // 1.4.0 is not on npm yet: releasing the workspace version ships the names.
        fix: '^1.4.0',
        missing: [{ name: 'added', files: ['src/a.ts'] }],
      },
    ])
  })

  it('passes when the floor exports every imported name', () => {
    const pkg = { peerDependencies: { '@molecule/core': '^1.0.0' } }
    expect(
      findFloorGaps(
        pkg,
        importsOf('@molecule/core', ['old']),
        versions,
        exportsAt,
        publishing('1.0.0'),
      ),
    ).toEqual([])
  })

  it('checks the lowest PUBLISHED version the range allows, not the range minimum', () => {
    // 2026-11-14: four framework bindings imported followRouterLink under ^1.1.0.
    // npm never published app-routing 1.1.0, so the old rule skipped the check, but
    // the range installs 1.2.0, which lacks the name.
    const read = vi.fn(exportsOf({ '1.0.5': ['old'], '1.2.0': ['old'] }))
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.1.0' } },
        importsOf('@molecule/core', ['old', 'added']),
        new Map([['@molecule/core', '1.2.0']]),
        read,
        publishing('1.0.5', '1.2.0'),
      ),
    ).toEqual([
      {
        peer: '@molecule/core',
        range: '^1.1.0',
        floor: '1.2.0',
        fix: '^1.3.0',
        missing: [{ name: 'added', files: ['src/a.ts'] }],
      },
    ])
    expect(read).not.toHaveBeenCalledWith('@molecule/core', '1.1.0')
  })

  it('names the next minor when the floor is the workspace version npm already serves', () => {
    // Before the release versions the peer, its workspace version is the published one,
    // which lacks the names added since (2026-11-14: serverErrorMessage under ^1.7.1).
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.4.0' } },
        importsOf('@molecule/core', ['old', 'added']),
        versions,
        exportsOf({ '1.0.0': ['old'], '1.4.0': ['old'] }),
        publishing('1.0.0', '1.4.0'),
      ),
    ).toEqual([
      {
        peer: '@molecule/core',
        range: '^1.4.0',
        floor: '1.4.0',
        fix: '^1.5.0',
        missing: [{ name: 'added', files: ['src/a.ts'] }],
      },
    ])
  })

  it('names the workspace version when npm serves it with every name, else the next minor', () => {
    const gap = (atCurrent: string[]) =>
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.0.0' } },
        importsOf('@molecule/core', ['old', 'added']),
        versions,
        exportsOf({ '1.0.0': ['old'], '1.4.0': atCurrent }),
        publishing('1.0.0', '1.4.0'),
      ).map(({ fix }) => fix)
    expect(gap(['old', 'added'])).toEqual(['^1.4.0'])
    expect(gap(['old'])).toEqual(['^1.5.0'])
  })

  it('skips a range no published version satisfies and a floor above the workspace version', () => {
    const imports = importsOf('@molecule/core', ['added'])
    const read = vi.fn(exportsAt)
    // Nothing published satisfies the range: the first installable version is
    // released from this source (a floor above the workspace version, or the
    // workspace version itself after the version commit).
    for (const range of ['^1.5.0', '^1.4.0', '^1.1.0'])
      expect(
        findFloorGaps(
          { peerDependencies: { '@molecule/core': range } },
          imports,
          versions,
          read,
          publishing('1.0.0'),
        ),
      ).toEqual([])
    // A peer npm has never published.
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.0.0' } },
        imports,
        versions,
        read,
        new Map(),
      ),
    ).toEqual([])
    // npm serves a version newer than this workspace (the checkout is behind).
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.5.0' } },
        imports,
        versions,
        read,
        publishing('1.0.0', '1.6.0'),
      ),
    ).toEqual([])
    expect(read).not.toHaveBeenCalled()
  })

  it('ignores peers outside @molecule and peers the package imports nothing from', () => {
    const pkg = { peerDependencies: { react: '^18.0.0', '@molecule/core': '^1.0.0' } }
    const read = vi.fn(exportsAt)
    expect(findFloorGaps(pkg, new Map(), versions, read, publishing('1.0.0'))).toEqual([])
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

  it('refuses a version whose cache holds only an unpublished marker from an older check', () => {
    // Older versions of the check marked a version npm had not published yet. That
    // version may be published by now, so the marker is never read as an answer.
    mkdirSync(join(cache, '@molecule+cached@0.9.0'), { recursive: true })
    writeFileSync(join(cache, '@molecule+cached@0.9.0', 'unpublished'), '')
    expect(() => publishedExports('@molecule/cached', '0.9.0')).toThrow(/prefetchTarballs/)
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
      const versionsOf = vi.fn(async (names: string[]) => {
        expect(names).toEqual(['@molecule/app-routing'])
        return new Map([['@molecule/app-routing', ['1.0.0', '1.0.1', '1.0.5']]])
      })
      const rows = await scanFleet(root, {
        versionsOf,
        prefetch,
        exportsAt: (name: string, version: string) => {
          if (name === '@molecule/app-routing' && ['1.0.1', '1.0.5'].includes(version))
            return new Set(['getRouter'])
          throw new Error(`read ${name}@${version} before prefetching it`)
        },
      })
      // The floor downloads first; the workspace version (1.2.0, not on npm) needs no read.
      expect(prefetch.mock.calls).toEqual([[['@molecule/app-routing@1.0.1']]])
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

describe('the registry reads', () => {
  /** A tarball of one package whose declarations export `names`. */
  const tarball = (names: string[]): Buffer => {
    const root = tree({
      'package/package.json': JSON.stringify({ types: 'index.d.ts' }),
      'package/index.d.ts': names.map((n) => `export declare const ${n}: 1`).join('\n'),
    })
    try {
      execFileSync('tar', ['-czf', join(root, 'p.tgz'), '-C', root, 'package'])
      return readFileSync(join(root, 'p.tgz'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  /** Serve a fake registry for the duration of `body`. */
  const withRegistry = async (
    routes: Record<string, { type: string; body: string | Buffer }>,
    body: (requests: string[]) => Promise<void>,
  ): Promise<void> => {
    const requests: string[] = []
    const server: Server = createServer((req, res) => {
      requests.push(`${req.url} ${req.headers.accept ?? ''}`)
      const route = routes[req.url ?? '']
      if (!route) {
        res.writeHead(404).end()
        return
      }
      res.writeHead(200, { 'content-type': route.type }).end(route.body)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const before = process.env.npm_config_registry
    process.env.npm_config_registry = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
    try {
      await body(requests)
    } finally {
      if (before === undefined) delete process.env.npm_config_registry
      else process.env.npm_config_registry = before
      await new Promise((resolve) => server.close(resolve))
    }
  }

  it('lists the versions npm publishes of each package from its abbreviated document', async () => {
    await withRegistry(
      {
        '/@molecule%2fone': {
          type: 'application/vnd.npm.install-v1+json',
          body: JSON.stringify({ versions: { '1.0.5': {}, '1.2.0': {} } }),
        },
      },
      async (requests) => {
        const versions = await fetchPublishedVersions(['@molecule/one', '@molecule/never'])
        expect(versions).toEqual(
          new Map([
            ['@molecule/one', ['1.0.5', '1.2.0']],
            ['@molecule/never', []],
          ]),
        )
        expect(requests).toContain('/@molecule%2fone application/vnd.npm.install-v1+json')
      },
    )
  })

  it('downloads a listed version, replacing an unpublished marker an older check left', async () => {
    const dir = join(cache, '@molecule+late@1.0.0')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'unpublished'), '')
    await withRegistry(
      {
        '/@molecule/late/-/late-1.0.0.tgz': {
          type: 'application/octet-stream',
          body: tarball(['shipped']),
        },
      },
      async () => {
        await prefetchTarballs(['@molecule/late@1.0.0'])
        expect(existsSync(join(dir, 'unpublished'))).toBe(false)
        expect([...publishedExports('@molecule/late', '1.0.0')]).toEqual(['shipped'])
      },
    )
  })

  it('fails when a listed version has no tarball', async () => {
    await withRegistry({}, async () => {
      await expect(prefetchTarballs(['@molecule/gone@1.0.0'])).rejects.toThrow(/404/)
    })
    expect(existsSync(join(cache, '@molecule+gone@1.0.0'))).toBe(false)
  })
})
