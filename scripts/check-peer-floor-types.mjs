#!/usr/bin/env node
/**
 * Run the TypeScript compiler with no emit against the published types a
 * package's Molecule peer ranges allow. The normal workspace build sees newer
 * types behind its links, so it can accept a prop an installed peer rejects.
 *
 *   npm run check:peer-floor-types -- --base=origin/main
 *   npm run check:peer-floor-types -- packages/app/features/action-menu-react
 *   npm run check:peer-floor-types -- --all
 *   npm run check:peer-floor-types -- --props-only --all
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
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
import { isMainModule } from './lib/is-main.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const isMolecule = (name) => name?.startsWith('@molecule/')
const readManifest = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
const peerRanges = (pkg) =>
  Object.entries(pkg.peerDependencies ?? {}).filter(([name]) => isMolecule(name))
const packageKey = (name, version) => `${name}@${version}`
const uiKitFramework = (name) =>
  /^@molecule\/app-ui-(react|solid|vue|angular|svelte)$/.exec(name)?.[1]

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
  return { dir, pkg, version: pkg.version, slot: 'workspace', manifest: undefined }
}

/** Rewrite only the manifests TypeScript actually reads. */
function mountedManifest(target) {
  if (target.manifest === undefined) {
    const manifest = { ...target.pkg }
    for (const field of ['exports', 'imports', 'main', 'types', 'typings', 'typesVersions'])
      manifest[field] = sourceTargets(target.pkg[field])
    target.manifest = JSON.stringify(manifest)
  }
  return target.manifest
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
function compilerHost(root, dir, options, workspace, graph, peers, installed, probe) {
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
  host.fileExists = (file) => file === probe?.file || ts.sys.fileExists(disk(file))
  host.directoryExists = (file) =>
    (file.startsWith(`${base}/`) && /\/node_modules(?:\/@molecule)?$/.test(file)) ||
    ts.sys.directoryExists(disk(file))
  host.getDirectories = (file) => ts.sys.getDirectories(disk(file))
  host.readFile = (file) => {
    if (file === probe?.file) return probe.text
    const entry = parts(file)
    if (entry?.tail === 'package.json' && entry.target?.slot === 'workspace')
      return mountedManifest(entry.target)
    if (probe?.svelte && entry?.target?.slot === 'workspace' && file.endsWith('.svelte.ts'))
      return probe.svelte(disk(file.slice(0, -3)))
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
      if (
        probe?.svelte &&
        owner?.slot === 'workspace' &&
        specifier.startsWith('.') &&
        specifier.endsWith('.svelte')
      ) {
        const svelte = resolve(dirname(file), specifier)
        if (ts.sys.fileExists(disk(svelte)))
          return {
            resolvedModule: { resolvedFileName: `${svelte}.ts`, extension: ts.Extension.Ts },
          }
      }
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
  const { files, references, errors } = project
  // A workspace peer is mounted from its authored sources (`sourceTargets`), which can be `.tsx`.
  // A consumer whose tsconfig sets no `jsx` cannot load those (TS6142), so every `export *` of
  // them comes back empty and the consumer reads `any` for the peer's components: a `.ts`-only
  // package such as app-drag-drop reported a missing `Box` against app-ui-react's source.
  // Published declarations never need it. Only the consumer's own files are reported, and its own
  // build reports any JSX it writes without the option.
  const mounted = [...peers.values()].some((peer) => peer?.slot === 'workspace')
  const options =
    mounted && project.options.jsx === undefined
      ? { ...project.options, jsx: ts.JsxEmit.Preserve }
      : project.options
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

/** Inspect each peer entry at most once per version, using the same export resolver as tsc. */
function peerPropDeclarations(root, workspace, graph, installed, projects, componentDeclarations) {
  const watched = new Map()
  for (const { uses } of projects) {
    for (const use of uses ?? []) {
      for (const { specifier, name } of use.refs) {
        if (!watched.has(specifier)) watched.set(specifier, new Map())
        const entry = watched.get(specifier)
        if (!entry.has(name)) entry.set(name, new Set())
        for (const prop of propNames(specifier, use.prop)) entry.get(name).add(prop)
      }
    }
  }
  const cache = new Map()
  const svelteCache = new Map()
  const load = async (specifier, peer, target) => {
    const framework = uiKitFramework(peer)
    const file = join(root, '.peer-floor-probe.mts')
    const probe = { file, text: `export * from ${JSON.stringify(specifier)}` }
    const roots = [file]
    if (framework === 'svelte' && target.slot === 'workspace') {
      const { svelte2tsx } = await import('svelte2tsx')
      roots.push(fileURLToPath(import.meta.resolve('svelte2tsx/svelte-shims-v4.d.ts')))
      probe.svelte = (filename) => {
        if (!svelteCache.has(filename)) {
          const source = ts.sys.readFile(filename)
          svelteCache.set(filename, svelte2tsx(source, { filename, mode: 'dts' }).code)
        }
        return svelteCache.get(filename)
      }
    }
    const options = {
      module: ts.ModuleKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.Preserve,
      strict: true,
      skipLibCheck: true,
      types: [],
      noEmit: true,
    }
    const peers = new Map([[peer, target]])
    const host = compilerHost(root, root, options, workspace, graph, peers, installed, probe)
    const program = ts.createProgram(roots, options, host)
    return componentDeclarations(program, file, framework, watched.get(specifier))
  }
  return (specifier, peer, target) => {
    const key = JSON.stringify([specifier, target.slot])
    if (!cache.has(key)) cache.set(key, load(specifier, peer, target))
    return cache.get(key)
  }
}

/** Vue normalizes kebab-case keys before looking for declared component props. */
function propNames(specifier, prop) {
  if (uiKitFramework(packageNameOf(specifier)) !== 'vue' || !prop.includes('-')) return [prop]
  return [prop, prop.replace(/-(\w)/g, (_match, letter) => letter.toUpperCase())]
}

/** Compare bindings to actual declared props and find the first release that supplies each one. */
async function diagnoseProps(root, uses, peers, ranges, workspace, graph, declarations) {
  const diagnostics = []
  for (const use of uses ?? []) {
    const missing = []
    let accepted = false
    for (const { specifier, name } of use.refs) {
      const peer = packageNameOf(specifier)
      // Solid's JSX.IntrinsicAttributes includes ref for every component.
      if (peer === '@molecule/app-ui-solid' && use.prop === 'ref') continue
      const floor = peers.get(peer)
      const latest = workspace.get(peer)
      if (!floor || floor === latest) continue
      const props = (await declarations(specifier, peer, floor)).get(name)
      if (!props || (use.selector && !props.matches(use.selector))) continue
      const keys = propNames(specifier, use.prop)
      if (keys.some((prop) => props.accepts.has(prop))) {
        accepted = true
        break
      }
      missing.push({ specifier, name, peer, floor, latest, keys })
    }
    if (accepted) continue
    for (const { specifier, name, peer, floor, latest, keys } of missing) {
      // Attributes a framework passes through are only a floor mismatch if the kit declares
      // them as component props in a newer contract.
      if (!latest) continue
      const current = (await declarations(specifier, peer, latest)).get(name)
      if (
        !keys.some((prop) => current?.declares.has(prop)) ||
        (use.selector && !current.matches(use.selector))
      )
        continue
      const versions = (graph.versions.get(peer) ?? [])
        .filter((version) => semver.gt(version, floor.version) && !semver.prerelease(version))
        .sort(semver.compare)
      let version = null
      for (const candidate of versions) {
        await graph.load([[peer, candidate]])
        const target = graph.published(peer, candidate)
        const props = (await declarations(specifier, peer, target)).get(name)
        if (
          keys.some((prop) => props?.declares.has(prop)) &&
          (!use.selector || props.matches(use.selector))
        ) {
          version = candidate
          break
        }
      }
      diagnostics.push({
        file: relative(root, use.file),
        line: use.line,
        column: use.column,
        start: use.start,
        component: name,
        prop: use.prop,
        message: `${name} does not declare prop "${use.prop}" at the ${peer}@${floor.version} floor (peer range "${ranges.get(peer)}").`,
        fixes: [
          {
            peer,
            floor: floor.version,
            version: version ?? (semver.gt(latest.version, floor.version) ? latest.version : null),
          },
        ],
      })
    }
  }
  return diagnostics
}

/**
 * Type-check the publishable packages in a workspace against their peer floors.
 *
 * @param root - The workspace source tree, including its package manifests.
 * @param only - Selected package directories relative to root, or null for all.
 * @param options - Scope to changed bindings or run the prop comparison alone.
 * @returns Per-package compiler diagnostics, skips, and workspace fallbacks.
 */
export async function scanPeerFloorTypes(
  root,
  only = null,
  { paths, propPaths, propBefore, propsOnly = false } = {},
) {
  const packages = findPackages(join(root, 'packages'))
  const scoped =
    only ??
    (paths &&
      packagesForPaths(
        root,
        paths.map((path) => path.replace(/\/tsconfig[^/]*\.json$/, '/package.json')),
        packages,
      ))
  if (scoped?.size === 0) return []
  const workspace = new Map()
  const projects = []
  const rows = []
  for (const dir of packages) {
    const pkg = readManifest(dir)
    if (isMolecule(pkg.name)) workspace.set(pkg.name, workspaceTarget(dir, pkg))
    if (pkg.private || (scoped && !scoped.has(relative(root, dir)))) continue
    const ranges = peerRanges(pkg).filter(([name]) => !propsOnly || uiKitFramework(name))
    const row = { package: pkg.name, dir: relative(root, dir), diagnostics: [], fallbacks: [] }
    rows.push(row)
    if (!ranges.length)
      row.skipped = propsOnly ? 'no UI kit peer dependency' : 'no @molecule/* peer dependencies'
    else projects.push({ dir, row, ranges })
  }

  const graph = publishedGraph(workspace)
  const installed = installedPath(root)
  let componentDeclarations
  const collect = async (hasFloor) => {
    for (const project of projects) {
      const peers = new Set(
        project.ranges
          .filter(([name, range]) => uiKitFramework(name) && hasFloor(name, range))
          .map(([name]) => name),
      )
      if (!peers.size) continue
      const props = await import('./lib/peer-floor-component-props.mjs')
      componentDeclarations = props.componentDeclarations
      project.uses = await props.collectPropUses(root, project.dir, peers, propPaths, propBefore)
    }
  }
  if (propsOnly) await collect(() => true)
  const toCheck = propsOnly ? projects.filter(({ uses }) => uses?.length) : projects
  if (propsOnly)
    for (const { row, uses } of projects)
      if (!uses?.length) row.skipped = 'no component props to check'
  await graph.readVersions(toCheck.flatMap(({ ranges }) => ranges.map(([name]) => name)))
  const requests = []
  for (const { ranges } of toCheck)
    for (const [name, range] of ranges) {
      const floor = graph.floor(name, range)
      if (floor.published) requests.push([name, floor.version])
    }
  if (propsOnly) await graph.load(requests)
  else
    await Promise.all([
      graph.load(requests),
      collect((name, range) => graph.floor(name, range).published),
    ])
  const declarations = peerPropDeclarations(
    root,
    workspace,
    graph,
    installed,
    toCheck,
    componentDeclarations,
  )
  for (const { dir, row, ranges, uses } of toCheck) {
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
    row.diagnostics = uses?.length
      ? await diagnoseProps(root, uses, peers, new Map(ranges), workspace, graph, declarations)
      : []
    if (propsOnly) continue
    const project = projectSources(dir, installed)
    if (project.files.length) {
      const native = await diagnose(root, dir, project, workspace, graph, peers, installed)
      row.diagnostics.push(
        ...native.filter(
          (diag) =>
            !row.diagnostics.some((prop) => prop.file === diag.file && prop.start === diag.start),
        ),
      )
    } else {
      row.diagnostics.push(...project.errors.map((diag) => diagnosticRecord(root, diag)))
      if (!row.diagnostics.length) row.skipped = 'no shipped TypeScript inputs in tsconfig.json'
    }
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
  // Outside CI, `ci` has no push or pull request to name a base, and checking the whole fleet
  // instead takes hours: a caller mirroring CI pins the base and tip, as the release does.
  if (base === 'ci' && !pinned && !env.GITHUB_EVENT_NAME)
    throw new Error(
      '--base=ci outside CI needs MOL_PEER_FLOOR_TYPES_BASE and MOL_PEER_FLOOR_TYPES_TIP ' +
        '(the commits CI would compare); pass --base=<commit> for a local diff, or --all for the fleet',
    )
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
  const tip = pinned ? commit(pinned) : null
  return compilationPaths(
    paths,
    (path) => manifestAt(repo, before, path),
    (path) => (tip ? manifestAt(repo, tip, path) : manifestOnDisk(join(root, path))),
  )
}

/**
 * The manifest fields that decide what a package's source compiles against at its peer floors. A
 * version, a development pin or a script cannot change that, and a version stage changes those in
 * every released package: selecting each one made the release's check run past its time limit.
 */
const COMPILATION_FIELDS = [
  'name',
  'type',
  'peerDependencies',
  'peerDependenciesMeta',
  'dependencies',
  'optionalDependencies',
  'exports',
  'imports',
  'main',
  'module',
  'types',
  'typings',
  'typesVersions',
]

/**
 * Drop each changed package manifest whose compilation fields are the same on both sides. Every
 * other path, and a manifest added, removed or unreadable on either side, is kept.
 *
 * @param paths - Changed repo-relative paths.
 * @param before - The manifest before the change.
 * @param after - The manifest after it.
 * @returns The paths that can change what a package compiles against.
 */
export function compilationPaths(paths, before, after) {
  return paths.filter((path) => {
    if (!/^packages\/.+\/package\.json$/.test(path)) return true
    const old = before(path)
    const now = after(path)
    if (!old || !now) return true
    return COMPILATION_FIELDS.some(
      (field) => JSON.stringify(old[field]) !== JSON.stringify(now[field]),
    )
  })
}

/**
 * A package manifest at a commit.
 *
 * @param repo - The repository.
 * @param ref - The commit.
 * @param path - Repo-relative path of the manifest.
 * @returns The parsed manifest, or undefined when that commit has none there.
 */
function fileAt(repo, ref, path) {
  try {
    return execFileSync('git', ['-C', repo, 'show', `${ref}:${path}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (_error) {
    // An added or deleted file has no blob on one side of the comparison.
    return undefined
  }
}

/** Read the package manifest at a commit, if it existed there. */
function manifestAt(repo, ref, path) {
  const source = fileAt(repo, ref, path)
  return source === undefined ? undefined : JSON.parse(source)
}

/**
 * A package manifest on disk.
 *
 * @param file - Absolute path of the manifest.
 * @returns The parsed manifest, or undefined when the file is gone.
 */
function manifestOnDisk(file) {
  if (!existsSync(file)) return undefined
  return JSON.parse(readFileSync(file, 'utf8'))
}

/** Report the diagnostics and their verified peer floor fixes. */
function print(rows, propsOnly) {
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
      const code = diag.component ? '' : ` TS${diag.code}`
      console.error(`${row.package} ${location} error${code}: ${diag.message}`)
      if (diag.fixes?.length > 1) console.error('  Raise these peer floors together.')
      if (!diag.fixes?.length)
        console.error('  Fix the compiler error in the named source or configuration.')
      for (const { peer, floor, version } of diag.fixes ?? [])
        console.error(
          `  ${peer}@${floor}: raise this peer floor in ${row.dir}/package.json to ${version ?? 'the version this release publishes'}.`,
        )
    }
  }
  const label = propsOnly ? 'Peer floor component props' : 'Peer floor types'
  console.log(`${label}: ${checked} package(s) checked, ${rows.length - checked} skipped`)
  return failed ? 1 : 0
}

if (isMainModule(import.meta.url)) {
  const { values, positionals } = parseArgs({
    options: {
      all: { type: 'boolean' },
      base: { type: 'string' },
      'paths-from-stdin': { type: 'boolean' },
      'props-only': { type: 'boolean' },
    },
    allowPositionals: true,
  })
  // The hook passes the proposed commit's paths, read from the exported tree against HEAD.
  const indexBase = process.env.MOL_PRECOMMIT_BASE ?? 'HEAD'
  const paths = values['paths-from-stdin']
    ? compilationPaths(
        (await text(process.stdin)).split('\n').filter(Boolean),
        (path) => manifestAt(historyRepo(ROOT), indexBase, path),
        (path) => manifestOnDisk(join(ROOT, path)),
      )
    : values.all || positionals.length
      ? null
      : pathsAgainst(ROOT, values.base ?? 'HEAD', process.env)
  const only = positionals.length
    ? new Set(positionals.map((dir) => relative(ROOT, resolve(dir))))
    : null
  const rows = await scanPeerFloorTypes(ROOT, only, {
    paths,
    propPaths: values['paths-from-stdin'] && !only ? paths : undefined,
    propBefore: (file) => fileAt(historyRepo(ROOT), indexBase, relative(ROOT, file)),
    propsOnly: values['props-only'],
  })
  if (positionals.length) {
    const found = new Set(rows.map((row) => row.dir))
    for (const dir of only)
      if (!found.has(dir)) throw new Error(`${dir}: no publishable package with src/`)
  }
  process.exitCode = print(rows, values['props-only'])
}
