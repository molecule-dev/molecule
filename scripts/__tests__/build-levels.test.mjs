import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

import { afterEach, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const compilerDir = path.dirname(require.resolve('typescript/package.json'))
const sourceFile =
  process.env.MOL_BUILD_SOURCE || fileURLToPath(new URL('../build.js', import.meta.url))
const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const roots = []
// The fixtures spawn node; the repo case scans every manifest twice. Both run on loaded machines.
const FIXTURE_TIMEOUT_MS = 60_000
const REPO_TIMEOUT_MS = 180_000

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

/**
 * A package graph with no sources: `--print-levels` reads manifests only.
 *
 * @param graph - Package suffix → declared `@molecule/*` edges by kind (`optionalPeers` are
 *   peers `peerDependenciesMeta` marks optional).
 * @returns The fixture root.
 */
function fixture(graph) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'molecule-build-levels-'))
  roots.push(root)
  fs.mkdirSync(root + '/scripts')
  fs.copyFileSync(sourceFile, root + '/scripts/build.js')
  fs.writeFileSync(
    root + '/package.json',
    JSON.stringify({ name: 'levels-fixture', type: 'module' }),
  )
  fs.mkdirSync(root + '/node_modules')
  fs.symlinkSync(compilerDir, root + '/node_modules/typescript', 'dir')
  const named = (list = []) =>
    Object.fromEntries(list.map((name) => ['@molecule/' + name, '1.0.0']))
  for (const [name, edges] of Object.entries(graph)) {
    fs.mkdirSync(root + '/packages/' + name, { recursive: true })
    fs.writeFileSync(
      root + '/packages/' + name + '/package.json',
      JSON.stringify({
        name: '@molecule/' + name,
        version: '1.0.0',
        scripts: { build: 'tsc' },
        dependencies: named(edges.dependencies),
        peerDependencies: { ...named(edges.peerDependencies), ...named(edges.optionalPeers) },
        peerDependenciesMeta: Object.fromEntries(
          (edges.optionalPeers ?? []).map((name) => ['@molecule/' + name, { optional: true }]),
        ),
        devDependencies: named(edges.devDependencies),
      }),
    )
  }
  return root
}

/**
 * Run the build script's level assignment without building.
 *
 * @param root - The tree to read.
 * @param script - The build script to run.
 * @returns The process result and the parsed levels when it printed them.
 */
function printLevels(root, script = 'scripts/build.js') {
  const result = spawnSync(process.execPath, [script, '--print-levels'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 64e6,
  })
  let levels = null
  try {
    levels = JSON.parse(result.stdout.trim().split('\n').at(-1))
  } catch (_error) {
    // No JSON line: the assertions below report the exit status and output instead.
  }
  return { ...result, levels }
}

it(
  'orders a consumer after its peer when test-only devDependencies close a cycle',
  () => {
    // The 2026-11-18 shape: router -dev-> query -peer-> react -dev-> defaults -peer-> router.
    const root = fixture({
      i18n: {},
      router: { peerDependencies: ['i18n'], devDependencies: ['query', 'i18n'] },
      query: { peerDependencies: ['react'], devDependencies: ['react'] },
      react: { peerDependencies: ['i18n'], devDependencies: ['defaults'] },
      defaults: { peerDependencies: ['router'], devDependencies: ['router'] },
    })
    const { status, stderr, levels } = printLevels(root)
    expect(stderr).toBe('')
    expect(status).toBe(0)
    const at = (name) => levels['@molecule/' + name]
    expect(at('defaults')).toBeGreaterThan(at('router'))
    expect(at('query')).toBeGreaterThan(at('react'))
    expect(at('router')).toBeGreaterThan(at('i18n'))
    expect(at('react')).toBeGreaterThan(at('i18n'))
  },
  FIXTURE_TIMEOUT_MS,
)

it(
  'keeps a devDependency edge that closes no cycle (types a source may import)',
  () => {
    const root = fixture({ base: {}, consumer: { devDependencies: ['base'] } })
    const { status, levels } = printLevels(root)
    expect(status).toBe(0)
    expect(levels['@molecule/consumer']).toBeGreaterThan(levels['@molecule/base'])
  },
  FIXTURE_TIMEOUT_MS,
)

it(
  'retains a peer subpath imported by compiled source and drops the test-only return edge',
  () => {
    const root = fixture({
      drag: { optionalPeers: ['elements'], devDependencies: ['elements'] },
      elements: { peerDependencies: ['binding'] },
      binding: { devDependencies: ['drag'] },
    })
    fs.mkdirSync(path.join(root, 'packages/drag/src'))
    fs.writeFileSync(
      path.join(root, 'packages/drag/src/drag.ts'),
      "import type { Node } from '@molecule/elements/elements'\nexport type Children = Node\n",
    )
    fs.mkdirSync(path.join(root, 'packages/binding/src/__tests__'), { recursive: true })
    fs.writeFileSync(
      path.join(root, 'packages/binding/src/__tests__/drag.test.ts'),
      "import { drag } from '@molecule/drag'\nvoid drag\n",
    )
    const { status, stderr, levels } = printLevels(root)
    expect(stderr).toBe('')
    expect(status).toBe(0)
    expect(levels['@molecule/drag']).toBeGreaterThan(levels['@molecule/elements'])
  },
  FIXTURE_TIMEOUT_MS,
)

it(
  "orders a binding before its routing bond when the binding's optional peer on it closes a cycle",
  () => {
    // A binding refuses an old routing bond at install through an optional peer; the bond imports the binding.
    const root = fixture({
      routing: {},
      binding: { peerDependencies: ['routing'], optionalPeers: ['bond'] },
      bond: { peerDependencies: ['binding', 'routing'] },
    })
    const { status, stderr, levels } = printLevels(root)
    expect(stderr).toBe('')
    expect(status).toBe(0)
    expect(levels['@molecule/bond']).toBeGreaterThan(levels['@molecule/binding'])
    expect(levels['@molecule/binding']).toBeGreaterThan(levels['@molecule/routing'])
  },
  FIXTURE_TIMEOUT_MS,
)

it(
  'keeps an optional peer edge that closes no cycle',
  () => {
    const root = fixture({ addon: {}, host: { optionalPeers: ['addon'] } })
    const { status, levels } = printLevels(root)
    expect(status).toBe(0)
    expect(levels['@molecule/host']).toBeGreaterThan(levels['@molecule/addon'])
  },
  FIXTURE_TIMEOUT_MS,
)

it(
  'refuses, naming the cycle, when dependencies or peers alone form one',
  () => {
    const root = fixture({
      left: { dependencies: ['right'] },
      right: { peerDependencies: ['left'] },
    })
    const { status, stderr, levels } = printLevels(root)
    expect(levels).toBeNull()
    expect(status).toBe(1)
    expect(stderr).toMatch(/dependency cycle through dependencies\/peerDependencies/)
    expect(stderr).toMatch(
      /@molecule\/(left -> @molecule\/right -> @molecule\/left|right -> @molecule\/left -> @molecule\/right)/,
    )
  },
  FIXTURE_TIMEOUT_MS,
)

it(
  'builds every package of this repo after each package it depends on or peers with',
  () => {
    const { status, stderr, levels } = printLevels(
      repoRoot,
      path.join(repoRoot, 'scripts/build.js'),
    )
    expect(stderr).toBe('')
    expect(status).toBe(0)
    const manifests = new Map()
    const visit = (dir, depth) => {
      if (depth > 6) return
      let entries
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
      } catch (_error) {
        // A directory removed by a concurrent clean has nothing left to compare.
        return
      }
      if (entries.some((e) => e.name === 'package.json')) {
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
          if (pkg.name in levels) manifests.set(pkg.name, pkg)
        } catch (_error) {
          // Not a parseable manifest: build.js does not treat it as a package either.
        }
      }
      for (const entry of entries)
        if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          !['node_modules', 'dist'].includes(entry.name)
        )
          visit(path.join(dir, entry.name), depth + 1)
    }
    visit(path.join(repoRoot, 'packages'), 0)
    const edges = (pkg) => Object.keys({ ...pkg?.dependencies, ...pkg?.peerDependencies })
    const wrong = []
    for (const [name, pkg] of manifests)
      for (const dep of edges(pkg))
        if (dep in levels && dep !== name && !(levels[name] > levels[dep]))
          // An optional peer that peers back (a binding's routing bond) is the edge a cycle
          // drops: the other side builds after this package.
          if (!(
            pkg.peerDependenciesMeta?.[dep]?.optional && edges(manifests.get(dep)).includes(name)
          ))
            wrong.push(`${name} (${levels[name]}) -> ${dep} (${levels[dep]})`)
    expect(wrong).toEqual([])
  },
  REPO_TIMEOUT_MS,
)
