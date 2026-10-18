import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Every companion locale bond must expose a lazy per-language entry.
 *
 * `index.ts` re-exports all ~79 dictionaries, so any `import * as bond from
 * '@molecule/app-locales-<name>'` pulls every language into the importing
 * chunk — that is how flagship apps ended up with 1.7 MB of translations in
 * their entry bundle. `@molecule/app-i18n-default-react` therefore imports each
 * bond's `loader.js` entry instead, and that entry must exist in source, be
 * published through the package's `exports` map, and cover every language the
 * bond ships. A bond without it silently loses its translations for every
 * locale (the loader resolves `undefined`).
 *
 * @module
 */

const ROOT = join(dirname(dirname(dirname(fileURLToPath(import.meta.url)))))
const LOCALE_EXPORT = /^[a-z]{2,3}([A-Z][a-zA-Z]{1,3})?$/
const NON_LANGUAGE_FILES = new Set(['index.ts', 'types.ts', 'loader.ts', 'loadContent.ts'])

/** Locale packages under `packages/<stack>/locales`, as `{ dir, name, modules }`. */
function localeBonds(stack: 'app' | 'api') {
  const root = join(ROOT, 'packages', stack, 'locales')
  if (!existsSync(root)) return []
  const bonds = []
  for (const dir of readdirSync(root)) {
    const pkgPath = join(root, dir, 'package.json')
    if (!existsSync(pkgPath)) continue
    const srcDir = join(root, dir, 'src')
    if (!existsSync(srcDir)) continue
    const modules: Array<{ file: string; code: string }> = []
    for (const file of readdirSync(srcDir)) {
      if (!file.endsWith('.ts') || NON_LANGUAGE_FILES.has(file)) continue
      const exportName = readFileSync(join(srcDir, file), 'utf8').match(/export const (\w+)/)?.[1]
      if (!exportName || !LOCALE_EXPORT.test(exportName)) continue
      modules.push({
        file: file.replace(/\.ts$/, ''),
        code: file.replace(/\.ts$/, '').replace(/_/g, '-'),
      })
    }
    bonds.push({
      dir,
      root,
      name: JSON.parse(readFileSync(pkgPath, 'utf8')).name as string,
      modules,
    })
  }
  return bonds
}

describe('companion locale bonds expose a lazy per-language entry', () => {
  const appBonds = localeBonds('app')

  it('covers the whole app locale fleet', () => {
    // Guards the discovery above: an empty/misrooted scan would make every
    // assertion below vacuously pass.
    expect(appBonds.length).toBeGreaterThan(100)
  })

  it('ships src/loader.ts and publishes it through the exports map', () => {
    const broken: string[] = []
    for (const bond of appBonds) {
      const pkg = JSON.parse(readFileSync(join(bond.root, bond.dir, 'package.json'), 'utf8')) as {
        exports?: Record<string, unknown>
      }
      if (!existsSync(join(bond.root, bond.dir, 'src', 'loader.ts'))) {
        broken.push(`${bond.name}: missing src/loader.ts`)
        continue
      }
      if (!pkg.exports?.['./loader.js']) broken.push(`${bond.name}: exports lacks ./loader.js`)
    }
    // Without the export the loader import fails to resolve in a consumer's
    // build; without the source there is nothing to publish.
    expect(broken).toEqual([])
  })

  it('lists every language module in loader.ts', () => {
    const missing: string[] = []
    for (const bond of appBonds) {
      const loaderPath = join(bond.root, bond.dir, 'src', 'loader.ts')
      if (!existsSync(loaderPath)) continue
      const loader = readFileSync(loaderPath, 'utf8')
      for (const module of bond.modules) {
        const key = /^[a-z]+$/.test(module.code) ? module.code : `'${module.code}'`
        if (!loader.includes(`${key}: () => import('./${module.file}.js')`)) {
          missing.push(`${bond.name}: ${module.code} not loadable`)
        }
      }
    }
    // A language with no loader entry can never be selected through the bond.
    expect(missing).toEqual([])
  })
})
