/**
 * A framework binding gets its router, and its routed view, from the app's routing bond: the
 * bond mounts the binding's router provider. A bond older than that mechanism mounts nothing, so
 * beside a newer binding every router hook and `RoutedView` throws at run time. Two rules make npm
 * refuse that pair at install (reviews/fable-routed-view-mixed-install/report.md):
 *
 * - **The binding** declares each routing bond that peers on it as an optional peer,
 *   `">=<first version>"`: the bond's first published version whose manifest peers on the binding
 *   at or above the binding's first published version exporting `RoutedView` (the bond's
 *   workspace version while npm has none). npm refuses an out-of-range bond (ERESOLVE, npm 11
 *   and 12) and installs nothing extra for an app without that bond.
 * - **A package that reads the router through a binding** (its router hooks, `RoutedView`, the
 *   router provider and context, anything from `<binding>/link`) peers on a range in which every
 *   published version of the binding declares those optional peers. Otherwise a partial upgrade
 *   pairs it with a binding version that predates the guard and installs cleanly.
 *
 * The routing bonds are the packages under `packages/app/bonds/routing/`. The bindings are the
 * peers of those bonds that live in `packages/app/frameworks/`. The per-bond versions are read
 * from npm each run and stored nowhere else. `check-peer-floors.mjs` reads the registry and runs
 * these rules.
 *
 * @module
 */
import semver from 'semver'
import ts from 'typescript'

import {
  BINDING_REFERENCE,
  counterpartNames,
  PORT_EXPORT_EXEMPT,
} from '../check-framework-conformance.mjs'

/** Where the routing bonds live, relative to the monorepo root. */
export const ROUTING_BONDS_DIR = 'packages/app/bonds/routing'

/** Where the framework bindings live, relative to the monorepo root. */
export const FRAMEWORKS_DIR = 'packages/app/frameworks'

/** The React binding's file whose runtime exports are its router hooks. */
export const REACT_ROUTER_HOOKS = 'src/hooks/useRouter.ts'

/** The React binding's other router names: the routed view and the router provider and context. */
export const REACT_ROUTER_EXTRAS = ['RoutedView', 'RouterProvider', 'RouterContext']

/** The binding entry whose every name reads the router (`Link` and its helpers). */
export const LINK_ENTRY = './link'

/** The binding export the bond versions are measured from. */
export const ROUTED_VIEW = 'RoutedView'

/**
 * The runtime names a TypeScript module declares as exports (`export function`, `export const`,
 * `export class`, `export { a, b }`); types and interfaces are left out.
 *
 * @param text - The module's source.
 * @param fileName - Its name (`.tsx` parses JSX).
 * @returns The names.
 */
export function runtimeExportsOf(text, fileName) {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    false,
    fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const names = new Set()
  const has = (node, kind) => node.modifiers?.some((m) => m.kind === kind) ?? false
  const exported = (node) =>
    has(node, ts.SyntaxKind.ExportKeyword) && !has(node, ts.SyntaxKind.DeclareKeyword)
  for (const node of source.statements) {
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name &&
      exported(node)
    ) {
      names.add(node.name.text)
    } else if (ts.isVariableStatement(node) && exported(node)) {
      for (const d of node.declarationList.declarations)
        if (ts.isIdentifier(d.name)) names.add(d.name.text)
    } else if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const e of node.exportClause.elements) if (!e.isTypeOnly) names.add(e.name.text)
    }
  }
  return names
}

/**
 * Each binding's router names: the React binding's router hooks and {@link REACT_ROUTER_EXTRAS},
 * and for a port the counterpart of each (the same name, the name with its framework's word for
 * React, and the names its export-parity exemption says do that job).
 *
 * @param bindings - Binding package name → its framework (`react`, `vue`, …).
 * @param reactHooksText - The source of the React binding's {@link REACT_ROUTER_HOOKS}.
 * @param reactExports - Every runtime name the React binding's `src` exports.
 * @returns Binding name → its router names, and the problems (an empty or stale derivation).
 */
export function routerNamesOf(bindings, reactHooksText, reactExports) {
  const problems = []
  const hooks = runtimeExportsOf(reactHooksText, REACT_ROUTER_HOOKS)
  if (hooks.size === 0)
    problems.push(
      `${BINDING_REFERENCE}: ${REACT_ROUTER_HOOKS} exports no router hook, so no package's router imports can be found; point REACT_ROUTER_HOOKS in scripts/lib/routing-bond-guard.mjs at the file that does`,
    )
  for (const name of REACT_ROUTER_EXTRAS)
    if (!reactExports.has(name))
      problems.push(
        `${BINDING_REFERENCE} no longer exports ${name}: update REACT_ROUTER_EXTRAS in scripts/lib/routing-bond-guard.mjs`,
      )
  const react = [...hooks, ...REACT_ROUTER_EXTRAS]
  const out = new Map()
  for (const [binding, framework] of bindings) {
    const names = new Set()
    for (const name of react) {
      for (const n of counterpartNames(name, framework === 'react' ? undefined : framework))
        names.add(n)
      for (const n of PORT_EXPORT_EXEMPT[binding]?.[name]?.use ?? []) names.add(n)
    }
    out.set(binding, names)
  }
  return { names: out, problems }
}

/**
 * The bond version a binding must require: the first published version whose manifest peers on
 * the binding at or above `routedViewSince`, else the bond's workspace version.
 *
 * @param bond - The bond's name.
 * @param binding - The binding's name.
 * @param published - Published version → its manifest (`peerDependencies`), for the bond.
 * @param routedViewSince - The binding's first published version exporting `RoutedView`, or null.
 * @param workspaceVersion - The bond's version in this workspace.
 * @returns The version.
 */
export function firstGuardedBondVersion(
  bond,
  binding,
  published,
  routedViewSince,
  workspaceVersion,
) {
  if (!routedViewSince) return workspaceVersion
  const versions = [...published.keys()].filter((v) => !semver.prerelease(v)).sort(semver.compare)
  for (const version of versions) {
    const range = published.get(version)?.peerDependencies?.[binding]
    const min = range && semver.validRange(range) ? semver.minVersion(range) : null
    if (min && semver.gte(min, routedViewSince)) return version
  }
  return workspaceVersion
}

/**
 * The binding rule: each binding declares every routing bond that peers on it as an optional
 * peer at that bond's {@link firstGuardedBondVersion}, and no other routing bond.
 *
 * @param bonds - The routing bonds' workspace manifests.
 * @param bindings - Binding name → `{ dir, pkg }` (dir relative to the root).
 * @param publishedManifests - Package name → published version → manifest.
 * @param routedViewSince - Binding name → its first published version exporting `RoutedView`.
 * @returns One message per problem, and binding name → the bonds it must declare.
 */
export function bindingGuardProblems(bonds, bindings, publishedManifests, routedViewSince) {
  const problems = []
  const required = new Map([...bindings.keys()].map((b) => [b, new Map()]))
  for (const bond of bonds)
    for (const binding of Object.keys(bond.peerDependencies ?? {}))
      if (bindings.has(binding))
        required
          .get(binding)
          .set(
            bond.name,
            firstGuardedBondVersion(
              bond.name,
              binding,
              publishedManifests.get(bond.name) ?? new Map(),
              routedViewSince.get(binding) ?? null,
              bond.version,
            ),
          )
  const bondNames = new Set(bonds.map((b) => b.name))
  for (const [binding, { dir, pkg }] of bindings) {
    for (const [bond, version] of required.get(binding)) {
      const want = `>=${version}`
      const found = pkg.peerDependencies?.[bond]
      const optional = pkg.peerDependenciesMeta?.[bond]?.optional === true
      if (found === want && optional) continue
      problems.push(
        `${binding}: peerDependencies must declare "${bond}": "${want}" with peerDependenciesMeta optional (found: ${found === undefined ? 'none' : `"${found}"${optional ? '' : ', not optional'}`}) in ${dir}/package.json. ${version} is the bond's first version built for this binding's routed view; an older bond installed beside this binding mounts no router for its hooks.`,
      )
    }
    for (const bond of Object.keys(pkg.peerDependencies ?? {}))
      if (bondNames.has(bond) && !required.get(binding).has(bond))
        problems.push(
          `${binding}: declares the routing bond ${bond} as a peer, but ${bond} does not peer on ${binding}: remove it from ${dir}/package.json`,
        )
  }
  return { problems, required }
}

/**
 * The consumer rule: a package importing router names from a binding peers on a range in which
 * every published version of the binding declares the optional routing-bond peers.
 *
 * @param packages - `{ dir, pkg, imports }` per package (dir relative to the root; imports as
 *   check-peer-floors reads them: specifier → name → files).
 * @param routerNames - Binding name → its router names from the root entry (`root`, see
 *   {@link routerNamesOf}) and the runtime names its {@link LINK_ENTRY} declares (`link`); a
 *   type from either reads no router.
 * @param required - Binding name → the bonds it must declare (see {@link bindingGuardProblems}).
 * @param publishedManifests - Package name → published version → manifest.
 * @param workspaceVersions - Package name → version in this workspace.
 * @returns One message per package and binding.
 */
export function consumerGuardProblems(
  packages,
  routerNames,
  required,
  publishedManifests,
  workspaceVersions,
) {
  const problems = []
  for (const { dir, pkg, imports } of packages) {
    for (const [binding, names] of routerNames) {
      const range = pkg.peerDependencies?.[binding]
      if (!range || pkg.name === binding) continue
      const uses = new Map()
      for (const [name, files] of imports.get(binding) ?? [])
        if (names.root.has(name)) uses.set(name, files)
      for (const [name, files] of imports.get(`${binding}${LINK_ENTRY.slice(1)}`) ?? [])
        if (names.link.has(name)) uses.set(name, files)
      if (uses.size === 0) continue
      const bonds = [...(required.get(binding)?.keys() ?? [])]
      const published = publishedManifests.get(binding) ?? new Map()
      const guarded = (version) =>
        bonds.every(
          (b) =>
            published.get(version)?.peerDependencies?.[b] !== undefined &&
            published.get(version)?.peerDependenciesMeta?.[b]?.optional === true,
        )
      const allowed = [...published.keys()]
        .filter((v) => !semver.prerelease(v) && semver.satisfies(v, range))
        .sort(semver.compare)
      const bad = allowed.filter((v) => !guarded(v))
      if (bad.length === 0) continue
      const firstGuarded = [...published.keys()]
        .filter((v) => !semver.prerelease(v) && guarded(v))
        .sort(semver.compare)[0]
      const current = workspaceVersions.get(binding)
      const fix = firstGuarded
        ? `^${firstGuarded}`
        : published.has(current)
          ? `^${semver.inc(current, 'minor')}`
          : `^${current}`
      const files = [...new Set([...uses.values()].flatMap((f) => [...f]))].sort().join(', ')
      problems.push(
        `${pkg.name}: imports ${[...uses.keys()].sort().join(', ')} from ${binding} under "${range}", which allows ${bad.join(', ')}: ${bad.length === 1 ? 'a version' : 'versions'} that do not refuse a routing bond too old to give it a router. Raise the peer to "${fix}" in ${dir}/package.json and add a changeset (${files})`,
      )
    }
  }
  return problems
}
