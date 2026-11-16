#!/usr/bin/env node
/**
 * Every name a package imports from a `@molecule/*` peer must exist in the LOWEST
 * PUBLISHED version that peer's range allows.
 *
 * WHY THIS GATE EXISTS: npm workspaces link every package to its newest local
 * source, so a bond can import an export its core gained in this release and still
 * build, test and lint green here while declaring `"@molecule/app-routing": "^1.0.1"`.
 * A user who installs the new bond next to an older core that the range still
 * allows then gets a missing export at build or load time. (2026-11-13: six routing
 * bonds imported `createHistoryRouter` and five framework bindings imported
 * `resolveListRoute`, all new since app-routing 1.0.5, under `^1.0.1`.)
 *
 * Rules, per publishable package under packages/:
 * - Reads the named imports and `export { … } from` names of every bare
 *   `@molecule/*` specifier in its shipped `src/**` (`.ts`/`.tsx`/`.mts`/`.cts`, and
 *   the `<script>` blocks of `.svelte`/`.vue` files), skipping tests.
 * - For each `@molecule/*` peer it imports names from, the floor is the lowest
 *   version npm publishes that the range allows: what a user's install can resolve.
 *   It is NOT the range's minimum: `^1.1.0` over published 1.0.5 and 1.2.0 installs
 *   1.2.0, so 1.2.0 is checked (2026-11-14: four framework bindings imported
 *   `followRouterLink` under `^1.1.0`; 1.1.0 was never published, the old rule
 *   skipped it, and 1.2.0 lacks the name). A range no published version satisfies
 *   is fine (the first version a user can install is released from this source),
 *   and so is a floor above the workspace version. A floor EQUAL to the workspace
 *   version is checked like any other: before a release versions the peer, its
 *   workspace version is the one npm already serves, and that tarball lacks the
 *   names added since. Without this, a new import under `^<current>` passed every
 *   check until the release's version commit moved the peer on, and only then
 *   failed, forcing a second pass.
 * - A ClassMap member is a name too: each `cm.<member>` a shipped file reads (also
 *   `cm().<member>` and `cm.value.<member>`), where `cm` is bound to `getClassMap()`
 *   directly or through a reactive wrapper (`$derived(getClassMap())`), typed
 *   `UIClassMap`, or a method returning one (an Angular `cm(): UIClassMap`), in script,
 *   JSX, a Svelte component's markup or an Angular template, counts as
 *   `UIClassMap.<member>` from the peer that file imports `getClassMap`/`UIClassMap`
 *   from, when the workspace's own `UIClassMap` has that member. The floor's
 *   `UIClassMap` must declare it: an install that resolves an older `@molecule/app-ui`
 *   reads `undefined` for a class, or throws calling a member function (2026-11-15: 72
 *   published packages read members such as `touchTargetCompact`, `iconGlyphFont` and
 *   `accentCard` under `^1.0.1`, whose 1.0.1 has none of them).
 * - The floor's published type declarations must export every imported name.
 *   Each peer's version list is read from the registry on every run (new versions
 *   appear); a published version never changes, so its tarball is downloaded once
 *   and its export list kept, in a per-user cache shared by every checkout:
 *   `$MOL_PEER_FLOORS_CACHE`, else `$XDG_CACHE_HOME/molecule-check-peer-floors`, else
 *   `~/.cache/molecule-check-peer-floors`. It stays out of the checkout because the
 *   release gate runs this check in an exported tree whose node_modules is linked in
 *   later, and a real directory there would block that link.
 *
 * Fix an offender by raising that peer's floor to the first version that has every
 * imported name, which the fix names: the workspace version when npm does not serve
 * it yet or serves it with every name, else (npm serves it without them, so a
 * pending changeset will release them) the next minor; give that peer a changeset too.
 *
 * Usage:
 *   node scripts/check-peer-floors.mjs            # check (exit 1 on any offender)
 *   node scripts/check-peer-floors.mjs --json     # machine-readable report
 */
import { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import console from 'node:console'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, extname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import semver from 'semver'
import ts from 'typescript'

import { isTestFile, packageNameOf } from './check-undeclared-imports.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TS_EXT = new Set(['.ts', '.tsx', '.mts', '.cts'])
const SFC_EXT = new Set(['.svelte', '.vue'])
const CACHE =
  process.env.MOL_PEER_FLOORS_CACHE ??
  join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'molecule-check-peer-floors')
// Bump when the way export names are read changes, so stored lists are recomputed.
// v2: the members of an exported `UIClassMap` are names too (`UIClassMap.<member>`).
const EXPORTS_FILE = 'exports-v2.json'
/** The ClassMap interface whose members count as names (see {@link classMapReads}). */
const CLASS_MAP = 'UIClassMap'
/**
 * The npm registry base URL, read on each request.
 *
 * @returns `$npm_config_registry` without a trailing slash, else the public registry.
 */
const registry = () =>
  (process.env.npm_config_registry ?? 'https://registry.npmjs.org').replace(/\/$/, '')

/** Stands in for a version not read yet: it lacks nothing, so it reports no gap. */
const EVERY_NAME = { has: () => true }

/**
 * The TypeScript source of a file: the file itself, or the `<script>` blocks of a
 * Svelte or Vue component.
 *
 * @param text - File contents.
 * @param fileName - File name (decides the kind).
 * @returns The script text to parse.
 */
export function scriptText(text, fileName) {
  if (!SFC_EXT.has(extname(fileName))) return text
  return [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
}

/**
 * The names a source file imports or re-exports from each bare specifier.
 * Namespace imports and dynamic imports name nothing and are skipped.
 *
 * @param text - Script text (see {@link scriptText}).
 * @param fileName - File name (decides TSX parsing).
 * @returns Specifier → imported names.
 */
export function namedImports(text, fileName) {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind)
  const found = new Map()
  const add = (specifier, name) => {
    const names = found.get(specifier) ?? new Set()
    names.add(name)
    found.set(specifier, names)
  }
  for (const node of sf.statements) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause
      if (!clause) continue
      if (clause.name) add(node.moduleSpecifier.text, 'default')
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements)
          add(node.moduleSpecifier.text, (el.propertyName ?? el.name).text)
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const el of node.exportClause.elements)
        add(node.moduleSpecifier.text, (el.propertyName ?? el.name).text)
    }
  }
  return found
}

/**
 * The `@molecule/*` peers a package imports names from, which the check reads.
 *
 * @param pkg - The parsed package.json.
 * @param imports - Peer package name → imported name → files importing it.
 * @param workspaceVersions - Package name → version in this workspace.
 * @returns Each checked peer with its range, workspace version and imported names.
 */
function checkedPeers(pkg, imports, workspaceVersions) {
  const peers = []
  for (const [peer, range] of Object.entries(pkg.peerDependencies ?? {})) {
    if (!peer.startsWith('@molecule/')) continue
    const names = imports.get(peer)
    const current = workspaceVersions.get(peer)
    if (names?.size && current) peers.push({ peer, range, current, names })
  }
  return peers
}

/**
 * Find the imported names a package's peer floors do not export.
 *
 * @param pkg - The parsed package.json.
 * @param imports - Peer package name → imported name → files importing it.
 * @param workspaceVersions - Package name → version in this workspace.
 * @param exportsAt - `(name, version)` → the exported names of that published version.
 * @param publishedVersions - Package name → every version npm publishes (empty or
 *   absent when it publishes none).
 * @returns One entry per peer with missing names.
 */
export function findFloorGaps(pkg, imports, workspaceVersions, exportsAt, publishedVersions) {
  const gaps = []
  for (const { peer, range, current, names } of checkedPeers(pkg, imports, workspaceVersions)) {
    const published = publishedVersions.get(peer) ?? []
    const floor = semver.minSatisfying(published, range)
    if (!floor || semver.gt(floor, current)) continue
    const missing = [...names.keys()].filter((name) => !exportsAt(peer, floor).has(name)).sort()
    if (missing.length === 0) continue
    // The smallest upgrade that has every name: the lowest version npm serves above the
    // floor, in the workspace version's major and not above it, that exports every
    // imported name (2026-11-16: app-ui 1.3.11 already had the ClassMap members 81
    // packages read, but the fix named the unpublished 1.4.0 and pushed each user one
    // minor further than needed). Every candidate is read, so one pass of scanFleet
    // fetches them together. When none has them all, a workspace version npm does not
    // serve yet releases them as it is; one npm serves without them ships them in the
    // next version, a minor for added exports.
    const all = [...names.keys()]
    const candidates = published
      .filter(
        (version) =>
          !semver.prerelease(version) &&
          semver.gt(version, floor) &&
          semver.lte(version, current) &&
          semver.major(version) === semver.major(current),
      )
      .sort(semver.compare)
    const candidateExports = candidates.map((version) => exportsAt(peer, version))
    const lowest = candidates.find((_version, i) =>
      all.every((name) => candidateExports[i].has(name)),
    )
    gaps.push({
      peer,
      range,
      floor,
      fix: lowest
        ? `^${lowest}`
        : published.includes(current)
          ? `^${semver.inc(current, 'minor')}`
          : `^${current}`,
      missing: missing.map((name) => ({ name, files: [...names.get(name)].sort() })),
    })
  }
  return gaps
}

/**
 * Read every version npm publishes of each package.
 *
 * @param names - Package names.
 * @param concurrency - Requests in flight at once.
 * @returns Package name → its published versions (empty when npm has no such package).
 */
export async function fetchPublishedVersions(names, concurrency = 16) {
  const queue = [...new Set(names)]
  const versions = new Map()
  const worker = async () => {
    while (queue.length) {
      const name = queue.shift()
      const url = `${registry()}/${name.replace('/', '%2f')}`
      // The abbreviated document lists the versions without every manifest's readme.
      const response = await fetch(url, {
        headers: { accept: 'application/vnd.npm.install-v1+json' },
      })
      if (response.status === 404) {
        versions.set(name, [])
        continue
      }
      if (!response.ok)
        throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`)
      versions.set(name, Object.keys((await response.json()).versions ?? {}))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker))
  return versions
}

/**
 * The ClassMap members a source file reads, through every name the file binds to the
 * ClassMap: `cm = getClassMap()`, also through a reactive wrapper (Svelte's
 * `$derived(getClassMap())`, Vue's `computed(() => getClassMap())`) or an arrow; a
 * variable, parameter or field typed `UIClassMap`; and a method or getter returning one
 * (an Angular component's `cm(): UIClassMap`). Each is read as `<name>.<member>`,
 * `<name>().<member>` and `<name>.value.<member>`, with or without `this.`, and so is
 * `getClassMap().<member>`. The whole text is read, so a Svelte component's markup and
 * an Angular template count. A name never bound that way (CodeMirror's `cm`) reads
 * nothing.
 *
 * @param text - The file's full text.
 * @returns The member names read.
 */
export function classMapReads(text) {
  const bound = new Set()
  const call = String.raw`(?:[\w$.]+\(\s*)?(?:\(\s*\)\s*(?::\s*UIClassMap\s*)?=>\s*)?getClassMap\(\)`
  const assigned = new RegExp(String.raw`\b(\w+)\s*(?::\s*UIClassMap\b[^=,);]*)?=\s*${call}`, 'g')
  for (const m of text.matchAll(assigned)) bound.add(m[1])
  for (const m of text.matchAll(/\b(\w+)\??\s*(?:\(\s*\))?\s*:\s*UIClassMap\b/g)) bound.add(m[1])
  const reads = new Set()
  for (const name of bound) {
    const read = new RegExp(String.raw`(?<![\w$.])(?:this\.)?${name}(?:\(\)|\.value)?\.(\w+)`, 'g')
    for (const m of text.matchAll(read)) reads.add(m[1])
  }
  for (const m of text.matchAll(/getClassMap\(\)\.(\w+)/g)) reads.add(m[1])
  return reads
}

/**
 * Every name a module's type declarations export, following `export *` chains, and
 * `UIClassMap.<member>` for each member of an exported `UIClassMap` interface.
 *
 * @param typesFile - The entry `.d.ts` (or a package's `src/index.ts`).
 * @returns The exported names.
 */
export function declaredExports(typesFile) {
  const program = ts.createProgram([typesFile], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    // Export names need no type checking: skipping the default lib and @types makes
    // each program parse only the package's own declarations.
    noLib: true,
    types: [],
  })
  const checker = program.getTypeChecker()
  const sf = program.getSourceFile(typesFile)
  const symbol = sf && checker.getSymbolAtLocation(sf)
  if (!symbol) throw new Error(`${typesFile}: not a module`)
  const exported = checker.getExportsOfModule(symbol)
  const names = new Set(exported.map((s) => s.getName()))
  let classMap = exported.find((s) => s.getName() === CLASS_MAP)
  if (classMap && classMap.flags & ts.SymbolFlags.Alias)
    classMap = checker.getAliasedSymbol(classMap)
  if (classMap && classMap.flags & ts.SymbolFlags.Interface)
    for (const member of checker.getDeclaredTypeOfSymbol(classMap).getProperties())
      names.add(`${CLASS_MAP}.${member.getName()}`)
  return names
}

const exportCache = new Map()
const execFileAsync = promisify(execFile)

/**
 * The cache directory of one published version.
 *
 * @param key - `name@version`.
 * @returns The directory its tarball is extracted into.
 */
const cacheDir = (key) => join(CACHE, key.replace('/', '+'))

/**
 * Download and extract a published version into the cache, unless it is there.
 * Extraction goes to a temporary directory renamed into place, so an interrupted
 * run never leaves a half-extracted version that a later run would trust.
 *
 * Only versions the registry lists are fetched, so a missing tarball is a registry
 * fault, not an absence. A directory holding no package (an `unpublished` marker an
 * older version of this check wrote for a version npm had not published yet) is
 * fetched again: that version may be published by now.
 *
 * @param key - `name@version`.
 * @returns Resolves once the version is cached.
 */
async function fetchTarball(key) {
  const dir = cacheDir(key)
  if (existsSync(join(dir, 'package', 'package.json'))) return
  const at = key.lastIndexOf('@')
  const name = key.slice(0, at)
  const version = key.slice(at + 1)
  const url = `${registry()}/${name}/-/${name.split('/').pop()}-${version}.tgz`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`)
  const staging = `${dir}.tmp-${process.pid}`
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })
  const file = join(staging, 'package.tgz')
  writeFileSync(file, Buffer.from(await response.arrayBuffer()))
  await execFileAsync('tar', ['-xzf', file, '-C', staging])
  rmSync(file)
  rmSync(dir, { recursive: true, force: true })
  renameSync(staging, dir)
  return true
}

/**
 * Fetch many published versions, a few at a time.
 *
 * @param keys - `name@version` entries.
 * @param concurrency - Downloads in flight at once.
 * @returns Resolves when every tarball is cached.
 */
export async function prefetchTarballs(keys, concurrency = 16) {
  const queue = [...new Set(keys)]
  const worker = async () => {
    while (queue.length) await fetchTarball(queue.shift())
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker))
}

/**
 * The exported names of a published package version, from its npm tarball.
 * {@link prefetchTarballs} must have cached it.
 *
 * @param name - Package name.
 * @param version - Exact version.
 * @returns The names.
 */
export function publishedExports(name, version) {
  const key = `${name}@${version}`
  if (exportCache.has(key)) return exportCache.get(key)
  const dir = cacheDir(key)
  const pkgDir = join(dir, 'package')
  const stored = join(dir, EXPORTS_FILE)
  if (existsSync(stored)) {
    const names = new Set(JSON.parse(readFileSync(stored, 'utf8')))
    exportCache.set(key, names)
    return names
  }
  if (!existsSync(join(pkgDir, 'package.json')))
    throw new Error(`${key} is not cached: call prefetchTarballs first`)
  const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
  const root = manifest.exports?.['.']
  const types =
    (typeof root === 'object' ? root.types : undefined) ??
    manifest.types ??
    manifest.typings ??
    'index.d.ts'
  const names = declaredExports(join(pkgDir, types))
  writeFileSync(stored, JSON.stringify([...names].sort()))
  exportCache.set(key, names)
  return names
}

/**
 * Collect shipped source files under a package's src dir.
 *
 * @param dir - Directory to walk.
 * @param srcRoot - The package's src dir (for test detection).
 * @param out - Accumulator.
 * @returns Absolute file paths.
 */
function collectSources(dir, srcRoot, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const ext = extname(entry)
    if (statSync(full).isDirectory()) collectSources(full, srcRoot, out)
    else if ((TS_EXT.has(ext) || SFC_EXT.has(ext)) && !isTestFile(relative(srcRoot, full)))
      out.push(full)
  }
  return out
}

/**
 * Find every package directory (one holding a package.json and a src dir).
 *
 * @param dir - Directory to walk.
 * @param out - Accumulator.
 * @returns Package directories.
 */
function findPackages(dir, out = []) {
  if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'src'))) {
    out.push(dir)
    return out
  }
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) findPackages(full, out)
  }
  return out
}

/**
 * Read every publishable package and the names it imports from its `@molecule/*` peers.
 *
 * @param root - The monorepo root (its `packages/` is scanned).
 * @returns The packages with their imports, and every workspace version by name.
 */
function readFleet(root) {
  const manifests = findPackages(join(root, 'packages')).map((dir) => ({
    dir,
    pkg: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')),
  }))
  const workspaceVersions = new Map(manifests.map(({ pkg }) => [pkg.name, pkg.version]))
  const dirOf = new Map(manifests.map(({ dir, pkg }) => [pkg.name, dir]))
  // The ClassMap members each workspace package's own source declares, read once.
  const localMembers = new Map()
  const classMapMembersOf = (name) => {
    if (!localMembers.has(name)) {
      const entry = dirOf.has(name) ? join(dirOf.get(name), 'src', 'index.ts') : ''
      const members = existsSync(entry)
        ? [...declaredExports(entry)].filter((n) => n.startsWith(`${CLASS_MAP}.`))
        : []
      localMembers.set(name, new Set(members))
    }
    return localMembers.get(name)
  }
  const packages = []
  for (const { dir, pkg } of manifests) {
    if (pkg.private) continue
    const peers = Object.keys(pkg.peerDependencies ?? {}).filter((n) => n.startsWith('@molecule/'))
    if (peers.length === 0) continue
    const srcRoot = join(dir, 'src')
    const imports = new Map()
    const use = (specifier, name, rel) => {
      const byName = imports.get(specifier) ?? new Map()
      byName.set(name, (byName.get(name) ?? new Set()).add(rel))
      imports.set(specifier, byName)
    }
    for (const file of collectSources(srcRoot, srcRoot)) {
      const rel = relative(root, file)
      const text = readFileSync(file, 'utf8')
      let classMapPeer
      for (const [specifier, names] of namedImports(scriptText(text, file), file)) {
        // Subpath imports name a module of their own; only the root entry is checked.
        if (specifier !== packageNameOf(specifier) || !peers.includes(specifier)) continue
        for (const name of names) use(specifier, name, rel)
        if (names.has('getClassMap') || names.has(CLASS_MAP)) classMapPeer = specifier
      }
      if (!classMapPeer) continue
      const members = classMapMembersOf(classMapPeer)
      for (const member of classMapReads(text))
        if (members.has(`${CLASS_MAP}.${member}`)) use(classMapPeer, `${CLASS_MAP}.${member}`, rel)
    }
    packages.push({ dir, pkg, imports })
  }
  return { packages, workspaceVersions }
}

/**
 * Scan the whole fleet.
 *
 * @param root - The monorepo root (its `packages/` is scanned).
 * @param deps - Injected npm access: `versionsOf` (see {@link fetchPublishedVersions}),
 *   `exportsAt` (see {@link findFloorGaps}) and `prefetch`, which receives each
 *   `name@version` before it is read.
 * @returns One row per package with a gap.
 */
export async function scanFleet(
  root = ROOT,
  {
    versionsOf = fetchPublishedVersions,
    exportsAt = publishedExports,
    prefetch = prefetchTarballs,
  } = {},
) {
  const { packages, workspaceVersions } = readFleet(root)
  const publishedVersions = await versionsOf([
    ...new Set(
      packages.flatMap(({ pkg, imports }) =>
        checkedPeers(pkg, imports, workspaceVersions).map(({ peer }) => peer),
      ),
    ),
  ])
  // Each pass reads the versions fetched so far and names the ones it still needs (a
  // floor; then, for a gap, the workspace version that decides the fix), which then
  // download in parallel. A pass that needs nothing new is the answer.
  const fetched = new Set()
  for (;;) {
    const wanted = new Set()
    const read = (name, version) => {
      const key = `${name}@${version}`
      if (fetched.has(key)) return exportsAt(name, version)
      wanted.add(key)
      return EVERY_NAME
    }
    const rows = []
    for (const { dir, pkg, imports } of packages) {
      const gaps = findFloorGaps(pkg, imports, workspaceVersions, read, publishedVersions)
      if (gaps.length) rows.push({ package: pkg.name, dir: relative(root, dir), gaps })
    }
    if (wanted.size === 0) return rows
    await prefetch([...wanted])
    for (const key of wanted) fetched.add(key)
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const rows = await scanFleet()
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2))
  } else if (rows.length === 0) {
    console.log('✓ every @molecule peer floor exports the names its dependents import')
  } else {
    for (const row of rows) {
      for (const gap of row.gaps) {
        const names = gap.missing.map((m) => m.name).join(', ')
        const files = [...new Set(gap.missing.flatMap((m) => m.files))].join(', ')
        console.error(
          `✗ ${row.package} uses ${names} from ${gap.peer}, which ${gap.peer}@${gap.floor} ` +
            `(the floor of "${gap.range}") does not declare — raise it to "${gap.fix}" in ` +
            `${row.dir}/package.json peerDependencies (${files})`,
        )
      }
    }
  }
  if (rows.length > 0) process.exitCode = 1
}
