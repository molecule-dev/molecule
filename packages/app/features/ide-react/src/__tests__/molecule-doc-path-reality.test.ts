import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { moleculeDocPath } from '../components/tool-call-utilities.js'

/**
 * Reality anchor for the doc path the find_package / read_molecule_doc cards
 * open on click.
 *
 * `moleculeDocPath` builds `/workspace/node_modules/@molecule/<pkg>/<doc file>`
 * from a CONSTANT filename — and the sandbox resolves that path against real
 * npm installs. When the fleet renamed the generated doc MOLECULE.md →
 * README.md (2026-08-04), this constant was missed, and every card click
 * silently opened a nonexistent file for two months: the view switched, the
 * editor stayed empty, and the unit tests kept passing because they asserted
 * the same wrong constant the code built.
 *
 * So this suite does what a string-equality test cannot: it resolves the REAL
 * installed `@molecule/*` tree (in molecule's workspace every package is
 * linked into `node_modules/@molecule/*`, and npm tarballs carry the same
 * README.md the links do) and asserts the filename `moleculeDocPath` names
 * exists in every one of them. A doc-file rename that misses the card code now
 * fails HERE, on every push, instead of in front of users.
 */

/** Walk up from this test to the richest `node_modules/@molecule` directory. */
function resolveMoleculeScopeDir(): string | null {
  let best: { dir: string; count: number } | null = null
  let dir = import.meta.dirname
  for (;;) {
    const scope = join(dir, 'node_modules', '@molecule')
    if (existsSync(scope)) {
      const count = readdirSync(scope).length
      if (count > 0 && (best === null || count > best.count)) best = { dir: scope, count }
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return best?.dir ?? null
}

describe('moleculeDocPath reality anchor', () => {
  it('names a doc file that every installed @molecule package actually ships', () => {
    const scopeDir = resolveMoleculeScopeDir()
    expect(
      scopeDir,
      'no node_modules/@molecule tree found walking up from this test — the reality ' +
        'anchor cannot run. This suite expects the molecule workspace (or a standalone ' +
        'install of this package, whose devDependencies pull real @molecule tarballs).',
    ).not.toBeNull()

    const entries = readdirSync(scopeDir!)
    expect(entries.length).toBeGreaterThan(0)

    // The filename is taken FROM the function under test, not restated here —
    // that is the point: the code and reality are compared, never copied.
    const sample = moleculeDocPath(entries[0])
    expect(sample).not.toBeNull()
    const docFile = sample!.split('/').pop()!

    const missing = entries.filter((entry) => !existsSync(join(scopeDir!, entry, docFile)))
    expect(
      missing,
      `${missing.length} installed @molecule packages lack ${docFile} — the card doc ` +
        'path points at a file the fleet no longer ships. Update moleculeDocPath to ' +
        'the filename packages actually carry.',
    ).toEqual([])
  })

  it('opens a concrete well-known package at a path that resolves in the tree', () => {
    const scopeDir = resolveMoleculeScopeDir()
    expect(scopeDir).not.toBeNull()
    const docFile = moleculeDocPath('app-ui')!.split('/').pop()!
    // app-ui is a devDependency of this package, so it is present in every
    // install shape this suite runs in (workspace link or registry tarball).
    expect(existsSync(join(scopeDir!, 'app-ui', docFile))).toBe(true)
  })
})
