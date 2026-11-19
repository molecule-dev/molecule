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
 *   git diff --cached --name-only | node scripts/check-peer-floors.mjs --paths-from-stdin
 *                                                 # only the packages those paths belong to
 *
 * `--paths-from-stdin` is what molecule's pre-commit hook runs: a package is checked when
 * a staged path is its package.json or under its src/, and nothing reaches npm when no
 * staged path belongs to a package. (2026-11-16: a forms fix taught five framework
 * bindings to import `FormUpdateOptions`, new in app-forms 2.4.0, under `^2.2.0` and
 * `^2.3.1`; nothing ran this check until CI on the release's version commit, which failed
 * and held the whole package wave for a second CI pass.)
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
import { text } from 'node:stream/consumers'
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
 * The member {@link classMapReads} names for a computed key (`cm[variant]`): the read can be
 * any member, so the floor must declare them all.
 */
export const CLASS_MAP_EVERY_MEMBER = '*'
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
 * The name {@link namedImports} records for a star form (`export * from`, `export * as ns
 * from`, `import * as ns from`): it uses every name the entry exports, which
 * {@link readFleet} reads from the workspace's own source of that entry.
 */
export const EVERY_EXPORT = '*'

/**
 * The names a source file imports or re-exports from each bare specifier.
 *
 * A star form records {@link EVERY_EXPORT}: `export *` makes every name of the entry part of
 * this package's own exports, and a namespace import can read all of them
 * (`registerLocaleModule(locales)` does), so a floor that lacks one, or lacks the entry,
 * breaks this package (2026-11-19: `export * from '@molecule/app-routing/bond-utilities'`
 * passed under `^1.2.0`, whose versions have no such entry). A type-only namespace import
 * reads only the types it names, so it records each `ns.Name` the file references. Side-effect
 * and dynamic imports name nothing and are skipped.
 *
 * @param text - Script text (see {@link scriptText}).
 * @param fileName - File name (decides TSX parsing).
 * @returns Specifier → imported names.
 */
export function namedImports(text, fileName) {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind)
  const found = new Map()
  // `import type * as ns`: namespace name → specifier.
  const typeNamespaces = new Map()
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
      } else if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
        if (!clause.isTypeOnly) add(node.moduleSpecifier.text, EVERY_EXPORT)
        else typeNamespaces.set(clause.namedBindings.name.text, node.moduleSpecifier.text)
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements)
          add(node.moduleSpecifier.text, (el.propertyName ?? el.name).text)
      } else {
        add(node.moduleSpecifier.text, EVERY_EXPORT)
      }
    }
  }
  if (typeNamespaces.size > 0) {
    const visit = (node) => {
      if (
        ts.isQualifiedName(node) &&
        ts.isIdentifier(node.left) &&
        typeNamespaces.has(node.left.text)
      )
        add(typeNamespaces.get(node.left.text), node.right.text)
      ts.forEachChild(node, visit)
    }
    visit(sf)
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
    const current = workspaceVersions.get(peer)
    const entries = [...imports]
      .filter(([specifier, names]) => packageNameOf(specifier) === peer && names.size > 0)
      .map(([specifier, names]) => ({
        entry: entryOf(peer, specifier),
        names,
      }))
    if (entries.length && current) peers.push({ peer, range, current, entries })
  }
  return peers
}

/**
 * The `exports` map key a specifier resolves through: `.` for the package itself,
 * `./render` for `@molecule/app-react/render`.
 *
 * @param peer - The package name.
 * @param specifier - The imported specifier (the package name or one of its subpaths).
 * @returns The entry key.
 */
export const entryOf = (peer, specifier) =>
  specifier === peer ? '.' : `.${specifier.slice(peer.length)}`

/**
 * Find the imported names a package's peer floors do not export.
 *
 * A name imported from a subpath (`@molecule/app-react/render`) is checked against that
 * entry of the floor's `exports` map, not the package root: the subpath is a module of its
 * own, and a user's install resolves it from the floor like any other import (2026-11-19:
 * `useTagInput` imported `useCommittedRef`, new in app-react's `./render`, under `^4.8.0`,
 * and passed because subpath imports were skipped; 4.8.0's `./render` lacks it).
 *
 * @param pkg - The parsed package.json.
 * @param imports - Imported specifier (a peer or one of its subpaths) → imported name →
 *   files importing it.
 * @param workspaceVersions - Package name → version in this workspace.
 * @param exportsAt - `(name, version, entry)` → the names that published version exports
 *   from `entry` (`.` or a subpath key such as `./render`).
 * @param publishedVersions - Package name → every version npm publishes (empty or
 *   absent when it publishes none).
 * @returns One entry per peer with missing names; a name from a subpath carries its
 *   `entry`.
 */
export function findFloorGaps(pkg, imports, workspaceVersions, exportsAt, publishedVersions) {
  const gaps = []
  for (const { peer, range, current, entries } of checkedPeers(pkg, imports, workspaceVersions)) {
    const published = publishedVersions.get(peer) ?? []
    const floor = semver.minSatisfying(published, range)
    if (!floor || semver.gt(floor, current)) continue
    const lacks = (version) =>
      entries.flatMap(({ entry, names }) => {
        const exported = exportsAt(peer, version, entry)
        return [...names.keys()]
          .filter((name) => !exported.has(name))
          .map((name) => ({ entry, name, files: [...names.get(name)].sort() }))
      })
    const missing = lacks(floor).sort(
      (a, b) => a.entry.localeCompare(b.entry) || a.name.localeCompare(b.name),
    )
    if (missing.length === 0) continue
    // The smallest upgrade that has every name: the lowest version npm serves above the
    // floor, in the workspace version's major and not above it, that exports every
    // imported name (2026-11-16: app-ui 1.3.11 already had the ClassMap members 81
    // packages read, but the fix named the unpublished 1.4.0 and pushed each user one
    // minor further than needed). Every candidate is read, so one pass of scanFleet
    // fetches them together. When none has them all, a workspace version npm does not
    // serve yet releases them as it is; one npm serves without them ships them in the
    // next version, a minor for added exports.
    const candidates = published
      .filter(
        (version) =>
          !semver.prerelease(version) &&
          semver.gt(version, floor) &&
          semver.lte(version, current) &&
          semver.major(version) === semver.major(current),
      )
      .sort(semver.compare)
    const candidateGaps = candidates.map(lacks)
    const lowest = candidates.find((_version, i) => candidateGaps[i].length === 0)
    gaps.push({
      peer,
      range,
      floor,
      fix: lowest
        ? `^${lowest}`
        : published.includes(current)
          ? `^${semver.inc(current, 'minor')}`
          : `^${current}`,
      missing: missing.map(({ entry, name, files }) =>
        entry === '.' ? { name, files } : { name, entry, files },
      ),
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
 * `getClassMap().<member>`, and each key a destructuring takes from one of them
 * (`const { flex, textTone: tone } = cm`; a `...rest` it binds is read like `cm`). A
 * computed key (`cm[variant]`) can read any member, so it reads
 * {@link CLASS_MAP_EVERY_MEMBER}, which holds the floor to every member. The whole text
 * is read, so a Svelte component's markup and an Angular template count. A name never
 * bound that way (CodeMirror's `cm`) reads nothing.
 *
 * @param text - The file's full text.
 * @returns The member names read.
 */
export function classMapReads(text) {
  const bound = new Set()
  const call = String.raw`(?:[\w$.]+\(\s*)?(?:\(\s*\)\s*(?::\s*UIClassMap\s*)?=>\s*)?getClassMap\(\)`
  // The value must be the ClassMap itself: `x: string = getClassMap().cn(…)` binds nothing (it
  // would bind the type word `string`, and every `string[]` would then read as a computed key).
  const assigned = new RegExp(
    String.raw`\b(\w+)\s*(?::\s*UIClassMap\b[^=,);]*)?=\s*${call}(?!\s*[.[])`,
    'g',
  )
  for (const m of text.matchAll(assigned)) bound.add(m[1])
  for (const m of text.matchAll(/\b(\w+)\??\s*(?:\(\s*\))?\s*:\s*UIClassMap\b/g)) bound.add(m[1])
  const reads = new Set()
  const sources = (name) => String.raw`(?<![\w$.])(?:this\.)?${name}(?:\(\)|\.value)?`
  const readThrough = (source) => {
    for (const m of text.matchAll(new RegExp(String.raw`${source}\.(\w+)`, 'g'))) reads.add(m[1])
    if (new RegExp(String.raw`${source}\[`).test(text)) reads.add(CLASS_MAP_EVERY_MEMBER)
    const destructured = new RegExp(String.raw`\{([^{}]*)\}\s*=\s*${source}(?![\w$.(\[])`, 'g')
    for (const m of text.matchAll(destructured))
      for (const part of m[1].split(',')) {
        const rest = part.trim().match(/^\.\.\.\s*(\w+)$/)
        if (rest) bound.add(rest[1])
        const key = part.trim().match(/^(\w+)/)
        if (key && !rest) reads.add(key[1])
      }
  }
  // A `...rest` a destructuring binds joins `bound` while this loop runs, so it is read too.
  for (const name of bound) readThrough(sources(name))
  readThrough(String.raw`getClassMap\(\)`)
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
 * The declaration file a package entry resolves to, the way TypeScript resolves an import
 * of it under NodeNext: the `exports` map key (an exact key, else the longest `*` pattern
 * that matches), then its `types` condition, else its `import` or `default` target with
 * `.js` read as `.d.ts`. The root falls back to `types`, `typings`, then `index.d.ts`; a
 * subpath of a package without an `exports` map is the file at that path.
 *
 * @param manifest - The published package.json.
 * @param entry - `.` or a subpath key such as `./render`.
 * @returns The path relative to the package root, or null when the package does not
 *   export the entry (an import of it cannot resolve).
 */
export function entryTypesPath(manifest, entry) {
  const map = manifest.exports
  const fallback = entry === '.' ? (manifest.types ?? manifest.typings ?? 'index.d.ts') : null
  if (map === undefined || map === null) return fallback ?? declarationOf(entry)
  const keyed =
    typeof map === 'object' &&
    !Array.isArray(map) &&
    Object.keys(map).some((k) => k.startsWith('.'))
  // A map of conditions (or a bare string) exports the root alone.
  if (!keyed) return entry === '.' ? (typesOf(map) ?? fallback) : null
  let target = map[entry]
  let star
  if (target === undefined) {
    const pattern = Object.keys(map)
      .filter((key) => {
        const at = key.indexOf('*')
        return (
          at >= 0 &&
          entry.length >= key.length - 1 &&
          entry.startsWith(key.slice(0, at)) &&
          entry.endsWith(key.slice(at + 1))
        )
      })
      .sort((a, b) => b.length - a.length)[0]
    if (pattern === undefined) return null
    const at = pattern.indexOf('*')
    star = entry.slice(at, entry.length - (pattern.length - at - 1))
    target = map[pattern]
  }
  const types = typesOf(target) ?? fallback
  if (types === null) return null
  return star === undefined ? types : types.replaceAll('*', star)
}

/**
 * The declaration file next to a JavaScript path (`./dist/x.js` → `./dist/x.d.ts`).
 *
 * @param path - A `.js`, `.mjs` or `.cjs` path; any other path is returned as is.
 * @returns The declaration path.
 */
const declarationOf = (path) => path.replace(/\.(m|c)?js$/, '.d.$1ts')

/**
 * The declaration file an `exports` target names: its `types` condition, else its `import`
 * or `default` target's declaration file.
 *
 * @param target - A string target or a conditions object.
 * @returns The path, or undefined when the target names none.
 */
function typesOf(target) {
  if (typeof target === 'string') return declarationOf(target)
  if (!target || typeof target !== 'object' || Array.isArray(target)) return undefined
  if (typeof target.types === 'string') return target.types
  return typesOf(target.import) ?? typesOf(target.default)
}

/**
 * The names a published package version exports from one entry, from its npm tarball.
 * {@link prefetchTarballs} must have cached it. A subpath the version does not export, or
 * whose declaration file it does not ship, exports nothing (an import of it cannot resolve);
 * a root without its declaration file is an error, as before subpaths were read.
 *
 * @param name - Package name.
 * @param version - Exact version.
 * @param entry - `.` (the default) or a subpath key such as `./render`.
 * @returns The names.
 */
export function publishedExports(name, version, entry = '.') {
  const key = `${name}@${version}`
  const cacheKey = `${key}${entry === '.' ? '' : entry.slice(1)}`
  if (exportCache.has(cacheKey)) return exportCache.get(cacheKey)
  const dir = cacheDir(key)
  const pkgDir = join(dir, 'package')
  const stored = join(
    dir,
    entry === '.'
      ? EXPORTS_FILE
      : EXPORTS_FILE.replace('.json', `-${encodeURIComponent(entry.slice(2))}.json`),
  )
  if (existsSync(stored)) {
    const names = new Set(JSON.parse(readFileSync(stored, 'utf8')))
    exportCache.set(cacheKey, names)
    return names
  }
  if (!existsSync(join(pkgDir, 'package.json')))
    throw new Error(`${key} is not cached: call prefetchTarballs first`)
  const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
  const types = entryTypesPath(manifest, entry)
  const names =
    types !== null && (entry === '.' || existsSync(join(pkgDir, types)))
      ? declaredExports(join(pkgDir, types))
      : new Set()
  writeFileSync(stored, JSON.stringify([...names].sort()))
  exportCache.set(cacheKey, names)
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
 * The package directories a set of repo paths belongs to: a path counts for a package
 * when it is that package's package.json or lies under its src/.
 *
 * @param root - The monorepo root (its `packages/` is scanned).
 * @param paths - Paths relative to `root`, as `git diff --name-only` prints them.
 * @returns Package directories relative to `root`.
 */
export function packagesForPaths(root, paths) {
  const dirs = findPackages(join(root, 'packages')).map((dir) => relative(root, dir))
  const out = new Set()
  for (const path of paths) {
    const dir = dirs.find((d) => path === `${d}/package.json` || path.startsWith(`${d}/src/`))
    if (dir) out.add(dir)
  }
  return out
}

/**
 * Read every publishable package and the names it imports from its `@molecule/*` peers.
 *
 * @param root - The monorepo root (its `packages/` is scanned).
 * @param only - Package directories relative to `root` to read imports for; null reads all.
 *   Every manifest is still read, for the workspace versions.
 * @returns The packages with their imports, and every workspace version by name.
 */
function readFleet(root, only = null) {
  const manifests = findPackages(join(root, 'packages')).map((dir) => ({
    dir,
    pkg: JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')),
  }))
  const workspaceVersions = new Map(manifests.map(({ pkg }) => [pkg.name, pkg.version]))
  const dirOf = new Map(manifests.map(({ dir, pkg }) => [pkg.name, dir]))
  const manifestOf = new Map(manifests.map(({ pkg }) => [pkg.name, pkg]))
  // The names each workspace package entry's own source exports, for the star forms.
  const entryNames = new Map()
  const workspaceEntryExports = (peer, entry, rel) => {
    const key = `${peer}${entry === '.' ? '' : entry.slice(1)}`
    if (!entryNames.has(key)) {
      const types = manifestOf.has(peer) ? entryTypesPath(manifestOf.get(peer), entry) : null
      if (types === null)
        throw new Error(`${rel}: ${key} is not an entry of the workspace's ${peer}`)
      const declared = join(dirOf.get(peer), types)
      const inSrc = types.replace(/^\.?\/?dist\//, 'src/').replace(/\.d\.ts$/, '')
      // The root of a package without an `exports` map reads its `src/index.ts`, as
      // classMapMembersOf does.
      const candidates = [`${inSrc}.ts`, `${inSrc}.tsx`]
      if (entry === '.') candidates.push('src/index.ts', 'src/index.tsx')
      const file = candidates
        .map((f) => join(dirOf.get(peer), f))
        .concat(declared)
        .find((f) => existsSync(f))
      if (!file)
        throw new Error(
          `${rel}: cannot read the names ${key} exports: neither its source nor ${types} exists`,
        )
      entryNames.set(key, declaredExports(file))
    }
    return entryNames.get(key)
  }
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
    if (only && !only.has(relative(root, dir))) continue
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
        // A subpath import is kept under its own specifier: it is checked against that
        // entry of the peer's exports map (see findFloorGaps).
        const peer = packageNameOf(specifier)
        if (!peers.includes(peer)) continue
        for (const name of names) {
          if (name !== EVERY_EXPORT) use(specifier, name, rel)
          else
            for (const each of workspaceEntryExports(peer, entryOf(peer, specifier), rel))
              use(specifier, each, rel)
        }
        const isRoot = specifier === packageNameOf(specifier)
        if (isRoot && (names.has('getClassMap') || names.has(CLASS_MAP))) classMapPeer = specifier
      }
      if (!classMapPeer) continue
      const members = classMapMembersOf(classMapPeer)
      for (const member of classMapReads(text)) {
        if (member === CLASS_MAP_EVERY_MEMBER) for (const m of members) use(classMapPeer, m, rel)
        else if (members.has(`${CLASS_MAP}.${member}`))
          use(classMapPeer, `${CLASS_MAP}.${member}`, rel)
      }
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
 * @param options - `only`: package directories relative to `root` to check (see
 *   {@link packagesForPaths}); omitted checks every package.
 * @returns One row per package with a gap.
 */
export async function scanFleet(
  root = ROOT,
  {
    versionsOf = fetchPublishedVersions,
    exportsAt = publishedExports,
    prefetch = prefetchTarballs,
  } = {},
  { only = null } = {},
) {
  const { packages, workspaceVersions } = readFleet(root, only)
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
    const read = (name, version, entry) => {
      const key = `${name}@${version}`
      if (fetched.has(key)) return exportsAt(name, version, entry)
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
  // Read as a stream, not readFileSync(0): `import process from 'node:process'` evaluates every property of
  // process, `process.stdin` included, which opens a piped stdin non-blocking. A synchronous read then throws
  // EAGAIN as soon as the writer pauses (2026-11-18: a pre-commit staging 1,039 files, more than a pipe holds).
  const only = process.argv.includes('--paths-from-stdin')
    ? packagesForPaths(ROOT, (await text(process.stdin)).split('\n').filter(Boolean))
    : null
  const rows = only?.size === 0 ? [] : await scanFleet(ROOT, {}, { only })
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2))
  } else if (only?.size === 0) {
    // No staged path belongs to a package: nothing to check, and no npm request.
  } else if (rows.length === 0) {
    console.log(
      only
        ? `✓ the @molecule peer floors of ${only.size} package(s) export the names they import`
        : '✓ every @molecule peer floor exports the names its dependents import',
    )
  } else {
    for (const row of rows) {
      for (const gap of row.gaps) {
        // `a, b from @molecule/x and c from @molecule/x/render`: each entry with its names.
        const byEntry = Map.groupBy(gap.missing, (m) => m.entry ?? '.')
        const uses = [...byEntry]
          .map(([entry, missing]) => {
            const from = entry === '.' ? gap.peer : `${gap.peer}${entry.slice(1)}`
            return `${missing.map((m) => m.name).join(', ')} from ${from}`
          })
          .join(' and ')
        const files = [...new Set(gap.missing.flatMap((m) => m.files))].join(', ')
        console.error(
          `✗ ${row.package} uses ${uses}, which ${gap.peer}@${gap.floor} ` +
            `(the floor of "${gap.range}") does not declare — raise it to "${gap.fix}" in ` +
            `${row.dir}/package.json peerDependencies (${files})`,
        )
      }
    }
  }
  if (rows.length > 0) process.exitCode = 1
}
