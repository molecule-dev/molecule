import { describe, expect, it } from 'vitest'

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
})
