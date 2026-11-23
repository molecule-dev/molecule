/**
 * A private, buildable copy of one commit of this repo.
 *
 * The checkout is shared: other sessions keep uncommitted edits in it, and a
 * build that reads it compiles those edits. `trust:new` built a brand-new
 * package's dependencies from the working tree, so one session's half-done edit
 * to `@molecule/app-angular` (a removed `DestroyRef` import) failed the owner's
 * run (2026-11-14), and whatever it built from that tree is what it published.
 * An export holds exactly the committed files, so neither can happen.
 *
 * `git archive` carries no `node_modules`. The export gets one of its own:
 * every `@molecule/*` package the checkout links from its workspace resolves to
 * the EXPORT's copy (so a dependency is compiled from committed source too),
 * and everything else, including a `@molecule/*` copy npm installed from the
 * registry, resolves to the checkout's install through a link. Package-local
 * installs (`packages/<pkg>/node_modules`) are linked the same way.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'

/**
 * Every directory under `packages/` that holds a package.json, relative to the
 * export root, with the package name when it has one.
 *
 * @param root - The export root.
 * @returns The packages found: each directory and its package name, when it has one.
 */
function exportedPackages(root) {
  const found = []
  const walk = (dir, depth) => {
    if (depth > 6) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch (_error) {
      // An unreadable directory holds no package the export can link; the rest
      // of the walk stands (the same rule as scripts/build.js's scan).
      return
    }
    if (entries.some((entry) => entry.name === 'package.json' && entry.isFile())) {
      let name
      try {
        name = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name
      } catch (_error) {
        // An unparseable manifest names no package: nothing resolves to it, and
        // a build that needs it fails on the manifest itself.
        name = undefined
      }
      found.push({ dir: relative(root, dir), name })
    }
    for (const entry of entries)
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules' &&
        entry.name !== 'dist'
      )
        walk(join(dir, entry.name), depth + 1)
  }
  walk(join(root, 'packages'), 0)
  return found
}

/**
 * The installs a build in an export cannot find. For each package directory: the names in its
 * `dependencies`, `devDependencies` and non-optional `peerDependencies` (what `scripts/build.js`
 * follows), and in those of every package of the export it reaches through them, that are
 * neither a package of the export nor installed in the export's
 * `node_modules` or the package's own. The checkout can still find such a package in an install
 * above it (a workspace root's `node_modules`); an export under the temp directory cannot, so
 * its build fails with `Cannot find module` (2026-11-16: dnd-kit 0.5 was in the workspace
 * root's install and not in molecule's).
 *
 * A peer that is not also a dependency or devDependency counts only when the checkout finds it
 * in an install on its resolution path. molecule installs with `legacy-peer-deps`, so its own
 * install never holds such a peer: a build reaches one only from an install above the checkout.
 * When no install on that path has it, the checkout's build passes without it, as a package
 * that declares the module itself does (`@molecule/app-theme-nativewind` types `react-native`
 * through its own `react-native.d.ts`), and the export's build does too.
 *
 * @param exportDir - The export root (from createCommittedExport).
 * @param dirs - Package directories, relative to the export root, about to be built.
 * @param checkout - The checkout the export was made from, whose resolution path decides a
 *   peer-only name.
 * @returns Package directory -> the dependency names it cannot find (sorted), for each
 *   directory that misses any.
 */
export function missingInstalls(exportDir, dirs, checkout) {
  if (typeof checkout !== 'string' || !checkout)
    throw new TypeError('missingInstalls needs the checkout the export was made from')
  /**
   * Whether an install on the resolution path of a checkout package directory has a name.
   *
   * @param dir - Package directory, relative to the checkout.
   * @param name - Package name.
   * @returns Whether a `node_modules` there or above has it.
   */
  const onCheckoutPath = (dir, name) => {
    for (let at = join(checkout, dir); ; at = dirname(at)) {
      if (existsSync(join(at, 'node_modules', name, 'package.json'))) return true
      if (dirname(at) === at) return false
    }
  }
  const exported = new Map(
    exportedPackages(exportDir)
      .filter((pkg) => pkg.name)
      .map((pkg) => [pkg.name, pkg.dir]),
  )
  /**
   * One package's own needs: the export packages it depends on and the names it needs
   * installed that are not.
   *
   * @type {Map<string, { workspace: string[], missing: string[] }>}
   */
  const own = new Map()
  const ownNeeds = (dir) => {
    const known = own.get(dir)
    if (known) return known
    const needs = { workspace: [], missing: [] }
    own.set(dir, needs)
    let manifest
    try {
      manifest = JSON.parse(readFileSync(join(exportDir, dir, 'package.json'), 'utf8'))
    } catch (_error) {
      // An unreadable manifest declares nothing to look for; the build fails on the
      // manifest itself, with its own message.
      return needs
    }
    // The fields scripts/build.js follows; an optional peer is not needed to build.
    const optionalPeers = Object.entries(manifest.peerDependenciesMeta ?? {})
      .filter(([, meta]) => meta?.optional)
      .map(([name]) => name)
    const installed = { ...manifest.dependencies, ...manifest.devDependencies }
    const needed = Object.keys({
      ...installed,
      ...manifest.peerDependencies,
    }).filter((name) => !optionalPeers.includes(name))
    for (const name of needed) {
      const inExport = exported.get(name)
      if (inExport) needs.workspace.push(inExport)
      else if (
        !existsSync(join(exportDir, 'node_modules', name, 'package.json')) &&
        !existsSync(join(exportDir, dir, 'node_modules', name, 'package.json')) &&
        (name in installed || onCheckoutPath(dir, name))
      )
        needs.missing.push(name)
    }
    return needs
  }
  const result = new Map()
  for (const dir of dirs) {
    // Every export package the build of `dir` reaches, itself included; a dependency cycle
    // ends at a package already seen.
    const reached = new Set([dir])
    for (const next of reached) for (const dep of ownNeeds(next).workspace) reached.add(dep)
    const missing = new Set([...reached].flatMap((next) => ownNeeds(next).missing))
    if (missing.size) result.set(dir, [...missing].sort())
  }
  return result
}

/**
 * Export one commit of a checkout into a new temporary directory, with a
 * `node_modules` that resolves workspace packages inside the export.
 *
 * @param options - What to export.
 * @param options.root - The checkout (the repo root).
 * @param options.ref - The commit to export (default `HEAD`).
 * @returns The export: its
 *   root, the full commit id it holds, and a remover that deletes the export
 *   (its links, never what they point at).
 */
export function createCommittedExport({ root, ref = 'HEAD' }) {
  const sha = execFileSync('git', ['-C', root, 'rev-parse', '--verify', `${ref}^{commit}`], {
    encoding: 'utf8',
  }).trim()
  const dir = mkdtempSync(join(tmpdir(), 'molecule-committed-'))
  const dispose = () => rmSync(dir, { recursive: true, force: true })
  try {
    const archive = join(dir, '.export.tar')
    execFileSync('git', ['-C', root, 'archive', '--output', archive, sha])
    execFileSync('tar', ['-xf', archive, '-C', dir])
    rmSync(archive)

    const packages = exportedPackages(dir)
    const liveModules = join(root, 'node_modules')
    if (existsSync(liveModules)) {
      const modules = join(dir, 'node_modules')
      mkdirSync(modules)
      for (const entry of readdirSync(liveModules)) {
        if (entry === '@molecule') continue
        symlinkSync(join(liveModules, entry), join(modules, entry))
      }
      const liveScope = join(liveModules, '@molecule')
      if (existsSync(liveScope)) {
        const scope = join(modules, '@molecule')
        mkdirSync(scope)
        const exported = new Map(
          packages
            .filter((pkg) => pkg.name?.startsWith('@molecule/'))
            .map((pkg) => [pkg.name.slice('@molecule/'.length), pkg.dir]),
        )
        for (const entry of readdirSync(liveScope)) {
          const live = join(liveScope, entry)
          // A workspace link is replaced by the export's own package. A real
          // directory is a registry install npm chose over the workspace copy;
          // the checkout resolves to it, so the export does too. A link to a
          // package the commit does not contain is left out: committed code
          // cannot need it.
          if (lstatSync(live).isSymbolicLink()) {
            const target = exported.get(entry)
            if (target) symlinkSync(join(dir, target), join(scope, entry))
          } else symlinkSync(live, join(scope, entry))
        }
      }
    }
    for (const pkg of packages) {
      const local = join(root, pkg.dir, 'node_modules')
      const dest = join(dir, pkg.dir, 'node_modules')
      if (existsSync(local) && !existsSync(dest)) symlinkSync(local, dest)
    }
  } catch (error) {
    dispose()
    throw error
  }
  return { dir, sha, dispose }
}
