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
 * @param graph - Package suffix → declared `@molecule/*` edges by kind.
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
        peerDependencies: named(edges.peerDependencies),
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
    const wrong = []
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
          if (pkg.name in levels)
            for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }))
              if (dep in levels && dep !== pkg.name && !(levels[pkg.name] > levels[dep]))
                wrong.push(`${pkg.name} (${levels[pkg.name]}) -> ${dep} (${levels[dep]})`)
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
    expect(wrong).toEqual([])
  },
  REPO_TIMEOUT_MS,
)
