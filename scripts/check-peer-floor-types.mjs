#!/usr/bin/env node
/**
 * Run the TypeScript compiler with no emit against the published types a
 * package's Molecule peer ranges allow. The normal workspace build sees newer
 * types behind its links, so it can accept a prop an installed peer rejects.
 *
 *   npm run check:peer-floor-types -- --base=origin/main
 *   npm run check:peer-floor-types -- packages/app/features/action-menu-react
 *   npm run check:peer-floor-types -- --all
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import process from 'node:process'
import { text } from 'node:stream/consumers'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import semver from 'semver'
import ts from 'typescript'

import { ciBase } from './check-framework-conformance.mjs'
import {
  fetchPublishedVersions,
  findPackages,
  historyRepo,
  packagesForPaths,
  prefetchTarballs,
  publishedPackageDir,
  resolvePeerFloor,
} from './check-peer-floors.mjs'
import { isTestFile, packageNameOf } from './check-undeclared-imports.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const isMolecule = (name) => name?.startsWith('@molecule/')
const readManifest = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
const peerRanges = (pkg) =>
  Object.entries(pkg.peerDependencies ?? {}).filter(([name]) => isMolecule(name))
const packageKey = (name, version) => `${name}@${version}`

/** Resolve workspace manifest targets from source, even before a build. */
function sourceTargets(value) {
  if (typeof value === 'string')
    return value
      .replace(/^(\.\/)?dist\//, (_match, prefix = '') => `${prefix}src/`)
      .replace(/^(\.\/)?src\/(.*)\.d\.([mc]?)ts$/, '$1src/$2.$3js')
  if (Array.isArray(value)) return value.map(sourceTargets)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, target]) => [key, sourceTargets(target)]),
    )
  return value
}

/** Mount a workspace package using its authored files and original export conditions. */
function workspaceTarget(dir, pkg) {
  const manifest = { ...pkg }
  for (const field of ['exports', 'imports', 'main', 'types', 'typings', 'typesVersions'])
    manifest[field] = sourceTargets(pkg[field])
  return { dir, pkg, manifest: JSON.stringify(manifest), version: pkg.version, slot: 'workspace' }
}

/**
 * Load published declarations and the Molecule dependencies they can reference.
 * A declaration can import props from a different package, as Box does for
 * BoxProps in app-ui. The cached files are left untouched.
 */
function publishedGraph(workspace) {
  const versions = new Map()
  const targets = new Map()
  const ranges = (pkg) =>
    Object.entries({
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
      ...pkg.dependencies,
    }).filter(([name]) => isMolecule(name))
  const readVersions = async (names) => {
    const wanted = [...new Set(names)].filter((name) => !versions.has(name))
    if (wanted.length === 0) return
    for (const [name, list] of await fetchPublishedVersions(wanted)) versions.set(name, list)
  }
  const floor = (name, range) =>
    resolvePeerFloor(versions.get(name) ?? [], range, workspace.get(name)?.version)
  const load = async (requests) => {
    let wanted = new Map(
      requests.map(([name, version]) => [packageKey(name, version), [name, version]]),
    )
    while (wanted.size) {
      const wave = [...wanted].filter(([key]) => !targets.has(key))
      if (!wave.length) break
      await prefetchTarballs(
        wave.map(([key]) => key),
        16,
        { reexports: false },
      )
      const dependencies = []
      for (const [key, [name, version]] of wave) {
        const dir = publishedPackageDir(name, version)
        const pkg = readManifest(dir)
        const deps = ranges(pkg)
        targets.set(key, { dir, pkg, deps: new Map(deps), version, slot: version })
        dependencies.push(...deps)
      }
      await readVersions(dependencies.map(([name]) => name))
      wanted = new Map()
      for (const [name, range] of dependencies) {
        const resolved = floor(name, range)
        if (resolved.published)
          wanted.set(packageKey(name, resolved.version), [name, resolved.version])
      }
    }
  }
  const published = (name, version) => targets.get(packageKey(name, version))
  const dependency = (name, range) => {
    const resolved = floor(name, range)
    return resolved.published ? published(name, resolved.version) : workspace.get(name)
  }
  return { versions, readVersions, floor, load, published, dependency }
}

/**
 * Look up installed dependencies missing from a release export in its checkout.
 * This also preserves package-local installs used by the workspace compiler.
 */
function installedPath(root) {
  const repo = historyRepo(root)
  const linked = new Map()
  return (file) => {
    if (root === repo || !file.startsWith(`${root}/`)) return file
    const rel = relative(root, file)
    const install = /(?:^|\/)node_modules(?:\/|$)/.exec(rel)
    if (!install) return file
    const modules = join(root, rel.slice(0, install.index), 'node_modules')
    if (!linked.has(modules)) linked.set(modules, ts.sys.directoryExists(modules))
    return linked.get(modules) ? file : join(repo, rel)
  }
}

/** Read a package's effective tsconfig and scope its compiler inputs to shipped source. */
function projectSources(dir, installed) {
  const config = join(dir, 'tsconfig.json')
  const errors = []
  const parsed = ts.getParsedCommandLineOfConfigFile(
    config,
    { noEmit: true },
    {
      ...ts.sys,
      fileExists: (file) => ts.sys.fileExists(installed(file)),
      readFile: (file) => ts.sys.readFile(installed(file)),
      directoryExists: (file) => ts.sys.directoryExists(installed(file)),
      realpath: (file) => ts.sys.realpath(installed(file)),
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => errors.push(diagnostic),
    },
  )
  if (!parsed) return { files: [], errors }
  const src = `${join(dir, 'src')}/`
  return {
    ...parsed,
    files: parsed.fileNames.filter(
      (file) =>
        file.startsWith(src) &&
        !isTestFile(file.slice(src.length).replace(/\.([cm]?)js(x?)$/, '.$1ts$2')),
    ),
    errors: [...errors, ...parsed.errors],
  }
}

/**
 * Mount peer versions in a virtual node_modules and let TypeScript resolve
 * their package.json exports, typesVersions, import conditions and subpaths.
 * Missing entries in those versions remain unresolved.
 */
function compilerHost(root, dir, options, workspace, graph, peers, installed) {
  const base = join(root, '.peer-floor-types')
  const repo = historyRepo(root)
  const host = ts.createCompilerHost(options)
  const packageDir = (target) => join(base, target.slot, 'node_modules', target.pkg.name)
  const parts = (file) => {
    if (!file?.startsWith(`${base}/`)) return null
    const [, slot, name, tail] =
      /^([^/]+)\/node_modules\/(@molecule\/[^/]+)(?:\/(.*))?$/.exec(file.slice(base.length + 1)) ??
      []
    const target = slot === 'workspace' ? workspace.get(name) : graph.published(name, slot)
    return { target, tail }
  }
  const disk = (file) => {
    const entry = parts(file)
    if (entry?.target) return join(entry.target.dir, entry.tail ?? '')
    return entry ? file : installed(file)
  }
  host.getCurrentDirectory = () => dir
  host.fileExists = (file) => ts.sys.fileExists(disk(file))
  host.directoryExists = (file) =>
    (file.startsWith(`${base}/`) && /\/node_modules(?:\/@molecule)?$/.test(file)) ||
    ts.sys.directoryExists(disk(file))
  host.getDirectories = (file) => ts.sys.getDirectories(disk(file))
  host.readFile = (file) => {
    const entry = parts(file)
    if (entry?.tail === 'package.json' && entry.target?.manifest) return entry.target.manifest
    return ts.sys.readFile(disk(file))
  }
  host.realpath = (file) => (parts(file) ? file : ts.sys.realpath(disk(file)))

  const cache = ts.createModuleResolutionCache(dir, host.getCanonicalFileName, options)
  const mountedOptions = { ...options, baseUrl: undefined, paths: undefined }
  const lookupFrom = (target) => join(base, target.slot, 'entry.ts')
  const mountedCache = ts.createModuleResolutionCache(
    dir,
    host.getCanonicalFileName,
    mountedOptions,
  )
  const targetFor = (name, owner) => {
    if (name === owner?.pkg.name) return owner
    const selected = peers.get(name)
    const range = owner?.deps?.get(name)
    if (range !== undefined)
      return selected && semver.satisfies(selected.version, range)
        ? selected
        : graph.dependency(name, range)
    if (owner?.slot === 'workspace') {
      // One install holds one copy of a shared peer, so a workspace package whose own range
      // accepts the version the checked package selected uses that copy. A second copy would
      // keep apart what they share: an interface one augments and the other reads
      // (app-ide-panel-logic registering icon names for app-ide-react).
      const own =
        owner.pkg.peerDependencies?.[name] ??
        owner.pkg.dependencies?.[name] ??
        owner.pkg.optionalDependencies?.[name]
      if (selected && own !== undefined && semver.satisfies(selected.version, own)) return selected
      return workspace.get(name) ?? selected
    }
    return selected ?? workspace.get(name)
  }
  const controlledPeer = (name, owner) =>
    isMolecule(name) && (peers.has(name) || owner?.deps?.has(name) || name === owner?.pkg.name)
  const installedFrom = (owner) =>
    join(owner?.slot === 'workspace' ? owner.dir : dir, 'package.json')
  host.resolveModuleNameLiterals = (literals, file, redirected, opts, source) => {
    const owner = parts(file)?.target
    return literals.map((literal) => {
      const specifier = literal.text
      const name = packageNameOf(specifier)
      const mode = ts.getModeForUsageLocation(source, literal, opts)
      const controlled = controlledPeer(name, owner)
      const target = isMolecule(name) ? targetFor(name, owner) : undefined
      // Vendor imports use their installed workspace context. Relative and
      // #imports still read the selected owner's own files.
      const from = name && owner ? installedFrom(owner) : file
      const regular = () =>
        ts.resolveModuleName(specifier, from, opts, host, cache, redirected, mode)
      if (!target) return controlled ? { resolvedModule: undefined } : regular()
      if (!controlled) {
        // A non-peer can be installed at a different version than the workspace
        // package of the same name. Keep that install (and any user aliases).
        const resolved = regular()
        const fileName = resolved.resolvedModule?.resolvedFileName
        const local = join(repo, relative(root, target.dir))
        if (fileName && !ts.sys.realpath(disk(fileName)).startsWith(`${local}/`)) return resolved
      }
      const result = ts.resolveModuleName(
        specifier,
        lookupFrom(target),
        mountedOptions,
        host,
        mountedCache,
        redirected,
        mode,
      )
      return result.resolvedModule?.resolvedFileName.startsWith(`${packageDir(target)}/`)
        ? result
        : { resolvedModule: undefined }
    })
  }
  const typeOptions = { ...mountedOptions, typeRoots: undefined }
  const typeCache = ts.createTypeReferenceDirectiveResolutionCache(dir, host.getCanonicalFileName)
  host.resolveTypeReferenceDirectiveReferences = (references, file, redirected, opts, source) => {
    const owner = parts(file)?.target
    return references.map((reference) => {
      const name = typeof reference === 'string' ? reference : reference.fileName
      const mode = ts.getModeForFileReference(reference, source?.impliedNodeFormat)
      if (!controlledPeer(name, owner))
        return ts.resolveTypeReferenceDirective(
          name,
          owner ? installedFrom(owner) : file,
          opts,
          host,
          redirected,
          typeCache,
          mode,
        )
      const target = targetFor(name, owner)
      if (!target) return { resolvedTypeReferenceDirective: undefined }
      const result = ts.resolveTypeReferenceDirective(
        name,
        lookupFrom(target),
        typeOptions,
        host,
        redirected,
        typeCache,
        mode,
      )
      return result.resolvedTypeReferenceDirective?.resolvedFileName.startsWith(
        `${packageDir(target)}/`,
      )
        ? result
        : { resolvedTypeReferenceDirective: undefined }
    })
  }
  return host
}

/** Preserve the compiler's message and location without retaining its AST. */
function diagnosticRecord(root, diagnostic) {
  const { file, start, code } = diagnostic
  const point = file && start !== undefined ? file.getLineAndCharacterOfPosition(start) : null
  return {
    file: file && relative(root, file.fileName),
    line: point && point.line + 1,
    column: point && point.character + 1,
    start,
    code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }
}

/** Run the no-emit compiler for this package and the selected peer versions. */
function compile(root, dir, project, workspace, graph, peers, installed) {
  const { options, files, references, errors } = project
  const host = compilerHost(root, dir, options, workspace, graph, peers, installed)
  const program = ts.createProgram({
    rootNames: files,
    projectReferences: references,
    options,
    host,
  })
  const diagnostics = [
    ...errors,
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
  ]
  for (const name of files) {
    const file = program.getSourceFile(name)
    if (file)
      diagnostics.push(
        ...program.getSyntacticDiagnostics(file),
        ...program.getSemanticDiagnostics(file),
      )
  }
  return ts
    .sortAndDeduplicateDiagnostics(diagnostics)
    .filter((diag) => diag.category === ts.DiagnosticCategory.Error)
    .map((diag) => diagnosticRecord(root, diag))
}

/**
 * Restore workspace versions and reintroduce floors to isolate each rejection.
 * Check fixes in version order because a type can regress in a later version.
 */
async function diagnose(root, dir, project, workspace, graph, peers, installed) {
  const results = new Map()
  const diagnosticKey = ({ file, start, code }) => JSON.stringify([file, start, code])
  const check = (selected) => {
    const key = JSON.stringify([...selected].map(([name, target]) => [name, target?.slot]))
    if (!results.has(key))
      results.set(key, compile(root, dir, project, workspace, graph, selected, installed))
    return results.get(key)
  }
  const failures = check(peers)
  const baseline = new Map(
    [...peers].map(([name, target]) => [name, workspace.get(name) ?? target]),
  )
  const rows = []
  for (const diagnostic of failures) {
    const rejects = (selection) =>
      check(selection).some(
        (other) =>
          other.file === diagnostic.file &&
          other.start === diagnostic.start &&
          (other.file !== undefined || other.code === diagnostic.code),
      )
    const fixes = []
    const repaired = new Map(baseline)
    if (!rejects(baseline)) {
      for (const [name, floor] of peers) {
        if (!floor || repaired.get(name) === floor) continue
        const trial = new Map(repaired).set(name, floor)
        if (!rejects(trial)) repaired.set(name, floor)
      }
      for (const [name, floor] of peers) {
        if (!floor || repaired.get(name) === floor) continue
        const versions = (graph.versions.get(name) ?? [])
          .filter((version) => semver.gt(version, floor.version) && !semver.prerelease(version))
          .sort(semver.compare)
        const remaining = new Set(check(repaired).map(diagnosticKey))
        let accepted = null
        for (const version of versions) {
          await graph.load([[name, version]])
          const target = graph.published(name, version)
          const trial = new Map(repaired).set(name, target)
          // A signature change can move an error from an argument to the call.
          // Require the candidate to compile without adding any error to the control.
          if (check(trial).some((error) => !remaining.has(diagnosticKey(error)))) continue
          repaired.set(name, target)
          accepted = version
          break
        }
        fixes.push({ peer: name, floor: floor.version, version: accepted })
      }
    }
    rows.push({ ...diagnostic, fixes })
  }
  return rows
}

/**
 * Type-check the publishable packages in a workspace against their peer floors.
 *
 * @param root - The workspace source tree, including its package manifests.
 * @param only - Selected package directories relative to root, or null for all.
 * @returns Per-package compiler diagnostics, skips, and workspace fallbacks.
 */
export async function scanPeerFloorTypes(root, only = null) {
  const workspace = new Map()
  const projects = []
  const rows = []
  for (const dir of findPackages(join(root, 'packages'))) {
    const pkg = readManifest(dir)
    if (isMolecule(pkg.name)) workspace.set(pkg.name, workspaceTarget(dir, pkg))
    if (pkg.private || (only && !only.has(relative(root, dir)))) continue
    const ranges = peerRanges(pkg)
    const row = { package: pkg.name, dir: relative(root, dir), diagnostics: [], fallbacks: [] }
    rows.push(row)
    if (!ranges.length) row.skipped = 'no @molecule/* peer dependencies'
    else projects.push({ dir, row, ranges })
  }

  const graph = publishedGraph(workspace)
  const installed = installedPath(root)
  await graph.readVersions(projects.flatMap(({ ranges }) => ranges.map(([name]) => name)))
  const requests = []
  for (const { ranges } of projects)
    for (const [name, range] of ranges) {
      const floor = graph.floor(name, range)
      if (floor.published) requests.push([name, floor.version])
    }
  await graph.load(requests)
  for (const { dir, row, ranges } of projects) {
    const project = projectSources(dir, installed)
    if (!project.files.length) {
      row.diagnostics = project.errors.map((diag) => diagnosticRecord(root, diag))
      if (!row.diagnostics.length) row.skipped = 'no shipped TypeScript inputs in tsconfig.json'
      continue
    }
    const peers = new Map()
    for (const [name, range] of ranges) {
      const floor = graph.floor(name, range)
      if (floor.published) peers.set(name, graph.published(name, floor.version))
      else {
        const source = workspace.get(name)
        peers.set(name, source)
        if (source)
          row.fallbacks.push({
            peer: name,
            range,
            workspace: source.version,
            published: floor.version,
          })
      }
    }
    row.diagnostics = await diagnose(root, dir, project, workspace, graph, peers, installed)
  }
  return rows
}

/**
 * List changed paths in the working tree, in CI, or in a pinned release export.
 *
 * @param root - Directory carrying the package sources.
 * @param base - The comparison commit, or `ci` to use the run's diff bounds.
 * @param env - GitHub event metadata or the release's pinned base and tip.
 * @returns Repo-relative paths, or null when the full fleet must be checked.
 */
export function pathsAgainst(root, base, env) {
  const repo = historyRepo(root, env)
  const git = (...args) =>
    execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .split('\0')
      .filter(Boolean)
  const pinned = env.MOL_PEER_FLOOR_TYPES_TIP
  const start =
    base === 'ci'
      ? pinned
        ? env.MOL_PEER_FLOOR_TYPES_BASE
        : ciBase(env, (ref) => git('merge-base', ref, 'HEAD')[0].trim())
      : base
  if (!start) return null
  const commit = (ref) =>
    git('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`)[0].trim()
  let before
  try {
    before = commit(start)
  } catch (error) {
    if (base !== 'ci' || pinned || env.GITHUB_EVENT_NAME !== 'push') throw error
    console.warn(
      `Peer floor types: checking every package, CI push base ${start} is unavailable.`,
      String(error.stderr ?? error.message).trim(),
    )
    return null
  }
  const paths = git(
    'diff',
    '--name-only',
    '-z',
    '--no-renames',
    before,
    ...(pinned ? [commit(pinned)] : []),
    '--',
  )
  if (!pinned) paths.push(...git('ls-files', '-z', '--others', '--exclude-standard'))
  return paths
}

/** Report the native TypeScript diagnostics and their verified peer floor fixes. */
function print(rows) {
  let failed = false
  let checked = 0
  for (const row of rows) {
    if (row.skipped) {
      console.log(`Skip ${row.package}: ${row.skipped}`)
      continue
    }
    checked++
    for (const { peer, range, workspace, published } of row.fallbacks)
      console.log(
        `${row.package} uses ${peer} workspace source (${workspace}); ${published ? `published floor ${published} is above it` : `no published version satisfies "${range}"`}`,
      )
    for (const diag of row.diagnostics) {
      failed = true
      const location = diag.file
        ? `${diag.file}:${diag.line}:${diag.column}`
        : `${row.dir}/tsconfig.json`
      console.error(`${row.package} ${location} error TS${diag.code}: ${diag.message}`)
      if (diag.fixes?.length > 1) console.error('  Raise these peer floors together.')
      if (!diag.fixes?.length)
        console.error('  Fix the compiler error in the named source or configuration.')
      for (const { peer, floor, version } of diag.fixes ?? [])
        console.error(
          `  ${peer}@${floor}: raise this peer floor in ${row.dir}/package.json to ${version ?? 'the version this release publishes'}.`,
        )
    }
  }
  console.log(`Peer floor types: ${checked} package(s) checked, ${rows.length - checked} skipped`)
  return failed ? 1 : 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({
    options: {
      all: { type: 'boolean' },
      base: { type: 'string' },
      'paths-from-stdin': { type: 'boolean' },
    },
    allowPositionals: true,
  })
  const paths = values['paths-from-stdin']
    ? (await text(process.stdin)).split('\n').filter(Boolean)
    : values.all || positionals.length
      ? null
      : pathsAgainst(ROOT, values.base ?? 'HEAD', process.env)
  const only = positionals.length
    ? new Set(positionals.map((dir) => relative(ROOT, resolve(dir))))
    : paths &&
      packagesForPaths(
        ROOT,
        paths.map((path) => path.replace(/\/tsconfig[^/]*\.json$/, '/package.json')),
      )
  const rows = only?.size === 0 ? [] : await scanPeerFloorTypes(ROOT, only)
  if (positionals.length) {
    const found = new Set(rows.map((row) => row.dir))
    for (const dir of only)
      if (!found.has(dir)) throw new Error(`${dir}: no publishable package with src/`)
  }
  process.exitCode = print(rows)
}
