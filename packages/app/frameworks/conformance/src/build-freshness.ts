/**
 * Whether the packages a conformance run imports were built from their current source.
 *
 * A run imports each package's `dist/`, not its `src/`. In a workspace, a `src/` edit reaches a run
 * only through a rebuild, so a run against an older build records or compares the behaviour of
 * code that no longer exists, and passes (2026-11-19: 53 packages' builds were older than their
 * sources; the ChatPanel goldens recorded that morning held the ids of a ChatPanel replaced the day
 * before, and React's saved-tag list had never had its list attributes recorded). The rule is
 * `scripts/build.js`'s own, so a package this refuses is one `node scripts/build.js` rebuilds.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Left in `dist/` by a build that failed (`scripts/build.js`'s `FAILED_MARKER`). */
const FAILED_MARKER = '.build-failed'

/** A workspace package whose build is older than its source, and why. */
export interface StaleBuild {
  /** The package name. */
  name: string
  /** The package directory. */
  dir: string
  /** What makes the build stale. */
  reason: string
}

/**
 * The newest modification time of any file under a directory, skipping `node_modules` and
 * `__tests__` (`scripts/build.js`'s `newestMtime`).
 *
 * @param dir - The directory.
 * @returns The newest mtime in ms, or 0 when the directory does not exist.
 */
function newestMtime(dir: string): number {
  if (!existsSync(dir)) return 0
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue
    const full = join(dir, entry.name)
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(full) : statSync(full).mtimeMs)
  }
  return newest
}

/**
 * Why a package's `dist/` is not a build of its current `src/` (`scripts/build.js`'s
 * `isUpToDate`), or null when it is.
 *
 * @param dir - The package directory.
 * @returns The reason, or null.
 */
export function buildStaleness(dir: string): string | null {
  const dist = join(dir, 'dist')
  if (!existsSync(dist)) return 'never built'
  if (existsSync(join(dist, FAILED_MARKER))) return 'its last build failed'
  const built = newestMtime(dist)
  if (built === 0) return 'never built'
  const tsconfig = join(dir, 'tsconfig.json')
  const source = Math.max(
    newestMtime(join(dir, 'src')),
    existsSync(tsconfig) ? statSync(tsconfig).mtimeMs : 0,
  )
  return built > source ? null : 'src/ changed after its last build'
}

/**
 * The directory Node resolves a package name to from a directory, symlinks followed.
 *
 * @param name - The package name.
 * @param from - The directory to resolve from.
 * @returns The package directory, or null when no `node_modules` above `from` holds it.
 */
function packageDir(name: string, from: string): string | null {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate)
    if (dirname(dir) === dir) return null
  }
}

/**
 * Whether a manifest has a build script (`scripts/build.js` builds only those).
 *
 * @param manifest - The parsed package.json.
 * @returns True when `scripts.build` is a string.
 */
function hasBuildScript(manifest: Record<string, unknown>): boolean {
  const scripts = manifest.scripts
  return typeof scripts === 'object' && scripts !== null && 'build' in scripts
}

/**
 * The `@molecule/*` packages a manifest needs at runtime: dependencies, peers and optionals.
 *
 * @param manifest - The parsed package.json.
 * @returns The package names.
 */
function runtimeMoleculeDeps(manifest: Record<string, unknown>): string[] {
  const names = new Set<string>()
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = manifest[field]
    if (typeof deps !== 'object' || deps === null) continue
    for (const name of Object.keys(deps)) if (name.startsWith('@molecule/')) names.add(name)
  }
  return [...names]
}

/**
 * The workspace packages, among `roots` and everything they need at runtime, whose build is older
 * than their source. A package installed from a registry (its real path inside a `node_modules`)
 * or without a `src/` or a build script has no build to compare and is skipped (what it needs is
 * still checked), so a run against published packages is never refused.
 *
 * @param roots - The package names the run imports.
 * @param from - The directory the run resolves them from.
 * @param exclude - Packages the run imports from source (the package under test), never checked.
 * @returns The stale builds, in the order they were reached.
 */
export function staleBuilds(
  roots: readonly string[],
  from: string,
  exclude: readonly string[] = [],
): StaleBuild[] {
  const stale: StaleBuild[] = []
  const seen = new Set<string>(exclude)
  const queue = roots.map((name) => ({ name, from }))
  for (let item = queue.shift(); item; item = queue.shift()) {
    if (seen.has(item.name)) continue
    seen.add(item.name)
    const dir = packageDir(item.name, item.from)
    if (!dir || dir.includes(`${sep}node_modules${sep}`)) continue
    const manifest: Record<string, unknown> = JSON.parse(
      readFileSync(join(dir, 'package.json'), 'utf8'),
    )
    // A package without a build script (this kit) is imported from its source; what it imports
    // may still be built.
    if (hasBuildScript(manifest) && existsSync(join(dir, 'src'))) {
      const reason = buildStaleness(dir)
      if (reason) stale.push({ name: item.name, dir, reason })
    }
    for (const name of runtimeMoleculeDeps(manifest)) queue.push({ name, from: dir })
  }
  return stale
}

/**
 * Refuses a run whose imported packages, or what they need at runtime, were not built from their
 * current source, naming the command that rebuilds them.
 *
 * @param roots - The package names the run imports.
 * @param from - The directory the run resolves them from.
 * @param exclude - Packages the run imports from source (the package under test), never checked.
 */
export function assertBuiltFromSource(
  roots: readonly string[],
  from: string,
  exclude: readonly string[] = [],
): void {
  const stale = staleBuilds(roots, from, exclude)
  if (stale.length === 0) return
  throw new Error(
    `framework-conformance: this run imports ${stale.length} package(s) whose dist/ is not a build of their current src/, so it would test code that no longer exists:\n${stale
      .map((build) => `  ${build.name} (${build.reason})`)
      .join(
        '\n',
      )}\nRebuild them from the molecule root: node scripts/build.js --only=${stale.map((build) => build.name).join(',')}`,
  )
}

/**
 * The nearest directory at or above a file that holds a package.json.
 *
 * @param file - A file or directory path.
 * @returns The package directory, or null at the filesystem root.
 */
export function packageRootOf(file: string): string | null {
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) return dir
    if (dirname(dir) === dir) return null
  }
}

/** This kit's package directory. */
const KIT_DIR = packageRootOf(fileURLToPath(import.meta.url))

/**
 * Whether a manifest names a package in any dependency field, devDependencies included.
 *
 * @param manifest - A parsed package.json.
 * @param name - The package name.
 * @returns True when the manifest declares it.
 */
function declares(manifest: Record<string, unknown>, name: string): boolean {
  return ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'].some(
    (field) => {
      const deps = manifest[field]
      return typeof deps === 'object' && deps !== null && name in deps
    },
  )
}

/**
 * The packages a framework package's conformance run imports from a build: the package's runtime
 * `@molecule/*` dependencies, this kit, and the framework's binding and UI kit where the package
 * declares them (in any field: a port declares them as peers, the kit's own React runs as
 * devDependencies). A binding's run never loads the framework's UI kit, and the build of a
 * package's dependencies leaves an undeclared one out, so only a declared one is checked
 * (2026-11-22: the release refused every app-solid and app-svelte run on an app-ui-solid and
 * app-ui-svelte it had correctly not built). With no package known, both are checked.
 *
 * @param framework - The adapter's framework name (`vue`, `solid`, `svelte`, `angular`, `react`).
 * @param own - The manifest of the package under test, or null when the test file is unknown.
 * @param kitName - This kit's package name.
 * @returns The package names the run imports from a build.
 */
export function conformanceRunRoots(
  framework: string,
  own: Record<string, unknown> | null,
  kitName: string,
): string[] {
  const frameworkPackages = [`@molecule/app-${framework}`, `@molecule/app-ui-${framework}`]
  return [
    ...(own ? runtimeMoleculeDeps(own) : []),
    kitName,
    ...frameworkPackages.filter((name) => !own || declares(own, name)),
  ]
}

/**
 * Refuses a framework package's conformance run (a port, a UI kit, a binding) when what it
 * imports from a build is stale: the packages {@link conformanceRunRoots} names and what they
 * need at runtime. The package under test is imported from its source, so its own build is never
 * checked.
 *
 * @param framework - The adapter's framework name (`vue`, `solid`, `svelte`, `angular`, `react`).
 * @param testFile - The running test file (vitest's `expect.getState().testPath`), when known.
 */
export function assertConformanceRunBuilt(framework: string, testFile: string | undefined): void {
  if (!KIT_DIR) return
  const kit: Record<string, unknown> = JSON.parse(
    readFileSync(join(KIT_DIR, 'package.json'), 'utf8'),
  )
  const ownDir = testFile ? packageRootOf(testFile) : null
  const own: Record<string, unknown> | null = ownDir
    ? JSON.parse(readFileSync(join(ownDir, 'package.json'), 'utf8'))
    : null
  const ownName = typeof own?.name === 'string' ? own.name : null
  const roots = conformanceRunRoots(framework, own, String(kit.name))
  assertBuiltFromSource(roots, ownDir ?? KIT_DIR, ownName ? [ownName] : [])
}
