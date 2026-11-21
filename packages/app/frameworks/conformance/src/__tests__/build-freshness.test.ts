/**
 * The conformance runs' refusal of a dist/ older than its src/: the rule is `scripts/build.js`'s,
 * a stale dependency is found through the package that needs it, and what has no build to compare
 * (an installed copy, a package without a build script, the package under test) is not refused.
 *
 * @module
 */

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  assertBuiltFromSource,
  buildStaleness,
  packageRootOf,
  staleBuilds,
} from '../build-freshness.js'

let root = ''

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'build-freshness-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const BUILT = new Date('2026-11-19T06:00:00Z')
const EARLIER = new Date('2026-11-19T05:00:00Z')
const LATER = new Date('2026-11-19T07:00:00Z')

/**
 * Writes a file with a given modification time.
 *
 * @param path - The file.
 * @param at - Its mtime.
 */
const write = (path: string, at: Date): void => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, '')
  utimesSync(path, at, at)
}

interface FixturePackage {
  /** The package name (`@molecule/<short>`). */
  name: string
  /** When its source last changed. */
  source: Date
  /** When it was built, or null for never. */
  built: Date | null
  /** Its runtime `@molecule/*` dependencies. */
  peers?: string[]
  /** Whether it has a build script (default true). */
  buildScript?: boolean
  /** Installed as a real directory inside node_modules, not linked from the workspace. */
  installed?: boolean
}

/**
 * Lays out workspace packages under `packages/` and links each from `node_modules/`, as npm
 * workspaces do.
 *
 * @param packages - The packages.
 */
const workspace = (packages: FixturePackage[]): void => {
  for (const pkg of packages) {
    const short = pkg.name.slice('@molecule/'.length)
    const dir = pkg.installed
      ? join(root, 'node_modules', '@molecule', short)
      : join(root, 'packages', short)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: pkg.name,
        ...(pkg.buildScript === false ? {} : { scripts: { build: 'tsc' } }),
        peerDependencies: Object.fromEntries((pkg.peers ?? []).map((p) => [p, '^1.0.0'])),
      }),
    )
    write(join(dir, 'src', 'index.ts'), pkg.source)
    write(join(dir, 'src', '__tests__', 'index.test.ts'), LATER)
    if (pkg.built) write(join(dir, 'dist', 'index.js'), pkg.built)
    if (!pkg.installed) {
      mkdirSync(join(root, 'node_modules', '@molecule'), { recursive: true })
      symlinkSync(dir, join(root, 'node_modules', '@molecule', short))
    }
  }
}

describe('build freshness', () => {
  it('accepts a dist built after every source change, test files ignored', () => {
    workspace([{ name: '@molecule/a', source: EARLIER, built: BUILT }])
    expect(staleBuilds(['@molecule/a'], root)).toEqual([])
  })

  it('refuses a dist older than a source change (OLD MUSTFAIL: recorded the old build)', () => {
    workspace([{ name: '@molecule/a', source: LATER, built: BUILT }])
    expect(staleBuilds(['@molecule/a'], root)).toEqual([
      {
        name: '@molecule/a',
        dir: join(root, 'packages', 'a'),
        reason: 'src/ changed after its last build',
      },
    ])
  })

  it('finds a stale runtime dependency through the package that needs it', () => {
    workspace([
      { name: '@molecule/a', source: EARLIER, built: BUILT, peers: ['@molecule/b'] },
      { name: '@molecule/b', source: LATER, built: BUILT },
    ])
    expect(staleBuilds(['@molecule/a'], root).map((s) => s.name)).toEqual(['@molecule/b'])
  })

  it('refuses a package never built and one whose last build failed', () => {
    workspace([
      { name: '@molecule/a', source: EARLIER, built: null },
      { name: '@molecule/b', source: EARLIER, built: BUILT },
    ])
    write(join(root, 'packages', 'b', 'dist', '.build-failed'), LATER)
    expect(buildStaleness(join(root, 'packages', 'a'))).toBe('never built')
    expect(buildStaleness(join(root, 'packages', 'b'))).toBe('its last build failed')
  })

  it('counterexample: skips a package without a build script but checks what it needs', () => {
    workspace([
      {
        name: '@molecule/kit',
        source: LATER,
        built: null,
        buildScript: false,
        peers: ['@molecule/b'],
      },
      { name: '@molecule/b', source: LATER, built: BUILT },
    ])
    expect(staleBuilds(['@molecule/kit'], root).map((s) => s.name)).toEqual(['@molecule/b'])
  })

  it('counterexample: skips an installed copy and the package under test', () => {
    workspace([
      { name: '@molecule/published', source: LATER, built: BUILT, installed: true },
      { name: '@molecule/own', source: LATER, built: BUILT },
      { name: '@molecule/missing-from-disk', source: EARLIER, built: BUILT },
    ])
    expect(
      staleBuilds(['@molecule/published', '@molecule/own', '@molecule/unknown'], root, [
        '@molecule/own',
      ]),
    ).toEqual([])
  })

  it('names every stale package and the command that rebuilds them', () => {
    workspace([
      { name: '@molecule/a', source: LATER, built: BUILT, peers: ['@molecule/b'] },
      { name: '@molecule/b', source: LATER, built: null },
    ])
    expect(() => assertBuiltFromSource(['@molecule/a'], root)).toThrow(
      /@molecule\/a \(src\/ changed after its last build\)\n {2}@molecule\/b \(never built\)\nRebuild them from the molecule root: node scripts\/build\.js --only=@molecule\/a,@molecule\/b/,
    )
  })

  it('finds the package a test file belongs to', () => {
    workspace([{ name: '@molecule/a', source: EARLIER, built: BUILT }])
    expect(packageRootOf(join(root, 'packages', 'a', 'src', '__tests__', 'index.test.ts'))).toBe(
      join(root, 'packages', 'a'),
    )
  })
})
