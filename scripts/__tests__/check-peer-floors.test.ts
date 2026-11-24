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
import { fileURLToPath } from 'node:url'

import semver from 'semver'
import { afterAll, describe, expect, it, vi } from 'vitest'

// The cache location is read when the module loads, so it is set before the import.
const cache = vi.hoisted(() => {
  const dir = `${process.env.TMPDIR ?? '/tmp'}/peer-floors-cache-${process.pid}-${Date.now()}`
  process.env.MOL_PEER_FLOORS_CACHE = dir
  return dir
})

import {
  CLASS_MAP_EVERY_MEMBER,
  classMapReads,
  declaredExports,
  entryTypesPath,
  EVERY_EXPORT,
  fetchPublishedVersions,
  findFloorGaps,
  namedImports,
  packagesForPaths,
  prefetchTarballs,
  publishedExports,
  raisedRange,
  scanFleet,
  scriptText,
  versionCommit,
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

  it('records every export for a star re-export or a namespace import', () => {
    const src = [
      "import * as locales from '@molecule/ns'",
      "export * from '@molecule/star/sub'",
      "export * as all from '@molecule/star-as'",
      "export type * from '@molecule/star-types'",
    ].join('\n')
    const found = namedImports(src, 'a.ts')
    expect([...found.keys()].sort()).toEqual([
      '@molecule/ns',
      '@molecule/star-as',
      '@molecule/star-types',
      '@molecule/star/sub',
    ])
    for (const names of found.values()) expect([...names]).toEqual([EVERY_EXPORT])
  })

  it('records the types a type-only namespace import references', () => {
    const src = [
      "import type * as I18n from '@molecule/app-i18n'",
      'type T = typeof import("x") | I18n.TranslateFn',
      'const f = (o: I18n.Options): I18n.TranslateFn => o.t',
    ].join('\n')
    expect([...namedImports(src, 'a.ts').get('@molecule/app-i18n')!].sort()).toEqual([
      'Options',
      'TranslateFn',
    ])
  })

  it('skips imports that name nothing', () => {
    const src = [
      "import '@molecule/side-effect'",
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

  it('names the lowest served version that exports every imported name', () => {
    // 2026-11-16: app-ui 1.3.11 already had the members 81 packages read, while the
    // workspace was at the unpublished 1.4.0; naming ^1.4.0 asked for more than needed.
    const read = vi.fn(
      exportsOf({
        '1.0.0': ['old'],
        '1.2.0': ['added'],
        '1.3.0': ['old', 'added'],
        '1.3.5': ['old', 'added'],
      }),
    )
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.0.0' } },
        importsOf('@molecule/core', ['old', 'added']),
        versions,
        read,
        publishing('1.0.0', '1.2.0', '1.2.5-beta.1', '1.3.0', '1.3.5'),
      ).map(({ fix }) => fix),
    ).toEqual(['^1.3.0'])
    // A prerelease is never a candidate.
    expect(read).not.toHaveBeenCalledWith('@molecule/core', '1.2.5-beta.1')
  })

  it('never names a served version in another major than the workspace version', () => {
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.0.0' } },
        importsOf('@molecule/core', ['old', 'added']),
        new Map([['@molecule/core', '2.0.0']]),
        exportsOf({ '1.0.0': ['old'], '1.3.0': ['old', 'added'] }),
        publishing('1.0.0', '1.3.0'),
      ).map(({ fix }) => fix),
    ).toEqual(['^2.0.0'])
  })

  it('checks an unpublished workspace version the range allows at the commit that versioned it', () => {
    // 2026-11-24: 14 Svelte ports imported ContentOrElse under ^3.13.0 while the release was
    // publishing app-svelte 3.13.0 from its version commit, which lacks it.
    for (const range of ['^1.4.0', '^1.1.0'])
      expect(
        findFloorGaps(
          { peerDependencies: { '@molecule/core': range } },
          importsOf('@molecule/core', ['old', 'added']),
          versions,
          exportsOf({ '1.4.0': ['old'] }),
          publishing('1.0.0'),
        ),
      ).toEqual([
        {
          peer: '@molecule/core',
          range,
          floor: '1.4.0',
          fix: '^1.5.0',
          missing: [{ name: 'added', files: ['src/a.ts'] }],
        },
      ])
    // Its version commit has the name: nothing to raise.
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.4.0' } },
        importsOf('@molecule/core', ['old', 'added']),
        versions,
        exportsOf({ '1.4.0': ['old', 'added'] }),
        publishing('1.0.0'),
      ),
    ).toEqual([])
  })

  it('skips a range no published version satisfies and a floor above the workspace version', () => {
    const imports = importsOf('@molecule/core', ['added'])
    const read = vi.fn(exportsAt)
    // Nothing published or in the workspace satisfies the range: the first installable
    // version is released from this source.
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.5.0' } },
        imports,
        versions,
        read,
        publishing('1.0.0'),
      ),
    ).toEqual([])
    // A peer npm has never published: its workspace version is read where its release
    // publishes it from (released from this source, it has every name).
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.0.0' } },
        imports,
        versions,
        exportsOf({ '1.4.0': ['added'] }),
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

  it('ignores peers the package imports nothing from', () => {
    const pkg = {
      peerDependencies: { react: '^18.0.0', '@molecule/core': '^1.0.0' },
    }
    const read = vi.fn(exportsAt)
    const published = new Map([...publishing('1.0.0'), ['react', ['18.0.0']]])
    expect(findFloorGaps(pkg, new Map(), versions, read, published)).toEqual([])
    expect(read).not.toHaveBeenCalled()
  })

  describe('a third-party peer', () => {
    /** Names per published vue version; null for a version that ships no declarations. */
    const vueAt = (table: Record<string, string[] | null>) =>
      vi.fn((name: string, version: string): Set<string> | null => {
        if (name !== 'vue' || !(version in table))
          throw new Error(`read ${name}@${version}, which npm does not publish`)
        const names = table[version]
        return names && new Set(names)
      })
    const vue = (...list: string[]) => new Map([['vue', list]])
    const pkg = { peerDependencies: { vue: '^3.4.0' } }
    const imports = importsOf('vue', ['ref', 'useTemplateRef'])

    it('names the lowest version its range allows that declares every imported name', () => {
      // 2026-11-19: 22 Vue ports called useTemplateRef, new in vue 3.5, under ^3.4.0. Only
      // @molecule peers were checked, so a user on vue 3.4 got a missing export.
      const read = vueAt({
        '3.4.0': ['ref'],
        '3.4.5': ['ref'],
        '3.5.0': ['ref', 'useTemplateRef'],
        '3.5.3': ['ref', 'useTemplateRef'],
      })
      expect(
        findFloorGaps(
          pkg,
          imports,
          new Map(),
          read,
          vue('3.3.0', '3.4.0', '3.4.5', '3.5.0-beta.1', '3.5.0', '3.5.3'),
        ),
      ).toEqual([
        {
          peer: 'vue',
          range: '^3.4.0',
          floor: '3.4.0',
          fix: '^3.5.0',
          missing: [{ name: 'useTemplateRef', files: ['src/a.ts'] }],
        },
      ])
      // A prerelease is never a candidate, and a version below the floor is never read.
      expect(read).not.toHaveBeenCalledWith('vue', '3.5.0-beta.1', '.')
      expect(read).not.toHaveBeenCalledWith('vue', '3.3.0', '.')
    })

    it('passes when the floor declares every imported name', () => {
      const read = vueAt({ '3.4.0': ['ref', 'useTemplateRef'] })
      expect(findFloorGaps(pkg, imports, new Map(), read, vue('3.4.0', '3.5.0'))).toEqual([])
    })

    it('names no fix when no version the range allows declares the names', () => {
      const read = vueAt({ '3.4.0': ['ref'], '3.5.0': ['ref'] })
      expect(
        findFloorGaps(pkg, imports, new Map(), read, vue('3.4.0', '3.5.0')).map(({ fix }) => fix),
      ).toEqual([null])
    })

    it('skips a floor that ships no declarations, whose types a user picks from @types', () => {
      const read = vueAt({ '3.4.0': null })
      expect(findFloorGaps(pkg, imports, new Map(), read, vue('3.4.0', '3.5.0'))).toEqual([])
    })
  })

  it("checks a subpath import against that entry of the floor's exports map", () => {
    // 2026-11-19: useTagInput imported useCommittedRef from @molecule/app-react/render under
    // ^4.8.0, and 4.8.0's ./render lacks it. Subpath imports were skipped, so it passed.
    const byEntry: Record<string, Record<string, string[]>> = {
      '1.0.0': { '.': ['old', 'rootOnly'], './render': ['useLatest'] },
      '1.2.0': { '.': ['old'], './render': ['useLatest', 'useCommittedRef'] },
    }
    const read = (name: string, version: string, entry: string): Set<string> => {
      const names = name === '@molecule/core' ? byEntry[version]?.[entry] : undefined
      if (!names) throw new Error(`read ${name}@${version} ${entry}, which npm does not publish`)
      return new Set(names)
    }
    const imports = new Map([
      ['@molecule/core', new Map([['old', new Set(['src/a.ts'])]])],
      [
        '@molecule/core/render',
        new Map([
          ['useCommittedRef', new Set(['src/hook.ts'])],
          ['useLatest', new Set(['src/hook.ts'])],
          // Exported by the root, not by ./render: the entry decides.
          ['rootOnly', new Set(['src/hook.ts'])],
        ]),
      ],
    ])
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.0.0' } },
        imports,
        versions,
        read,
        publishing('1.0.0', '1.2.0'),
      ),
    ).toEqual([
      {
        peer: '@molecule/core',
        range: '^1.0.0',
        floor: '1.0.0',
        // 1.2.0 still lacks rootOnly in ./render, so no served version fixes it: release 1.4.0.
        fix: '^1.4.0',
        missing: [
          { name: 'rootOnly', entry: './render', files: ['src/hook.ts'] },
          {
            name: 'useCommittedRef',
            entry: './render',
            files: ['src/hook.ts'],
          },
        ],
      },
    ])
    imports.get('@molecule/core/render')!.delete('rootOnly')
    expect(
      findFloorGaps(
        { peerDependencies: { '@molecule/core': '^1.0.0' } },
        imports,
        versions,
        read,
        publishing('1.0.0', '1.2.0'),
      ),
    ).toEqual([
      expect.objectContaining({
        fix: '^1.2.0',
        missing: [
          {
            name: 'useCommittedRef',
            entry: './render',
            files: ['src/hook.ts'],
          },
        ],
      }),
    ])
  })
})

describe('versionCommit', () => {
  /** A git repository whose package.json moves through the given versions, one commit each. */
  const history = (versions: string[]): string => {
    const root = tree({})
    const git = (...args: string[]) =>
      execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: 't',
          GIT_AUTHOR_EMAIL: 't@t',
          GIT_COMMITTER_NAME: 't',
          GIT_COMMITTER_EMAIL: 't@t',
        },
      })
    git('init', '-q')
    mkdirSync(join(root, 'pkg/src'), { recursive: true })
    for (const [i, version] of versions.entries()) {
      writeFileSync(join(root, 'pkg/package.json'), JSON.stringify({ name: 'p', version }))
      writeFileSync(join(root, 'pkg/src/index.ts'), `export const v${i} = 1\n`)
      git('add', '-A')
      git('commit', '-q', '-m', `c${i}`)
    }
    return root
  }
  const subject = (root: string, ref: string): string =>
    execFileSync('git', ['log', '-1', '--format=%s', ref], { cwd: root, encoding: 'utf8' }).trim()

  it('names the commit that changed the version to it, past later commits', () => {
    const root = history(['1.0.0', '1.1.0', '1.1.0', '1.1.0'])
    expect(subject(root, versionCommit(root, join(root, 'pkg'), '1.1.0')!)).toBe('c1')
    rmSync(root, { recursive: true, force: true })
  })

  it('names none for a version the package was created with, or one no commit holds', () => {
    const root = history(['1.0.0', '1.0.0'])
    expect(versionCommit(root, join(root, 'pkg'), '1.0.0')).toBeNull()
    expect(versionCommit(root, join(root, 'pkg'), '1.2.0')).toBeNull()
    rmSync(root, { recursive: true, force: true })
  })

  // The pre-commit hook and the release run the check from an export of the repository, with no
  // .git (2026-11-24: every commit raising a peer to a versioned, unpublished floor was refused).
  describe('from an export of the repository', () => {
    const exported = (root: string): string => {
      const out = tree({})
      const archive = execFileSync('git', ['archive', '--format=tar', 'HEAD'], { cwd: root })
      execFileSync('tar', ['-x', '-C', out], { input: archive })
      return out
    }

    it('reads the history of the repository MOL_INDEX_REPO names', () => {
      const root = history(['1.0.0', '1.1.0', '1.1.0'])
      const out = exported(root)
      vi.stubEnv('MOL_INDEX_REPO', root)
      try {
        expect(subject(root, versionCommit(out, join(out, 'pkg'), '1.1.0')!)).toBe('c1')
      } finally {
        vi.unstubAllEnvs()
        rmSync(root, { recursive: true, force: true })
        rmSync(out, { recursive: true, force: true })
      }
    })

    it('names MOL_INDEX_REPO when the tree has no history and nothing names it', () => {
      const root = history(['1.0.0', '1.1.0'])
      const out = exported(root)
      vi.stubEnv('MOL_INDEX_REPO', '')
      try {
        expect(() => versionCommit(out, join(out, 'pkg'), '1.1.0')).toThrow(
          /is no repository: run it in the checkout, or name the checkout in MOL_INDEX_REPO/,
        )
      } finally {
        vi.unstubAllEnvs()
        rmSync(root, { recursive: true, force: true })
        rmSync(out, { recursive: true, force: true })
      }
    })
  })
})

describe('raisedRange', () => {
  it('starts the alternative holding the version at it, keeping its shorthand or upper bound', () => {
    expect(raisedRange('^3.4.0', '3.5.0')).toBe('^3.5.0')
    expect(raisedRange('~0.16.0', '0.16.1')).toBe('~0.16.1')
    expect(raisedRange('>=9.0.0', '11.0.0')).toBe('>=11.0.0')
    expect(raisedRange('>=1.0.0 <3.0.0', '2.1.0')).toBe('>=2.1.0 <3.0.0')
  })

  it('drops the alternatives wholly below the version and keeps the higher ones', () => {
    expect(raisedRange('^7.0.0 || ^8.0.0', '7.2.0')).toBe('^7.2.0 || ^8.0.0')
    expect(raisedRange('^7.0.0 || ^8.0.0', '8.1.0')).toBe('^8.1.0')
  })
})

describe('entryTypesPath', () => {
  const manifest = {
    types: './dist/index.d.ts',
    exports: {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './render': {
        types: './dist/render/index.d.ts',
        import: './dist/render/index.js',
      },
      './components/Tooltip.js': { import: './dist/components/Tooltip.js' },
      './optional/*.js': {
        types: './dist/optional/*.d.ts',
        import: './dist/optional/*.js',
      },
      './optional/special/*.js': './dist/special/*.js',
      './package.json': './package.json',
    },
  }

  it('reads an exact key, else the longest matching pattern, through its types condition', () => {
    expect(entryTypesPath(manifest, '.')).toBe('./dist/index.d.ts')
    expect(entryTypesPath(manifest, './render')).toBe('./dist/render/index.d.ts')
    expect(entryTypesPath(manifest, './components/Tooltip.js')).toBe(
      './dist/components/Tooltip.d.ts',
    )
    expect(entryTypesPath(manifest, './optional/maps-leaflet.js')).toBe(
      './dist/optional/maps-leaflet.d.ts',
    )
    expect(entryTypesPath(manifest, './optional/special/a.js')).toBe('./dist/special/a.d.ts')
  })

  it('names no file for a subpath the map does not export', () => {
    expect(entryTypesPath(manifest, './hooks')).toBeNull()
    expect(entryTypesPath({ exports: { types: './i.d.ts', import: './i.js' } }, './x')).toBeNull()
  })

  it('falls back to types, typings and index.d.ts for the root, and a path without a map', () => {
    expect(entryTypesPath({ exports: { types: './i.d.ts', import: './i.js' } }, '.')).toBe(
      './i.d.ts',
    )
    expect(entryTypesPath({ typings: './t.d.ts' }, '.')).toBe('./t.d.ts')
    expect(entryTypesPath({}, '.')).toBe('index.d.ts')
    expect(entryTypesPath({}, './types.js')).toBe('./types.d.ts')
  })
})

describe('classMapReads', () => {
  it('reads the members of every name bound to getClassMap() or typed UIClassMap', () => {
    const tsx = [
      "import { getClassMap, type UIClassMap } from '@molecule/app-ui'",
      'const cm = getClassMap()',
      'const label = (map: UIClassMap) => map.textTone("success")',
      'export const A = () => <div className={cm.cn(cm.flex({ gap: "sm" }), getClassMap().srOnly)} />',
    ].join('\n')
    expect([...classMapReads(tsx)].sort()).toEqual(['cn', 'flex', 'srOnly', 'textTone'])
  })

  it('binds no type name when a field holds a value read off getClassMap()', () => {
    // 2026-11-17: `emptyClass: string = getClassMap().cn(…)` bound `string`, so every
    // `string[]` in the file read as a computed key and held the floor to every member.
    const angular = [
      'export class C {',
      '  protected readonly emptyClass: string = getClassMap().cn(getClassMap().textMuted)',
      '  private visibleItems(): string[] {',
      '    const result: string[] = []',
      '    return result',
      '  }',
      '}',
    ].join('\n')
    expect([...classMapReads(angular)].sort()).toEqual(['cn', 'textMuted'])
  })

  it('reads an Angular template and a Svelte component markup', () => {
    const angular = [
      '@Component({ template: `<span [class]="cm.textTone(\'error\')"></span>` })',
      'export class C { readonly cm: UIClassMap = getClassMap() }',
    ].join('\n')
    expect([...classMapReads(angular)].sort()).toEqual(['textTone'])
    const svelte = [
      '<script lang="ts">',
      "  import { getClassMap } from '@molecule/app-ui'",
      '  const cm = getClassMap()',
      '</script>',
      '<div class={cm.bgScrim}></div>',
    ].join('\n')
    expect([...classMapReads(svelte)]).toEqual(['bgScrim'])
  })

  it('reads through a reactive wrapper and a method that returns the ClassMap', () => {
    // 2026-11-15: 43 Svelte and Angular ports bind the ClassMap these ways, and the
    // first version of this reader saw none of their reads.
    const svelte = 'const cm = $derived(getClassMap())\n<span class={cm.iconGlyphFont}></span>'
    expect([...classMapReads(svelte)]).toEqual(['iconGlyphFont'])
    const vue = 'const cm = computed(() => getClassMap())\nconst a = cm.value.minW'
    expect([...classMapReads(vue)]).toEqual(['minW'])
    const angular = [
      '@Component({ template: `<button [class]="cm().touchTargetCompact"></button>` })',
      'export class C {',
      '  cm(): UIClassMap {',
      '    return getClassMap()',
      '  }',
      '  get map(): UIClassMap { return getClassMap() }',
      '  label() { return this.cm().textTone("ok") + this.map.srOnly }',
      '}',
    ].join('\n')
    expect([...classMapReads(angular)].sort()).toEqual(['srOnly', 'textTone', 'touchTargetCompact'])
  })

  it('reads nothing from a name the file never binds to the ClassMap', () => {
    // CodeMirror's editor is conventionally `cm` too.
    expect([...classMapReads('const cm = new EditorView(); cm.dispatch(tr)')]).toEqual([])
  })

  it('reads the members a destructuring takes from the ClassMap', () => {
    const tsx = [
      'const cm = getClassMap()',
      'const { flex, textTone: tone, srOnly = "", ...rest } = cm',
      'const { bgScrim } = getClassMap()',
      'const a = rest.minW',
    ].join('\n')
    expect([...classMapReads(tsx)].sort()).toEqual([
      'bgScrim',
      'flex',
      'minW',
      'srOnly',
      'textTone',
    ])
  })

  it('reads every member through a computed key, which names no member it can check', () => {
    expect([...classMapReads('const cm = getClassMap()\nconst c = cm[variant]')]).toEqual([
      CLASS_MAP_EVERY_MEMBER,
    ])
    expect([...classMapReads('const c = getClassMap()[key]')]).toEqual([CLASS_MAP_EVERY_MEMBER])
    // An index into a member's result is a read of that member only.
    expect([...classMapReads('const cm = getClassMap()\nconst c = cm.sizes[size]')]).toEqual([
      'sizes',
    ])
  })
})

describe('declaredExports', () => {
  it('reads the names a source entry re-exports from a .tsx module', () => {
    // 2026-11-24: app-react's RoutedView (providers.tsx) read as missing from its source.
    const root = tree({
      'src/index.ts': "export * from './view.js'\nexport const plain = 1\n",
      'src/view.tsx': 'export function View(): null {\n  return null\n}\n',
    })
    expect([...declaredExports(join(root, 'src/index.ts'))].sort()).toEqual(['View', 'plain'])
    rmSync(root, { recursive: true, force: true })
  })

  it('names each member of an exported UIClassMap interface', () => {
    const root = tree({
      'index.d.ts': "export * from './types.js'\nexport declare function getClassMap(): UIClassMap",
      'types.d.ts':
        'export interface UIClassMap {\n  flex: string\n  textTone(tone: string): string\n}',
    })
    try {
      expect([...declaredExports(join(root, 'index.d.ts'))].sort()).toEqual([
        'UIClassMap',
        'UIClassMap.flex',
        'UIClassMap.textTone',
        'getClassMap',
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

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

  it('reads a module the file declares by name, as a DefinitelyTyped package does', () => {
    const root = tree({
      'index.d.ts': "declare module 'netinfo-like' {\n  export const fetch: () => void\n}",
    })
    try {
      expect([...declaredExports(join(root, 'index.d.ts'), 'netinfo-like')]).toEqual(['fetch'])
      expect(() => declaredExports(join(root, 'index.d.ts'), 'another')).toThrow(/not a module/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reads export = as a default export beside the members it carries', () => {
    const root = tree({
      'index.d.ts': [
        'declare function lib(): void',
        'declare namespace lib {',
        '  const version: string',
        '}',
        'export = lib',
      ].join('\n'),
    })
    try {
      expect([...declaredExports(join(root, 'index.d.ts'))]).toEqual(
        expect.arrayContaining(['default', 'version']),
      )
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

  it('reads a subpath through its exports entry, and nothing from one it does not export', () => {
    const pkgDir = join(cache, '@molecule+sub@1.0.0', 'package')
    mkdirSync(join(pkgDir, 'dist', 'render'), { recursive: true })
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        exports: {
          '.': { types: './dist/index.d.ts' },
          './render': { types: './dist/render/index.d.ts' },
          './gone': { types: './dist/gone.d.ts' },
        },
      }),
    )
    writeFileSync(join(pkgDir, 'dist', 'index.d.ts'), 'export declare const root: 1')
    writeFileSync(join(pkgDir, 'dist', 'render', 'index.d.ts'), 'export declare const useLatest: 1')
    expect([...publishedExports('@molecule/sub', '1.0.0')]).toEqual(['root'])
    expect([...publishedExports('@molecule/sub', '1.0.0', './render')]).toEqual(['useLatest'])
    // Not in the map, or in the map without its file: an import of it cannot resolve.
    expect(publishedExports('@molecule/sub', '1.0.0', './hooks').size).toBe(0)
    expect(publishedExports('@molecule/sub', '1.0.0', './gone').size).toBe(0)
    // Each entry's list is stored on its own, beside the root's.
    expect(
      JSON.parse(
        readFileSync(join(cache, '@molecule+sub@1.0.0', 'exports-v3-render.json'), 'utf8'),
      ),
    ).toEqual(['useLatest'])
  })

  it('reads nothing from a third-party version without declarations, and stores that', () => {
    // Its types come from @types/*, whose version a user picks apart from the package's.
    const pkgDir = join(cache, 'untyped@1.0.0', 'package')
    mkdirSync(pkgDir, { recursive: true })
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'untyped', main: 'i.js' }))
    expect(publishedExports('untyped', '1.0.0')).toBeNull()
    expect(
      JSON.parse(readFileSync(join(cache, 'untyped@1.0.0', 'exports-v3.json'), 'utf8')),
    ).toBeNull()
  })

  it('refuses a @molecule version whose manifest names a declaration file it does not ship', () => {
    const pkgDir = join(cache, '@molecule+hollow@1.0.0', 'package')
    mkdirSync(pkgDir, { recursive: true })
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ types: './dist/index.d.ts' }))
    expect(() => publishedExports('@molecule/hollow', '1.0.0')).toThrow(/does not ship/)
  })

  it('resolves a types path naming a directory to its index, as react-native\'s "types" does', () => {
    const pkgDir = join(cache, 'native-like@1.0.0', 'package')
    mkdirSync(join(pkgDir, 'types'), { recursive: true })
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ types: 'types' }))
    writeFileSync(join(pkgDir, 'types', 'index.d.ts'), 'export declare const StatusBar: 1')
    expect([...publishedExports('native-like', '1.0.0')!]).toEqual(['StatusBar'])
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
        peerDependencies: {
          '@molecule/app-routing': '^1.0.1',
          react: '^19.0.0',
        },
      }),
      'packages/app/bonds/routing/x/src/router.ts':
        "import { createHistoryRouter, getRouter } from '@molecule/app-routing'",
      'packages/app/bonds/routing/x/src/Link.svelte':
        '<script lang="ts">\nimport { resolveListRoute } from \'@molecule/app-routing\'\n</script>',
      // Tests and private packages are not what a user installs.
      'packages/app/bonds/routing/x/src/__tests__/router.test.ts':
        "import { testOnly } from '@molecule/app-routing'",
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
      // The floor downloads first, then the served versions above it that could fix the gap
      // (1.0.5); the workspace version (1.2.0, not on npm) needs no read.
      expect(prefetch.mock.calls).toEqual([
        [['@molecule/app-routing@1.0.1']],
        [['@molecule/app-routing@1.0.5']],
      ])
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

  it('finds the fix for a third-party peer over passes, reading only what it fetched', async () => {
    const root = tree({
      'packages/app/frameworks/vue/package.json': JSON.stringify({
        name: '@molecule/app-x-vue',
        version: '1.0.0',
        peerDependencies: { vue: '^3.4.0' },
      }),
      'packages/app/frameworks/vue/src/X.vue':
        '<script setup lang="ts">\nimport { ref, useTemplateRef } from \'vue\'\n</script>',
    })
    try {
      const list = ['3.4.0', '3.4.1', '3.4.2', '3.4.3', '3.5.0', '3.5.1', '3.5.2']
      const fetched = new Set<string>()
      const prefetch = vi.fn(async (keys: string[]) => {
        for (const key of keys) fetched.add(key)
      })
      const rows = await scanFleet(root, {
        versionsOf: async (names: string[]) => {
          expect(names).toEqual(['vue'])
          return new Map([['vue', list]])
        },
        prefetch,
        exportsAt: (name: string, version: string) => {
          if (!fetched.has(`${name}@${version}`))
            throw new Error(`read ${name}@${version} unfetched`)
          return new Set(semver.lt(version, '3.5.0') ? ['ref'] : ['ref', 'useTemplateRef'])
        },
      })
      expect(rows).toEqual([
        {
          package: '@molecule/app-x-vue',
          dir: 'packages/app/frameworks/vue',
          gaps: [
            {
              peer: 'vue',
              range: '^3.4.0',
              floor: '3.4.0',
              fix: '^3.5.0',
              missing: [
                { name: 'useTemplateRef', files: ['packages/app/frameworks/vue/src/X.vue'] },
              ],
            },
          ],
        },
      ])
      // A binary search over the versions above the floor, not a read of each one.
      expect(fetched.size).toBeLessThan(list.length)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it("reports a subpath import its floor's entry lacks, and reads that entry", async () => {
    const root = tree({
      'packages/app/frameworks/react/package.json': JSON.stringify({
        name: '@molecule/app-react',
        version: '4.8.0',
      }),
      'packages/app/frameworks/react/src/index.ts': 'export const useHttp = () => null',
      'packages/app/features/tag-input-react/package.json': JSON.stringify({
        name: '@molecule/app-tag-input-react',
        version: '1.0.0',
        peerDependencies: { '@molecule/app-react': '^4.8.0' },
      }),
      'packages/app/features/tag-input-react/src/useTagInput.ts': [
        "import { useHttp } from '@molecule/app-react'",
        "import { useCommittedRef } from '@molecule/app-react/render'",
      ].join('\n'),
    })
    try {
      const reads: string[] = []
      const rows = await scanFleet(root, {
        versionsOf: async () => new Map([['@molecule/app-react', ['4.7.3', '4.8.0']]]),
        prefetch: async () => undefined,
        exportsAt: (name: string, version: string, entry: string) => {
          reads.push(`${name}@${version} ${entry}`)
          return new Set(entry === '.' ? ['useHttp'] : ['useInsertionHandler'])
        },
      })
      expect(reads).toEqual(['@molecule/app-react@4.8.0 .', '@molecule/app-react@4.8.0 ./render'])
      expect(rows).toEqual([
        {
          package: '@molecule/app-tag-input-react',
          dir: 'packages/app/features/tag-input-react',
          gaps: [
            {
              peer: '@molecule/app-react',
              range: '^4.8.0',
              floor: '4.8.0',
              // 4.8.0 is the workspace version and npm already serves it: the next minor.
              fix: '^4.9.0',
              missing: [
                {
                  name: 'useCommittedRef',
                  entry: './render',
                  files: ['packages/app/features/tag-input-react/src/useTagInput.ts'],
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

  it("reports the names a star form uses that its floor's entry lacks, read from the workspace source", async () => {
    // 2026-11-19: `export * from '@molecule/app-routing/bond-utilities'` passed under "^1.2.0",
    // whose versions have no such entry, because a star form named nothing.
    const root = tree({
      'packages/app/core/routing/package.json': JSON.stringify({
        name: '@molecule/app-routing',
        version: '1.3.0',
        exports: {
          '.': { types: './dist/index.d.ts', import: './dist/index.js' },
          './bond-utilities': {
            types: './dist/bond-utilities.d.ts',
            import: './dist/bond-utilities.js',
          },
        },
      }),
      'packages/app/core/routing/src/index.ts': 'export const getRouter = () => null',
      'packages/app/core/routing/src/bond-utilities.ts': [
        'export const matchPath = () => null',
        'export const stringifyQuery = () => ""',
      ].join('\n'),
      'packages/api/locales/tag/package.json': JSON.stringify({
        name: '@molecule/api-locales-tag',
        version: '1.1.0',
      }),
      'packages/api/locales/tag/src/index.ts': "export * from './en.js'\nexport * from './fr.js'",
      'packages/api/locales/tag/src/en.ts': 'export const en = {}',
      'packages/api/locales/tag/src/fr.ts': 'export const fr = {}',
      'packages/app/bonds/routing/x/package.json': JSON.stringify({
        name: '@molecule/app-routing-x',
        version: '1.0.0',
        peerDependencies: {
          '@molecule/app-routing': '^1.2.0',
          '@molecule/api-locales-tag': '^1.0.0',
        },
      }),
      'packages/app/bonds/routing/x/src/utilities.ts':
        "export * from '@molecule/app-routing/bond-utilities'",
      'packages/app/bonds/routing/x/src/i18n.ts': [
        "import * as locales from '@molecule/api-locales-tag'",
        'register(locales)',
      ].join('\n'),
    })
    try {
      const reads: string[] = []
      const rows = await scanFleet(root, {
        versionsOf: async () =>
          new Map([
            ['@molecule/app-routing', ['1.2.0', '1.3.0']],
            ['@molecule/api-locales-tag', ['1.0.0', '1.1.0']],
          ]),
        prefetch: async () => undefined,
        exportsAt: (name: string, version: string, entry: string) => {
          reads.push(`${name}@${version} ${entry}`)
          // Neither published app-routing has the entry; locales 1.0.0 lacks fr, 1.1.0 has it.
          if (name === '@molecule/app-routing') return new Set()
          return new Set(version === '1.0.0' ? ['en'] : ['en', 'fr'])
        },
      })
      // Each entry it reads, once per scan pass: the subpath entry, never the root.
      expect([...new Set(reads)].sort()).toEqual([
        '@molecule/api-locales-tag@1.0.0 .',
        '@molecule/api-locales-tag@1.1.0 .',
        '@molecule/app-routing@1.2.0 ./bond-utilities',
        '@molecule/app-routing@1.3.0 ./bond-utilities',
      ])
      expect(rows).toEqual([
        {
          package: '@molecule/app-routing-x',
          dir: 'packages/app/bonds/routing/x',
          gaps: [
            {
              peer: '@molecule/app-routing',
              range: '^1.2.0',
              floor: '1.2.0',
              // 1.3.0 is the workspace version and npm serves it without the entry: the next minor.
              fix: '^1.4.0',
              missing: ['matchPath', 'stringifyQuery'].map((name) => ({
                name,
                entry: './bond-utilities',
                files: ['packages/app/bonds/routing/x/src/utilities.ts'],
              })),
            },
            {
              peer: '@molecule/api-locales-tag',
              range: '^1.0.0',
              floor: '1.0.0',
              fix: '^1.1.0',
              missing: [
                {
                  name: 'fr',
                  files: ['packages/app/bonds/routing/x/src/i18n.ts'],
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

  it('counterexample: a star form passes when its floor exports every name of the entry', async () => {
    const root = tree({
      'packages/app/core/routing/package.json': JSON.stringify({
        name: '@molecule/app-routing',
        version: '1.4.0',
        exports: {
          './bond-utilities': { types: './dist/bond-utilities.d.ts' },
        },
      }),
      'packages/app/core/routing/src/bond-utilities.ts': 'export const matchPath = () => null',
      'packages/app/bonds/routing/x/package.json': JSON.stringify({
        name: '@molecule/app-routing-x',
        version: '1.0.0',
        peerDependencies: { '@molecule/app-routing': '^1.4.0' },
      }),
      'packages/app/bonds/routing/x/src/utilities.ts':
        "export * from '@molecule/app-routing/bond-utilities'",
    })
    try {
      const rows = await scanFleet(root, {
        versionsOf: async () => new Map([['@molecule/app-routing', ['1.4.0']]]),
        prefetch: async () => undefined,
        exportsAt: () => new Set(['matchPath']),
      })
      expect(rows).toEqual([])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('reports a ClassMap member the floor of the getClassMap peer does not declare', async () => {
    // 2026-11-15: 137 packages read members such as touchTargetCompact under
    // "@molecule/app-ui": "^1.0.1", whose 1.0.1 declares none of them.
    const root = tree({
      'packages/app/core/ui/package.json': JSON.stringify({
        name: '@molecule/app-ui',
        version: '1.3.0',
      }),
      'packages/app/core/ui/src/index.ts': [
        'export interface UIClassMap {',
        '  flex: string',
        '  textTone(tone: string): string',
        '}',
        'export declare function getClassMap(): UIClassMap',
      ].join('\n'),
      'packages/app/features/chip/package.json': JSON.stringify({
        name: '@molecule/app-chip-react',
        version: '1.0.0',
        peerDependencies: { '@molecule/app-ui': '^1.0.1' },
      }),
      'packages/app/features/chip/src/Chip.tsx': [
        "import { getClassMap } from '@molecule/app-ui'",
        'const cm = getClassMap()',
        // `notAMember` is not in the workspace's UIClassMap: a text match, not a read.
        'export const Chip = () => <span className={cm.cn(cm.flex, cm.textTone("ok"), cm.notAMember)} />',
      ].join('\n'),
    })
    try {
      const rows = await scanFleet(root, {
        versionsOf: async () => new Map([['@molecule/app-ui', ['1.0.1', '1.3.0']]]),
        prefetch: async () => undefined,
        exportsAt: (name: string, version: string) => {
          if (version === '1.0.1') return new Set(['getClassMap', 'UIClassMap', 'UIClassMap.flex'])
          // npm serves the workspace version 1.3.0 with the member, so it fixes the gap.
          return new Set(['getClassMap', 'UIClassMap', 'UIClassMap.flex', 'UIClassMap.textTone'])
        },
      })
      expect(rows).toEqual([
        {
          package: '@molecule/app-chip-react',
          dir: 'packages/app/features/chip',
          gaps: [
            {
              peer: '@molecule/app-ui',
              range: '^1.0.1',
              floor: '1.0.1',
              fix: '^1.3.0',
              missing: [
                {
                  name: 'UIClassMap.textTone',
                  files: ['packages/app/features/chip/src/Chip.tsx'],
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

  it('holds a computed ClassMap read to every member, and a destructured one to its own', async () => {
    const root = tree({
      'packages/app/core/ui/package.json': JSON.stringify({
        name: '@molecule/app-ui',
        version: '1.3.0',
      }),
      'packages/app/core/ui/src/index.ts': [
        'export interface UIClassMap {',
        '  flex: string',
        '  srOnly: string',
        '  textTone(tone: string): string',
        '}',
        'export declare function getClassMap(): UIClassMap',
      ].join('\n'),
      'packages/app/features/badge/package.json': JSON.stringify({
        name: '@molecule/app-badge-react',
        version: '1.0.0',
        peerDependencies: { '@molecule/app-ui': '^1.0.1' },
      }),
      'packages/app/features/badge/src/Badge.tsx': [
        "import { getClassMap } from '@molecule/app-ui'",
        'const cm = getClassMap()',
        'export const Badge = ({ variant }: { variant: "flex" }) => <span className={cm[variant]} />',
      ].join('\n'),
      'packages/app/features/pill/package.json': JSON.stringify({
        name: '@molecule/app-pill-react',
        version: '1.0.0',
        peerDependencies: { '@molecule/app-ui': '^1.0.1' },
      }),
      'packages/app/features/pill/src/Pill.tsx': [
        "import { getClassMap } from '@molecule/app-ui'",
        'const { flex, textTone } = getClassMap()',
        'export const Pill = () => <span className={flex + textTone("ok")} />',
      ].join('\n'),
    })
    try {
      const rows = await scanFleet(root, {
        versionsOf: async () => new Map([['@molecule/app-ui', ['1.0.1', '1.3.0']]]),
        prefetch: async () => undefined,
        exportsAt: (name: string, version: string) =>
          version === '1.0.1'
            ? new Set(['getClassMap', 'UIClassMap', 'UIClassMap.flex'])
            : new Set([
                'getClassMap',
                'UIClassMap',
                'UIClassMap.flex',
                'UIClassMap.srOnly',
                'UIClassMap.textTone',
              ]),
      })
      const gap = (dir: string, file: string, names: string[]) => ({
        package: `@molecule/app-${dir}-react`,
        dir: `packages/app/features/${dir}`,
        gaps: [
          {
            peer: '@molecule/app-ui',
            range: '^1.0.1',
            floor: '1.0.1',
            fix: '^1.3.0',
            missing: names.map((name) => ({
              name,
              files: [`packages/app/features/${dir}/src/${file}`],
            })),
          },
        ],
      })
      expect(rows).toEqual([
        gap('badge', 'Badge.tsx', ['UIClassMap.srOnly', 'UIClassMap.textTone']),
        gap('pill', 'Pill.tsx', ['UIClassMap.textTone']),
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  // The pre-commit hook passes the staged paths (2026-11-16: a forms fix imported a type
  // new in app-forms 2.4.0 into five bindings under ^2.3.1; only CI on the release's
  // version commit caught it).
  const twoBindings = () =>
    tree({
      'packages/app/core/forms/package.json': JSON.stringify({
        name: '@molecule/app-forms',
        version: '2.4.0',
      }),
      'packages/app/core/forms/src/index.ts': 'export type FormUpdateOptions = {}',
      'packages/app/frameworks/react/package.json': JSON.stringify({
        name: '@molecule/app-react',
        version: '4.7.1',
        peerDependencies: { '@molecule/app-forms': '^2.2.0' },
      }),
      'packages/app/frameworks/react/src/useForm.ts':
        "import type { FormUpdateOptions } from '@molecule/app-forms'",
      'packages/app/frameworks/vue/package.json': JSON.stringify({
        name: '@molecule/app-vue',
        version: '3.7.1',
        peerDependencies: { '@molecule/app-ui': '^1.0.0' },
      }),
      'packages/app/frameworks/vue/src/useForm.ts':
        "import { getClassMap } from '@molecule/app-ui'",
    })

  it('maps paths to the packages whose package.json or src/ they are', () => {
    const root = twoBindings()
    try {
      expect(
        packagesForPaths(root, [
          'packages/app/frameworks/react/src/useForm.ts',
          'packages/app/frameworks/vue/package.json',
          'packages/app/frameworks/vue/README.md',
          'packages/app/core/forms/CHANGELOG.md',
          'scripts/check-peer-floors.mjs',
        ]),
      ).toEqual(new Set(['packages/app/frameworks/react', 'packages/app/frameworks/vue']))
      expect(packagesForPaths(root, ['README.md', 'package-lock.json'])).toEqual(new Set())
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('checks only the packages it is given, and asks npm only about their peers', async () => {
    const root = twoBindings()
    try {
      const versionsOf = vi.fn(async (names: string[]) => {
        expect(names).toEqual(['@molecule/app-forms'])
        return new Map([['@molecule/app-forms', ['2.2.0', '2.3.1']]])
      })
      const rows = await scanFleet(
        root,
        {
          versionsOf,
          prefetch: async () => undefined,
          exportsAt: () => new Set<string>(),
        },
        { only: new Set(['packages/app/frameworks/react']) },
      )
      expect(versionsOf).toHaveBeenCalledTimes(1)
      expect(rows.map((r: { package: string }) => r.package)).toEqual(['@molecule/app-react'])
      expect(rows[0].gaps[0]).toMatchObject({ floor: '2.2.0', fix: '^2.4.0' })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('exits clean without an npm request when no path belongs to a package', () => {
    // An unroutable registry: any request would fail the run.
    const out = execFileSync(
      process.execPath,
      [fileURLToPath(new URL('../check-peer-floors.mjs', import.meta.url)), '--paths-from-stdin'],
      {
        input: 'README.md\npackage-lock.json\n',
        env: { ...process.env, npm_config_registry: 'http://127.0.0.1:9/' },
        encoding: 'utf8',
      },
    )
    expect(out).toBe('')
  })

  it('reads every path from a writer that pauses partway, as the pre-commit hook pipes them', () => {
    // More than a pipe buffer (64 KiB), then a pause: a synchronous read of the non-blocking stdin
    // that `import process from 'node:process'` leaves threw EAGAIN here.
    const dir = mkdtempSync(join(tmpdir(), 'peer-floors-stdin-'))
    try {
      const paths = Array.from(
        { length: 1200 },
        (_, i) => `docs/not-a-package/file-${i}-${'x'.repeat(60)}.md`,
      )
      writeFileSync(join(dir, 'first'), `${paths.slice(0, 900).join('\n')}\n`)
      writeFileSync(join(dir, 'rest'), `${paths.slice(900).join('\n')}\n`)
      const script = fileURLToPath(new URL('../check-peer-floors.mjs', import.meta.url))
      const out = execFileSync(
        'sh',
        [
          '-c',
          '{ cat "$1"; sleep 0.3; cat "$2"; } | "$3" "$4" --paths-from-stdin',
          'sh',
          join(dir, 'first'),
          join(dir, 'rest'),
          process.execPath,
          script,
        ],
        {
          env: { ...process.env, npm_config_registry: 'http://127.0.0.1:9/' },
          encoding: 'utf8',
        },
      )
      expect(out).toBe('')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('the registry reads', () => {
  /** A gzipped tarball of `files`, each path starting with its top directory. */
  const tarOf = (files: Record<string, string>): Buffer => {
    const root = tree(files)
    try {
      const tops = [...new Set(Object.keys(files).map((file) => file.split('/')[0]))]
      execFileSync('tar', ['-czf', join(root, 'p.tgz'), '-C', root, ...tops])
      return readFileSync(join(root, 'p.tgz'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  /** A tarball of one package whose declarations export `names`. */
  const tarball = (names: string[]): Buffer =>
    tarOf({
      'package/package.json': JSON.stringify({ types: 'index.d.ts' }),
      'package/index.d.ts': names.map((n) => `export declare const ${n}: 1`).join('\n'),
    })

  const gzip = (body: Buffer) => ({ type: 'application/octet-stream', body })
  const versionsDoc = (...list: string[]) => ({
    type: 'application/vnd.npm.install-v1+json',
    body: JSON.stringify({ versions: Object.fromEntries(list.map((v) => [v, {}])) }),
  })

  it("stores a tarball whose top directory is the package's name, as @types tarballs are", async () => {
    await withRegistry(
      {
        '/@types/estree-like/-/estree-like-1.0.0.tgz': gzip(
          tarOf({
            'estree-like/package.json': JSON.stringify({ name: '@types/estree-like' }),
            'estree-like/index.d.ts': 'export declare const node: 1',
          }),
        ),
      },
      async () => {
        await prefetchTarballs(['@types/estree-like@1.0.0'])
        expect([...publishedExports('@types/estree-like', '1.0.0')!]).toEqual(['node'])
      },
    )
  })

  it('reads the names a version re-exports from another package, at the lowest version it allows', async () => {
    // vue's declarations are `export * from '@vue/runtime-dom'` and little else: without that
    // package beside it, every Vue name read as missing.
    await withRegistry(
      {
        '/vue-like/-/vue-like-3.4.0.tgz': gzip(
          tarOf({
            'package/package.json': JSON.stringify({
              name: 'vue-like',
              types: 'index.d.ts',
              dependencies: { '@vue-like/runtime': '^3.4.0' },
            }),
            'package/index.d.ts': "export * from '@vue-like/runtime'\nexport declare const own: 1",
          }),
        ),
        '/@vue-like%2fruntime': versionsDoc('3.3.0', '3.4.0', '3.4.2'),
        '/@vue-like/runtime/-/runtime-3.4.0.tgz': gzip(tarball(['ref'])),
      },
      async (requests) => {
        await prefetchTarballs(['vue-like@3.4.0'])
        expect([...publishedExports('vue-like', '3.4.0')!].sort()).toEqual(['own', 'ref'])
        expect(requests.some((r) => r.includes('runtime-3.4.2'))).toBe(false)
        // The links are stored and reused: a second prefetch asks npm for nothing.
        const before = requests.length
        await prefetchTarballs(['vue-like@3.4.0'])
        expect(requests.length).toBe(before)
      },
    )
  })

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
