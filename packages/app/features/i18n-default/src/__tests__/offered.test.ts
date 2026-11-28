import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupI18nDefault } from '../offered.js'

const { loadedCommon } = vi.hoisted(() => ({ loadedCommon: vi.fn() }))
vi.mock('@molecule/app-locales-common/loader.js', async (importOriginal) => {
  loadedCommon()
  return { ...(await importOriginal<Record<string, unknown>>()) }
})

/**
 * The modules a source file imports from this package, followed to every file they reach, and the
 * packages each of them imports.
 *
 * @param entry - The file name under src/.
 * @returns Every package specifier the entry reaches.
 */
function packagesReached(entry: string): Set<string> {
  const seen = new Set<string>()
  const packages = new Set<string>()
  const visit = (file: string): void => {
    if (seen.has(file)) return
    seen.add(file)
    const source = readFileSync(join(import.meta.dirname, '..', file), 'utf8')
    for (const [, specifier] of source.matchAll(/^(?:import|export)[^'"]*from '([^']+)'/gm)) {
      if (specifier!.startsWith('./')) visit(specifier!.slice(2).replace(/\.js$/, '.ts'))
      else packages.add(specifier!)
    }
  }
  visit(entry)
  return packages
}

// An app that offers a few languages loads each locale bond, the common bond included, through
// its own per-language modules. The default entry imports the common bond's loader.js, which
// lists all 79 languages, so the app's build carried 79 common chunks it never fetched.
describe('setupI18nDefault from offered.js', () => {
  it('reaches no locale bond', () => {
    const reached = [...packagesReached('offered.ts')]
    expect(reached.filter((name) => name.startsWith('@molecule/app-locales-'))).toEqual([])
    // The default entry still loads the common bond itself.
    expect([...packagesReached('setup.ts')]).toContain('@molecule/app-locales-common/loader.js')
  })

  it("takes the common strings from the app's loaders", async () => {
    const loadPackages = vi.fn(async (code: string) =>
      code === 'fr' ? { 'common.close': 'Fermer (app)', 'bond.action': 'Action du module' } : {},
    )
    const provider = setupI18nDefault({
      primaryLocale: 'fr',
      primaryUi: { 'app.action': 'Action de l’application' },
      supportedLocales: ['fr'],
      lazyLoadUi: async () => ({}),
      packageLocaleLoaders: [loadPackages],
    })
    expect(provider.t('app.action')).toBe('Action de l’application')
    await vi.waitFor(() => expect(provider.t('bond.action')).toBe('Action du module'))
    expect(provider.t('common.close')).toBe('Fermer (app)')
    expect(loadPackages.mock.calls).toEqual([['fr']])
    expect(loadedCommon).not.toHaveBeenCalled()
  })
})
