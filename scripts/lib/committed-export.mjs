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
import { join, relative } from 'node:path'

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
