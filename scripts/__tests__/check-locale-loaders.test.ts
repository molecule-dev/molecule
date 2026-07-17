import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Guard: every companion-locale-bond a package's i18n loader imports must be a
 * bond that actually exists.
 *
 * Why: user-facing text renders through `t(key, values, { defaultValue })` with
 * the real translations living in a companion `@molecule/{stack}-locales-{name}`
 * bond, wired by a resource/feature's `i18n.ts` calling `registerLocaleModule`.
 * A loader that `import()`s a bond name no package publishes is dead: the
 * try/catch swallows the resolution error at runtime and TS is silenced with a
 * `@ts-expect-error`, so it compiles and "passes" while loading nothing — every
 * locale silently stuck on the inline English default. The package-docs audit
 * (B10 C4) found room-type/subscriber/booking/cart/inventory/order all pointing
 * at phantom bonds, while real bonds (trash, resource-version-history,
 * resource-message) had no loader at all. This guard makes the dead-loader
 * direction — false-positive-free, since a static import path is unambiguous —
 * a hard error so the inconsistency cannot regress.
 *
 * @module
 */

const SCRIPTS_DIR = dirname(dirname(fileURLToPath(import.meta.url))) // .../scripts
const ROOT = join(SCRIPTS_DIR, '..')

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '__tests__'])

/** The real, published locale-bond package names, read from their package.json. */
function realLocalePackageNames(): Set<string> {
  const names = new Set<string>()
  for (const stack of ['api', 'app'] as const) {
    const locDir = join(ROOT, 'packages', stack, 'locales')
    if (!existsSync(locDir)) continue
    for (const name of readdirSync(locDir)) {
      const pkgPath = join(locDir, name, 'package.json')
      if (!existsSync(pkgPath)) continue
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string }
      if (pkg.name) names.add(pkg.name)
    }
  }
  return names
}

/** Recursively collect `.ts`/`.tsx` source, skipping build output, tests, and
 * the locale bonds themselves (data, not loaders). */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (_error) {
    // Missing/unreadable dir (e.g. a stack without a given family) — nothing to
    // scan; returning what we have is the correct, intentional noop.
    return out
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      const p = join(dir, e.name)
      if (p.includes('/locales/')) continue
      collectSourceFiles(p, out)
    } else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts') && !e.name.includes('.test.')) {
      out.push(join(dir, e.name))
    }
  }
  return out
}

// `from '@molecule/api-locales-x'` (static) or `import('@molecule/app-locales-x')`
// (dynamic) — an actual module-resolution site, not a bare doc mention.
const LOCALE_IMPORT_RE =
  /(?:from\s+|import\(\s*)['"](@molecule\/(?:api|app)-locales-[a-z0-9-]+)['"]/g

/** Every locale-bond specifier imported by a loader, with the file it lives in. */
function importedLocaleBonds(): { pkg: string; file: string }[] {
  const found: { pkg: string; file: string }[] = []
  for (const stack of ['api', 'app'] as const) {
    for (const file of collectSourceFiles(join(ROOT, 'packages', stack))) {
      const txt = readFileSync(file, 'utf8')
      for (const m of txt.matchAll(LOCALE_IMPORT_RE)) {
        found.push({ pkg: m[1], file: file.slice(ROOT.length + 1) })
      }
    }
  }
  return found
}

describe('companion-locale-bond loader registration (B10 C4)', () => {
  it('every i18n loader imports a locale bond that actually exists', () => {
    const real = realLocalePackageNames()
    const dead = importedLocaleBonds()
      .filter(({ pkg }) => !real.has(pkg))
      .map(({ pkg, file }) => `${file} → ${pkg}`)
      .sort()
    // A non-empty result means a loader `import()`s a companion locale bond no
    // package publishes: reconcile it to the real bond name, or drop the loader
    // (placeholder i18n.ts) if the resource genuinely ships without one.
    expect(dead).toEqual([])
  })

  it('the reconciled orphan bonds now each have a resolving loader', () => {
    // Regression anchors for the three bonds the audit found publishing
    // translations no resource loaded.
    const bonds = [
      '@molecule/api-locales-trash',
      '@molecule/api-locales-resource-version-history',
      '@molecule/api-locales-resource-message',
    ]
    const imported = new Set(importedLocaleBonds().map(({ pkg }) => pkg))
    const real = realLocalePackageNames()
    for (const bond of bonds) {
      expect(real.has(bond), `${bond} should exist as a package`).toBe(true)
      expect(imported.has(bond), `${bond} should be wired by a resource i18n loader`).toBe(true)
    }
  })
})
