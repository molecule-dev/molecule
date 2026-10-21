/**
 * A PRODUCTION install that omits this package's optional peers must still be able to IMPORT it.
 *
 * `@molecule/api-payments` (and the other optional peers) are declared
 * `peerDependenciesMeta.<name>.optional: true` precisely so an app that takes no payments does
 * not install the core. A static `import … from '@molecule/api-payments'` at the top of a
 * handler contradicts that: the barrel exports every handler, so Node evaluates the import while
 * loading this package, and the production closure (which installs no optional peer) dies at
 * BOOT with `ERR_MODULE_NOT_FOUND … imported from …/dist/handlers/updatePlan.js`. That is what
 * happened twice on 2026-10-21 (xr-flash-m354): two deploys each waited ~70 s for a health
 * check that could never pass, while the dev workspace hoisted the package and hid the gap.
 *
 * The workspace cannot show this class of bug — its root `node_modules` resolves every hoisted
 * `@molecule/*`, so every dev-run import succeeds. So this test builds the REAL production
 * resolution shape: a temp directory holding a copy of this package's built `dist` plus symlinks
 * for ONLY the dependencies and NON-optional peers, then imports the package in a child Node
 * process. The optional peers are absent from that tree, exactly as they are after
 * `npm install --omit=dev` (which installs no optional peer). The second test proves the premise
 * — the peer really is unresolvable there — so a fixture that silently gained the package could
 * never pass for the right reason.
 *
 * It imports the BUILT output, so `dist` must be current: the build runs before tests in CI, and
 * a stale/missing `dist` fails loudly here with the rebuild command rather than testing last
 * week's JavaScript.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/** This package's manifest — the source of the dependency/peer contract under test. */
const manifest = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8')) as {
  name: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

/** Peers the package promises may be absent from an install. */
const OPTIONAL_PEERS = new Set(
  Object.entries(manifest.peerDependenciesMeta ?? {})
    .filter(([, meta]) => meta?.optional === true)
    .map(([name]) => name),
)

/**
 * Packages a production install DOES provide: the package's own dependencies and every peer that
 * is not marked optional (npm installs non-optional peers; `--omit=dev` does not install
 * optional ones).
 */
const REQUIRED_PACKAGES = [
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}).filter((name) => !OPTIONAL_PEERS.has(name)),
].sort()

/** Fixture roots created by this file, removed once the suite finishes. */
const fixtures: string[] = []

afterAll(() => {
  for (const fixture of fixtures) rmSync(fixture, { recursive: true, force: true })
})

/**
 * Every shipped TypeScript source file of the package, as absolute paths.
 *
 * @param dir - Directory to walk.
 * @param out - Accumulator.
 * @returns The source files (tests excluded).
 */
function shippedSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') shippedSources(full, out)
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      out.push(full)
    }
  }
  return out
}

/**
 * Fail unless every `src/**\/*.ts` has a `dist` counterpart at least as new as it.
 *
 * This test imports the compiled package, so a dist built before the source proves nothing — it
 * would pass or fail on code the repo no longer has.
 */
function assertDistIsCurrent(): void {
  const stale = shippedSources(join(PACKAGE, 'src')).filter((source) => {
    const compiled = join(PACKAGE, 'dist', relative(join(PACKAGE, 'src'), source)).replace(
      /\.ts$/,
      '.js',
    )
    if (!existsSync(compiled)) return true
    return statSync(compiled).mtimeMs < statSync(source).mtimeMs
  })

  if (stale.length > 0) {
    throw new Error(
      `dist is missing or stale for ${stale.length} source file(s), e.g. ${relative(PACKAGE, stale[0])}. ` +
        'This regression imports the BUILT package — run `npm run build` in molecule/ (or `npx tsc -p .` ' +
        'in this package) first.',
    )
  }
}

/**
 * Resolve a package's directory the way Node does from this package: nearest `node_modules` first,
 * walking up the tree.
 *
 * `require.resolve('<pkg>/package.json')` is not usable here — workspace packages publish an
 * `exports` map without a `./package.json` subpath (and often no CJS entry), so the CJS resolver
 * refuses. Walking for the directory is the resolution Node's ESM loader performs anyway.
 *
 * @param name - The package name.
 * @returns Its real (symlink-free) directory.
 */
function packageDirOf(name: string): string {
  let dir = PACKAGE
  for (;;) {
    const candidate = join(dir, 'node_modules', ...name.split('/'))
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate)
    const parent = dirname(dir)
    if (parent === dir) throw new Error(`cannot find a directory for ${name} below ${PACKAGE}`)
    dir = parent
  }
}

/**
 * Build a production-shaped install of this package in a temp directory.
 *
 * @returns The fixture root (which acts as the project directory).
 */
function makeProductionFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'mol-optional-peer-'))
  fixtures.push(fixture)

  const installed = join(fixture, 'node_modules', '@molecule', 'api-resource-user')
  mkdirSync(installed, { recursive: true })
  cpSync(join(PACKAGE, 'dist'), join(installed, 'dist'), { recursive: true })
  cpSync(join(PACKAGE, 'package.json'), join(installed, 'package.json'))

  for (const name of REQUIRED_PACKAGES) {
    const target = join(fixture, 'node_modules', ...name.split('/'))
    mkdirSync(dirname(target), { recursive: true })
    // Symlinked to the real tree so the dependencies of these packages still resolve; the
    // resolution of THIS package's own imports starts at `fixture/node_modules`.
    symlinkSync(packageDirOf(name), target, 'dir')
  }

  return fixture
}

/**
 * Run a snippet as an ES module inside the fixture, in a CHILD process.
 *
 * A child is the point: this process's module cache (and the workspace's hoisted
 * `node_modules`) would answer for the fixture's files, hiding the very resolution failure under
 * test.
 *
 * @param fixture - The fixture root, used as the child's working directory.
 * @param code - ES module source to evaluate.
 * @returns Whether it exited 0, plus its stdout or stderr.
 */
function runInFixture(
  fixture: string,
  code: string,
): { ok: true; stdout: string } | { ok: false; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
      cwd: fixture,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, stdout: stdout.trim() }
  } catch (error) {
    const stderr = (error as { stderr?: string | Buffer }).stderr ?? (error as Error).message
    return { ok: false, stderr: stderr.toString() }
  }
}

describe('importing @molecule/api-resource-user without its optional peers (xr-flash-m354)', () => {
  it('keeps the payments core (and the other optional features) optional', () => {
    // The contract this test defends: these packages may be absent from an install. Dropping
    // `optional` is a different fix, and this entry is what makes the fixture meaningful.
    for (const name of [
      '@molecule/api-payments',
      '@molecule/api-entitlements',
      '@molecule/api-two-factor',
      '@molecule/api-push-notifications',
    ]) {
      expect(manifest.peerDependencies?.[name], `${name} must stay a declared peer`).toBeDefined()
      expect(OPTIONAL_PEERS.has(name), `${name} must stay optional`).toBe(true)
    }
  })

  it('boots in a production install that has none of them', () => {
    assertDistIsCurrent()
    const fixture = makeProductionFixture()

    const result = runInFixture(
      fixture,
      "await import('@molecule/api-resource-user'); console.log('imported')",
    )

    expect(result.ok ? result.stdout : result.stderr).toBe('imported')
  })

  it('has genuinely absent optional peers in that fixture', () => {
    assertDistIsCurrent()
    const fixture = makeProductionFixture()

    for (const name of OPTIONAL_PEERS) {
      if (!(name in (manifest.peerDependencies ?? {}))) continue
      const result = runInFixture(fixture, `await import('${name}')`)
      expect(result.ok, `${name} must NOT resolve in the production fixture`).toBe(false)
      if (!result.ok) expect(result.stderr).toContain('ERR_MODULE_NOT_FOUND')
    }
  })
})

describe('loading the optional payments peer', () => {
  const loader =
    "const { loadPayments } = await import('./node_modules/@molecule/api-resource-user/dist/utilities/payments.js');"

  it('answers null for real absence and shares one import promise', () => {
    assertDistIsCurrent()
    const result = runInFixture(
      makeProductionFixture(),
      `${loader} const first = loadPayments(); if (first !== loadPayments()) throw new Error('not memoized'); console.log(await first)`,
    )
    expect(result.ok ? result.stdout : result.stderr).toBe('null')
  })

  it.each([
    ["throw new Error('payments initialization failed')", 'payments initialization failed'],
    ["import '@example/missing-payment-dependency'", '@example/missing-payment-dependency'],
  ])('reports an installed but broken peer: %s', (source, message) => {
    assertDistIsCurrent()
    const fixture = makeProductionFixture()
    const peer = join(fixture, 'node_modules', '@molecule', 'api-payments')
    mkdirSync(peer, { recursive: true })
    writeFileSync(
      join(peer, 'package.json'),
      JSON.stringify({ name: '@molecule/api-payments', type: 'module', exports: './index.js' }),
    )
    writeFileSync(join(peer, 'index.js'), source)
    const result = runInFixture(fixture, `${loader} await loadPayments()`)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.stderr).toContain(message)
  })
})
