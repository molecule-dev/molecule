import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { LANGUAGE_DEFINITIONS } from '../languages.js'
import { setupI18nDefault } from '../setup.js'

/**
 * Wait for queued microtasks/macrotasks to settle. The auto-prune in
 * `setupI18nDefault` runs as a background promise — the test needs to
 * yield until every `lazyLoadUi` probe has resolved and the resulting
 * `removeLocale` calls have fired.
 */
const flushAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('setupI18nDefault', () => {
  it('registers every fleet locale when supportedLocales is not provided (back-compat)', () => {
    const provider = setupI18nDefault({
      enUi: {},
      // Return content for every locale so nothing gets pruned by the probe.
      lazyLoadUi: () => Promise.resolve({ 'app.key': 'value' }),
    })
    // Synchronous check — auto-prune happens later, so the initial
    // registration must include every fleet language.
    const codes = provider
      .getLocales()
      .map((l) => l.code)
      .sort()
    const expected = LANGUAGE_DEFINITIONS.map((l) => l.code).sort()
    expect(codes).toEqual(expected)
  })

  it('synchronously prunes locales NOT in supportedLocales (when provided)', () => {
    const provider = setupI18nDefault({
      enUi: {},
      lazyLoadUi: () => Promise.resolve({ 'app.key': 'value' }),
      supportedLocales: ['es', 'fr', 'de'],
    })
    const codes = provider
      .getLocales()
      .map((l) => l.code)
      .sort()
    // 'en' is implicit, so the final set is {en, es, fr, de}.
    expect(codes).toEqual(['de', 'en', 'es', 'fr'])
  })

  it('removes locales whose lazyLoadUi resolves to an empty object', async () => {
    const populated = new Set(['es', 'fr', 'de', 'ja', 'zh', 'pt'])
    const provider = setupI18nDefault({
      enUi: {},
      lazyLoadUi: (code) => Promise.resolve(populated.has(code) ? { 'app.key': 'value' } : {}),
    })
    // Wait a few microtask cycles for the probe to finish.
    for (let i = 0; i < 4; i++) await flushAsync()
    const codes = provider
      .getLocales()
      .map((l) => l.code)
      .sort()
    expect(codes).toEqual(['de', 'en', 'es', 'fr', 'ja', 'pt', 'zh'])
  })

  it('removes locales whose lazyLoadUi rejects (treats failure as unsupported)', async () => {
    const provider = setupI18nDefault({
      enUi: {},
      lazyLoadUi: (code) =>
        code === 'es' ? Promise.resolve({ 'app.key': 'value' }) : Promise.reject(new Error('nope')),
    })
    for (let i = 0; i < 4; i++) await flushAsync()
    const codes = provider
      .getLocales()
      .map((l) => l.code)
      .sort()
    expect(codes).toEqual(['en', 'es'])
  })

  it('registers translations from packageLocales bonds at setup time', () => {
    // Two fake locale bonds, each looking like a `@molecule/app-locales-*`
    // star import: keys that look like locale codes map to translation
    // records; everything else (types, helpers) is ignored.
    const authBond = {
      en: { 'auth.signIn': 'Sign in' },
      es: { 'auth.signIn': 'Iniciar sesión' },
      fr: { 'auth.signIn': 'Se connecter' },
      // Non-locale exports — must be filtered out, not registered:
      AuthTranslations: undefined,
      register: () => {},
    }
    const chatBond = {
      en: { 'chat.send': 'Send' },
      es: { 'chat.send': 'Enviar' },
    }
    const provider = setupI18nDefault({
      enUi: { 'app.greeting': 'Hello' },
      lazyLoadUi: () => Promise.resolve({}),
      supportedLocales: ['es', 'fr'],
      packageLocales: [authBond, chatBond],
    })
    // The English bond translations should be merged into the English
    // bootstrap (alongside enUi).
    expect(provider.t('auth.signIn')).toBe('Sign in')
    expect(provider.t('chat.send')).toBe('Send')
    expect(provider.t('app.greeting')).toBe('Hello')
    // And the Spanish bond translations should be ready when the user
    // switches to Spanish.
    return provider.setLocale('es').then(() => {
      expect(provider.t('auth.signIn')).toBe('Iniciar sesión')
      expect(provider.t('chat.send')).toBe('Enviar')
    })
  })

  it('silently skips bond langs outside LANGUAGE_DEFINITIONS (no crash, no phantom picker entry)', () => {
    // A bond may ship locales the fleet list doesn't register (e.g. `nn`
    // Norwegian Nynorsk, `tl` Tagalog). Setup must NOT throw at registration
    // time, and must NOT auto-create them either — an auto-created locale
    // would appear in the language picker and never be pruned, because the
    // supportedLocales pruning only iterates LANGUAGE_DEFINITIONS.
    const bond = {
      en: { 'feature.greet': 'Hi' },
      es: { 'feature.greet': 'Hola' },
      nn: { 'feature.greet': 'Hei' }, // Norwegian Nynorsk — NOT in fleet
      tl: { 'feature.greet': 'Kumusta' }, // Tagalog — NOT in fleet (fleet uses `fil`)
    }
    let provider!: ReturnType<typeof setupI18nDefault>
    expect(() => {
      provider = setupI18nDefault({
        enUi: {},
        lazyLoadUi: () => Promise.resolve({}),
        supportedLocales: ['es'],
        packageLocales: [bond],
      })
    }).not.toThrow()
    const codes = provider.getLocales().map((l) => l.code)
    expect(codes).not.toContain('nn')
    expect(codes).not.toContain('tl')
    // Fleet locales still received the bond translations.
    expect(provider.t('feature.greet')).toBe('Hi')
  })

  it('per-app lazyLoadUi overrides packageLocales for the same key', async () => {
    // Per-app translations should win over per-package translations
    // because they're the more-specific layer.
    const authBond = {
      es: { 'auth.signIn': 'Iniciar sesión' },
    }
    const provider = setupI18nDefault({
      enUi: {},
      lazyLoadUi: (code) => Promise.resolve(code === 'es' ? { 'auth.signIn': 'Acceder' } : {}),
      supportedLocales: ['es'],
      packageLocales: [authBond],
    })
    await provider.setLocale('es')
    expect(provider.t('auth.signIn')).toBe('Acceder')
  })

  it('per-app enUi overrides packageLocales for ENGLISH too (eager-register path)', () => {
    // English is the one locale whose app translations register eagerly (at
    // provider creation), so bonds — merged later — used to override `enUi`,
    // silently inverting the "apps win when they explicitly translate" rule
    // for the default locale every user sees first.
    const authBond = {
      en: { 'auth.signIn': 'BOND VALUE' },
    }
    const provider = setupI18nDefault({
      enUi: { 'auth.signIn': 'App value' },
      lazyLoadUi: () => Promise.resolve({}),
      supportedLocales: [],
      packageLocales: [authBond],
    })
    expect(provider.t('auth.signIn')).toBe('App value')
  })

  it('registers regional bond exports named like zhTW under the canonical zh-TW code', async () => {
    // ES export identifiers can't contain hyphens, so every locale bond ships
    // `export const zhTW = {...}` while the fleet registers the locale as
    // 'zh-TW'. These used to be silently dropped (the code-shaped filter
    // rejected `zhTW`), losing all package translations for regional locales.
    const bond = {
      zhTW: { 'auth.signIn': '登入' },
    }
    const provider = setupI18nDefault({
      enUi: {},
      lazyLoadUi: () => Promise.resolve({ 'app.key': 'value' }),
      supportedLocales: ['zh-TW'],
      packageLocales: [bond],
    })
    await provider.setLocale('zh-TW')
    expect(provider.t('auth.signIn')).toBe('登入')
  })

  it('regional locales fall back to their base language for common translations (es-MX → es)', async () => {
    // The common bond has no `esMX` export — es-MX used to silently get the
    // ENGLISH common strings while the rest of the page rendered in Spanish.
    const provider = setupI18nDefault({
      enUi: {},
      lazyLoadUi: () => Promise.resolve({ 'app.key': 'value' }),
      supportedLocales: ['es-MX'],
    })
    await provider.setLocale('es-MX')
    expect(provider.t('common.close')).toBe('Cerrar')
  })

  describe('packageLocaleLoaders (lazy companion bonds)', () => {
    it('loads a companion bond only when its locale is selected', async () => {
      const calls: string[] = []
      const authLoader = async (code: string) => {
        calls.push(`auth:${code}`)
        return code === 'es' ? { 'auth.signIn': 'Iniciar sesión' } : undefined
      }
      const provider = setupI18nDefault({
        enUi: {},
        lazyLoadUi: () => Promise.resolve({}),
        supportedLocales: ['es'],
        packageLocaleLoaders: [authLoader],
      })
      // English is the default locale, so its dictionaries are requested at
      // setup (asynchronously) — but nothing for `es` is fetched until the
      // user actually switches to it.
      expect(calls).toEqual(['auth:en'])
      await provider.setLocale('es')
      expect(calls).toEqual(['auth:en', 'auth:es'])
      expect(provider.t('auth.signIn')).toBe('Iniciar sesión')
      // ...and switching back does not re-fetch that locale's dictionaries.
      await provider.setLocale('en')
      await provider.setLocale('es')
      expect(calls).toEqual(['auth:en', 'auth:es'])
    })

    it('merges common bond < companion bonds < the app ui.ts, in that order', async () => {
      const provider = setupI18nDefault({
        enUi: {},
        lazyLoadUi: () => Promise.resolve({ 'common.close': 'App close', 'app.key': 'ui' }),
        supportedLocales: ['es'],
        packageLocaleLoaders: [async () => ({ 'common.close': 'Bond close' })],
      })
      await provider.setLocale('es')
      // The app's own translation wins; the companion bond beats the common
      // dictionary for a key the app does not translate.
      expect(provider.t('common.close')).toBe('App close')
      expect(provider.t('app.key')).toBe('ui')
    })

    it('keeps the rest of a locale when one companion bond rejects', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const provider = setupI18nDefault({
        enUi: {},
        lazyLoadUi: () => Promise.resolve({ 'app.key': 'value' }),
        supportedLocales: ['es'],
        packageLocaleLoaders: [
          async (code) => {
            if (code === 'es') throw new Error('bond chunk failed to load')
            return undefined
          },
          async () => ({ 'auth.signIn': 'Iniciar sesión' }),
        ],
      })
      await provider.setLocale('es')
      expect(provider.t('auth.signIn')).toBe('Iniciar sesión')
      expect(warn).toHaveBeenCalledTimes(1)
      warn.mockRestore()
    })

    it('enriches English from the companion bonds after setup (default locale)', async () => {
      const provider = setupI18nDefault({
        enUi: { 'app.greeting': 'Hello' },
        lazyLoadUi: () => Promise.resolve({}),
        supportedLocales: [],
        packageLocaleLoaders: [async () => ({ 'auth.signIn': 'Sign in', 'app.greeting': 'Bond' })],
      })
      // Loaded asynchronously so first paint never waits on the dictionaries.
      for (let i = 0; i < 2; i++) await flushAsync()
      expect(provider.t('auth.signIn')).toBe('Sign in')
      // The app's own English still wins.
      expect(provider.t('app.greeting')).toBe('Hello')
    })
  })

  it('never star-imports the common locale bond (that pulls all 79 dictionaries)', () => {
    // A star-import of `@molecule/app-locales-common` in this package shipped
    // every language's common dictionary inside EVERY consuming app's entry
    // chunk. Only the per-language loader entry may be imported here.
    const source = readFileSync(join(import.meta.dirname, '..', 'setup.ts'), 'utf8')
    expect(source).not.toMatch(/import \* as \w+ from '@molecule\/app-locales-common'/)
    expect(source).toContain("from '@molecule/app-locales-common/loader.js'")
    expect(source).toContain("from '@molecule/app-locales-common/en.js'")
  })
})
