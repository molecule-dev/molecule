import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest'

import { compilationPaths, pathsAgainst, scanPeerFloorTypes } from '../check-peer-floor-types.mjs'
import { prefetchTarballs, publishedPackageDir, scanFleet } from '../check-peer-floors.mjs'

const cache = vi.hoisted(() => {
  const previous = process.env.MOL_PEER_FLOORS_CACHE
  const path = `${process.env.TMPDIR ?? '/tmp'}/peer-floor-types-cache-${process.pid}-${Date.now()}`
  process.env.MOL_PEER_FLOORS_CACHE = path
  return { path, previous }
})

const elements = '@molecule/floor-elements'
const model = '@molecule/floor-model'
const feature = 'packages/feature'
const workspaceElements = 'packages/elements'
const workspaceModel = 'packages/model'
const newProp = 'onPressOutside?: () => void'
const box = (extra = '') => `export interface BoxProps { as: 'div'; ${extra} }\n`
const usesBox = `import { Box } from '${elements}/controls/box'\n\nexport const result = <Box as="div" onPressOutside={() => {}} />\n`
const normalBox = usesBox.replace(' onPressOutside={() => {}}', '')
const typeEntry = {
  './controls/*': {
    import: { types: './dist/*.d.mts', default: './dist/*.mjs' },
    require: { types: './dist/*.d.cts', default: './dist/*.cjs' },
  },
}

let root: string
let fetches: string[]
let responses: Map<string, Response | Buffer>

function write(path: string, content: string | object) {
  const file = join(root, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content))
}

function tarball(name: string, version: string, manifest: object, files: Record<string, string>) {
  const temp = mkdtempSync(join(tmpdir(), 'peer-floor-types-tarball-'))
  const dir = join(temp, 'package')
  mkdirSync(dir)
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name, version, type: 'module', ...manifest }),
  )
  try {
    for (const [path, content] of Object.entries(files)) {
      const file = join(dir, path)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, content)
    }
    execFileSync('tar', ['-czf', join(temp, 'package.tgz'), '-C', temp, 'package'])
    return readFileSync(join(temp, 'package.tgz'))
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

function publishes(name: string, versions: string[]) {
  responses.set(
    `/${name.replace('/', '%2f')}`,
    Response.json({
      versions: Object.fromEntries(versions.map((version) => [version, {}])),
    }),
  )
}

function publishedFile(
  name: string,
  version: string,
  manifest: object,
  files: Record<string, string>,
) {
  const short = name.split('/').at(-1)
  responses.set(`/${name}/-/${short}-${version}.tgz`, tarball(name, version, manifest, files))
}

function createFeature(peers: Record<string, string>, source = usesBox, config: object = {}) {
  write(`${feature}/package.json`, {
    name: '@molecule/floor-feature',
    type: 'module',
    peerDependencies: peers,
  })
  write(`${feature}/tsconfig.json`, {
    compilerOptions: {
      strict: true,
      target: 'ES2022',
      jsx: 'preserve',
      module: 'NodeNext',
      types: [],
      rootDir: 'src',
      ...config,
    },
    include: ['src/**/*'],
  })
  write(`${feature}/src/Example.tsx`, source)
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'peer-floor-types-'))
  responses = new Map()
  fetches = []
  vi.stubEnv('MOL_INDEX_REPO', '')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = new URL(url).pathname
      fetches.push(path)
      const data = responses.get(path)
      if (data instanceof Response) return data.clone()
      if (data) return new Response(Uint8Array.from(data))
      return new Response(null, { status: 404 })
    }),
  )
  write(`${workspaceElements}/package.json`, {
    name: elements,
    version: '4.5.2',
    type: 'module',
    exports: typeEntry,
  })
  write(
    `${workspaceElements}/src/box.mts`,
    `import type { BoxProps } from '${model}'\nexport function Box(props: BoxProps): number { return props.as.length }\n`,
  )
  // The fallback must see src. An older dist would silently reintroduce the bad types.
  write(
    `${workspaceElements}/dist/box.d.mts`,
    "export declare function Box(props: { as: 'div' }): number\n",
  )
  write(`${workspaceModel}/package.json`, {
    name: model,
    version: '1.2.0',
    type: 'module',
    types: 'dist/index.d.ts',
  })
  write(`${workspaceModel}/src/index.ts`, box(newProp))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  rmSync(root, { recursive: true, force: true })
  rmSync(cache.path, { recursive: true, force: true })
})

afterAll(() => {
  if (cache.previous === undefined) delete process.env.MOL_PEER_FLOORS_CACHE
  else process.env.MOL_PEER_FLOORS_CACHE = cache.previous
})

function publishBoxVersions() {
  publishes(elements, ['4.5.2', '4.4.0', '4.5.1', '4.5.0', '5.0.0'])
  publishes(model, ['1.0.0', '1.1.0'])
  publishedFile(model, '1.0.0', { types: './dist/index.d.ts' }, { 'dist/index.d.ts': box() })
  publishedFile(model, '1.1.0', { types: './dist/index.d.ts' }, { 'dist/index.d.ts': box(newProp) })
  for (const [version, modelVersion] of Object.entries({
    '4.4.0': '^1.0.0',
    '4.5.0': '^1.1.0',
    '4.5.1': '^1.0.0',
    '4.5.2': '^1.1.0',
    '5.0.0': '^1.0.0',
  })) {
    publishedFile(
      elements,
      version,
      { exports: typeEntry, peerDependencies: { [model]: modelVersion } },
      {
        'dist/box.d.mts': `import type { BoxProps } from '${model}'\nexport declare function Box(props: BoxProps): number\n`,
        'dist/box.d.cts': 'export declare function Box(props: never): number\n',
      },
    )
  }
}

it('rejects a JSX prop behind an unchanged export and finds its first published fix', async () => {
  publishBoxVersions()
  createFeature({ [elements]: '^4.3.0' })

  const rows = await scanPeerFloorTypes(root, new Set([feature]))

  expect(rows).toHaveLength(1)
  expect(rows[0].diagnostics).toEqual([
    expect.objectContaining({
      file: `${feature}/src/Example.tsx`,
      line: 3,
      column: 37,
      code: 2322,
      message: expect.stringContaining("Property 'onPressOutside' does not exist"),
      fixes: [{ peer: elements, floor: '4.4.0', version: '4.5.0' }],
    }),
  ])
  expect(fetches.filter((path) => path.endsWith('.tgz'))).toHaveLength(4)
})

it('accepts the raised floor and accepts older props at 4.4.0, and reuses extracted tarballs', async () => {
  publishBoxVersions()
  createFeature({ [elements]: '^4.5.0' })
  write(`${feature}/src/unused.test.ts`, 'const irrelevant: number = true')
  write(`${feature}/src/__tests__/bad.ts`, 'const irrelevant: number = true')
  write(`${feature}/src/__mocks__/bad.ts`, 'const irrelevant: number = true')
  expect((await scanPeerFloorTypes(root, new Set([feature])))[0].diagnostics).toEqual([])

  createFeature({ [elements]: '^4.4.0' }, normalBox)
  expect((await scanPeerFloorTypes(root, new Set([feature])))[0].diagnostics).toEqual([])
  fetches.length = 0
  expect((await scanPeerFloorTypes(root, new Set([feature])))[0].diagnostics).toEqual([])
  expect(fetches.some((path) => path.endsWith('.tgz'))).toBe(false)
})

it('keeps a complete shared tarball when both checks fetch it concurrently', async () => {
  publishBoxVersions()
  const key = `${elements}@4.4.0`
  await Promise.all([prefetchTarballs([key]), prefetchTarballs([key], 1, { reexports: false })])
  expect(
    readFileSync(join(publishedPackageDir(elements, '4.4.0'), 'dist/box.d.mts'), 'utf8'),
  ).toContain('export declare function Box')
})

it('uses the workspace source for floors above the workspace or absent from npm', async () => {
  publishBoxVersions()
  createFeature({ [elements]: '^5.0.0' })
  const [above] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(above.diagnostics).toEqual([])
  expect(above.fallbacks).toEqual([
    { peer: elements, range: '^5.0.0', workspace: '4.5.2', published: '5.0.0' },
  ])

  createFeature({ [elements]: '^6.0.0' })
  const [unpublished] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(unpublished.diagnostics).toEqual([])
  expect(unpublished.fallbacks).toEqual([
    { peer: elements, range: '^6.0.0', workspace: '4.5.2', published: null },
  ])
  expect(fetches.some((path) => path.endsWith('.tgz'))).toBe(false)
})

it('loads a workspace peer authored in TSX for a consumer whose tsconfig sets no jsx', async () => {
  publishes(elements, ['4.4.0'])
  write(`${workspaceElements}/package.json`, {
    name: elements,
    version: '4.5.2',
    type: 'module',
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
  })
  write(`${workspaceElements}/src/index.ts`, "export * from './card.js'\n")
  write(
    `${workspaceElements}/src/card.tsx`,
    'export interface CardProps { title: string }\nexport function Card(props: CardProps): number { return props.title.length }\n',
  )
  write(`${feature}/package.json`, {
    name: '@molecule/floor-feature',
    type: 'module',
    peerDependencies: { [elements]: '^4.5.0' },
  })
  write(`${feature}/tsconfig.json`, {
    compilerOptions: {
      strict: true,
      target: 'ES2022',
      module: 'NodeNext',
      types: [],
      rootDir: 'src',
    },
    include: ['src/**/*'],
  })
  write(
    `${feature}/src/width.ts`,
    `import { Card, type CardProps } from '${elements}'\n\nconst props: CardProps = { title: 'a' }\nexport const width: number = Card(props)\n`,
  )
  const [row] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(row.diagnostics).toEqual([])
  expect(row.fallbacks).toEqual([
    { peer: elements, range: '^4.5.0', workspace: '4.5.2', published: null },
  ])

  // The consumer's own setting is kept: a mistyped call is still its error.
  write(
    `${feature}/src/width.ts`,
    `import { Card } from '${elements}'\n\nexport const width: number = Card({ title: 1 })\n`,
  )
  const [bad] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(bad.diagnostics.map((diag: { code: number }) => diag.code)).toEqual([2322])
})

it('resolves Molecule type reference directives at the peer floor as well as imports', async () => {
  const ambient = (members: string) => `export {}\ndeclare global { type FloorMode = ${members} }\n`
  publishes(model, ['1.0.0', '1.1.0'])
  for (const [version, members] of [
    ['1.0.0', "'old'"],
    ['1.1.0', "'old' | 'new'"],
  ])
    publishedFile(
      model,
      version,
      { types: './dist/index.d.ts' },
      {
        'dist/index.d.ts': ambient(members),
      },
    )
  write(`${workspaceModel}/src/index.ts`, ambient("'old' | 'new'"))
  createFeature({ [model]: '^1.0.0' }, 'export const value: FloorMode = "new"\n', {
    types: [model],
  })

  const [row] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(row.diagnostics).toEqual([
    expect.objectContaining({
      line: 1,
      code: 2322,
      fixes: [{ peer: model, floor: '1.0.0', version: '1.1.0' }],
    }),
  ])
})

it('passes over versions that reject the same call with a diagnostic at a different location', async () => {
  publishes(model, ['1.0.0', '1.1.0', '1.2.0'])
  const signatures = {
    '1.0.0': 'key: number',
    '1.1.0': 'key: string, exact: boolean',
    '1.2.0': 'key: string',
  }
  for (const [version, args] of Object.entries(signatures))
    publishedFile(
      model,
      version,
      { types: './dist/index.d.ts' },
      {
        'dist/index.d.ts': `export declare function lookup(${args}): number\n`,
      },
    )
  write(
    `${workspaceModel}/src/index.ts`,
    'export function lookup(key: string): number { return key.length }\n',
  )
  createFeature(
    { [model]: '^1.0.0' },
    `import { lookup } from '${model}'\nexport const value = lookup('label')\n`,
  )

  const [row] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(row.diagnostics).toEqual([
    expect.objectContaining({
      line: 2,
      code: 2345,
      fixes: [{ peer: model, floor: '1.0.0', version: '1.2.0' }],
    }),
  ])
})

it('gives a workspace dependency the peer copy the checked package selected, as one install does', async () => {
  // A name registry the way app-icons declares CustomIconNames: an empty interface that other
  // packages augment. The workspace copy is a different file from the published floor's.
  const names = "export interface CustomNames {}\nexport type Name = 'base' | keyof CustomNames\n"
  publishes(model, ['1.0.0'])
  publishedFile(model, '1.0.0', { types: './dist/index.d.ts' }, { 'dist/index.d.ts': names })
  write(`${workspaceModel}/src/index.ts`, names)
  // An unpublished workspace dependency registers a name, as app-ide-panel-logic does for the IDE.
  const augment = '@molecule/floor-augment'
  write('packages/augment/package.json', {
    name: augment,
    version: '1.0.0',
    type: 'module',
    types: 'dist/index.d.ts',
    peerDependencies: { [model]: '^1.0.0' },
  })
  write(
    'packages/augment/src/index.ts',
    `import '${model}'\n\ndeclare module '${model}' {\n  interface CustomNames {\n    extra: true\n  }\n}\n\nexport const registered = true\n`,
  )
  createFeature(
    { [model]: '^1.0.0' },
    `import { registered } from '${augment}'\nimport type { Name } from '${model}'\n\nexport const name: Name = 'extra'\nexport const ready = registered\n`,
  )
  write(`${feature}/package.json`, {
    name: '@molecule/floor-feature',
    type: 'module',
    peerDependencies: { [model]: '^1.0.0' },
    dependencies: { [augment]: '1.0.0' },
  })

  const [row] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(row.diagnostics).toEqual([])
})

it('skips packages without Molecule peers without a registry request', async () => {
  createFeature({ react: '^19.0.0' }, 'export const ok = true')
  const [row] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(row.skipped).toBe('no @molecule/* peer dependencies')
  expect(fetches).toEqual([])
})

it('preserves compiler settings and ordinary dependency resolution', async () => {
  publishBoxVersions()
  createFeature(
    { [elements]: '^4.4.0' },
    `
    import { Box } from '${elements}/controls/box'
    import type { Optional } from 'fixture-vendor'
    import { version } from '@molecule/floor-other'
    export const value = Box({ as: 'div' })
    export const installed: 'published' = version
    export const failure: Optional = { value: undefined }
  `,
    { exactOptionalPropertyTypes: true },
  )
  write(`${feature}/node_modules/fixture-vendor/package.json`, {
    name: 'fixture-vendor',
    types: 'index.d.ts',
  })
  write(
    `${feature}/node_modules/fixture-vendor/index.d.ts`,
    'export interface Optional { value?: string }',
  )
  write('packages/other/package.json', {
    name: '@molecule/floor-other',
    version: '2.0.0',
    type: 'module',
    types: 'dist/index.d.ts',
  })
  write('packages/other/src/index.ts', "export const version = 'workspace'\n")
  write(`${feature}/node_modules/@molecule/floor-other/package.json`, {
    name: '@molecule/floor-other',
    version: '1.0.0',
    type: 'module',
    types: 'index.d.ts',
  })
  write(
    `${feature}/node_modules/@molecule/floor-other/index.d.ts`,
    "export declare const version: 'published'\n",
  )

  const [row] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(row.diagnostics).toEqual([expect.objectContaining({ line: 7, code: 2375, fixes: [] })])
})

it('proves that the name gate accepts the bad prop when the same export exists at the floor', async () => {
  const plain = { './controls/box': { types: './dist/box.d.ts', import: './dist/box.js' } }
  publishes(elements, ['4.4.0'])
  publishedFile(
    elements,
    '4.4.0',
    { exports: plain },
    {
      'dist/box.d.ts': "export declare function Box(props: { as: 'div' }): number\n",
    },
  )
  write(`${workspaceElements}/package.json`, {
    name: elements,
    version: '4.5.2',
    type: 'module',
    exports: plain,
  })
  write(
    `${workspaceElements}/src/box.ts`,
    `export function Box(props: { as: 'div'; ${newProp} }): number { return props.as.length }\n`,
  )
  createFeature({ [elements]: '^4.4.0' })

  expect(await scanFleet(root, {}, { only: new Set([feature]) })).toEqual([])
  const [row] = await scanPeerFloorTypes(root, new Set([feature]))
  expect(row.diagnostics).toEqual([
    expect.objectContaining({
      code: 2322,
      fixes: [{ peer: elements, floor: '4.4.0', version: null }],
    }),
  ])
})

it('diffs the pinned release commit, including deletions and excluding later changes', () => {
  const git = (...args: string[]) =>
    execFileSync(
      'git',
      ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
      },
    ).trim()
  git('init', '-q')
  createFeature({})
  write(`${feature}/src/deleted.ts`, 'export const gone = true')
  git('add', 'packages')
  git('commit', '-qm', 'base')
  const base = git('rev-parse', 'HEAD')
  rmSync(join(root, feature, 'src/deleted.ts'))
  write(`${feature}/src/Example.tsx`, 'export const release = true')
  git('add', '-A', 'packages')
  git('commit', '-qm', 'pinned release')
  const tip = git('rev-parse', 'HEAD')
  write('packages/late/src/new.ts', 'export const later = true')
  git('add', 'packages/late')
  git('commit', '-qm', 'later commit')
  write('packages/dirty/src/new.ts', 'export const dirty = true')

  expect(
    pathsAgainst(join(root, 'committed-export'), 'ci', {
      MOL_INDEX_REPO: root,
      MOL_PEER_FLOOR_TYPES_BASE: base,
      MOL_PEER_FLOOR_TYPES_TIP: tip,
    }),
  ).toEqual([`${feature}/src/Example.tsx`, `${feature}/src/deleted.ts`])
  expect(pathsAgainst(root, 'HEAD', {})).toEqual(['packages/dirty/src/new.ts'])
})

it('leaves out a manifest whose change cannot alter what the package compiles against (a version stage)', () => {
  const git = (...args: string[]) =>
    execFileSync(
      'git',
      ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
      },
    ).trim()
  const manifest = (name: string, extra: object) => ({
    name,
    version: '1.0.0',
    type: 'module',
    peerDependencies: { '@molecule/floor-model': '^1.0.0' },
    devDependencies: { '@molecule/floor-model': '1.0.0' },
    ...extra,
  })
  git('init', '-q')
  write('packages/released/package.json', manifest('@molecule/floor-released', {}))
  write('packages/raised/package.json', manifest('@molecule/floor-raised', {}))
  git('add', 'packages')
  git('commit', '-qm', 'base')
  const base = git('rev-parse', 'HEAD')
  // The version stage: a new version and a new development pin, nothing that compiles differently.
  write(
    'packages/released/package.json',
    manifest('@molecule/floor-released', {
      version: '1.1.0',
      devDependencies: { '@molecule/floor-model': '1.1.0' },
    }),
  )
  write(
    'packages/raised/package.json',
    manifest('@molecule/floor-raised', {
      peerDependencies: { '@molecule/floor-model': '^1.1.0' },
    }),
  )
  write('packages/added/package.json', manifest('@molecule/floor-added', {}))
  git('add', 'packages')
  git('commit', '-qm', 'version packages')
  const tip = git('rev-parse', 'HEAD')

  expect(
    pathsAgainst(join(root, 'committed-export'), 'ci', {
      MOL_INDEX_REPO: root,
      MOL_PEER_FLOOR_TYPES_BASE: base,
      MOL_PEER_FLOOR_TYPES_TIP: tip,
    }),
  ).toEqual(['packages/added/package.json', 'packages/raised/package.json'])
  // The working tree, as the hook and a local run read it, follows the same rule.
  write(
    'packages/released/package.json',
    manifest('@molecule/floor-released', { version: '1.2.0', scripts: { build: 'tsc' } }),
  )
  expect(pathsAgainst(root, 'HEAD', {})).toEqual([])
})

it('keeps every path that is not a package manifest, and a manifest gone from either side', () => {
  const before = (path: string) =>
    path === 'packages/gone/package.json' ? { name: 'a', version: '1.0.0' } : undefined
  expect(
    compilationPaths(
      ['packages/x/src/a.ts', 'packages/gone/package.json', 'packages/x/tsconfig.json'],
      before,
      () => undefined,
    ),
  ).toEqual(['packages/x/src/a.ts', 'packages/gone/package.json', 'packages/x/tsconfig.json'])
  const old = { name: 'a', version: '1.0.0', exports: { '.': './dist/index.js' } }
  expect(
    compilationPaths(
      ['packages/a/package.json'],
      () => old,
      () => ({ ...old, exports: { '.': './dist/index.js', './elements': './dist/elements.js' } }),
    ),
  ).toEqual(['packages/a/package.json'])
})
