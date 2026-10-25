/**
 * The optional provider revision the React store snapshot reads.
 *
 * `getRevision` is the additive, optional `I18nProvider` member the React hooks
 * compare across renders, so they see a change that happened before their
 * listener existed: a notification fired from a child's or an earlier sibling's
 * layout effect, or while React keeps a tree hidden (`<Activity mode="hidden">`)
 * with its effects unmounted. `createSimpleI18nProvider` implements it; this
 * owned bond must too, or an i18next-backed app keeps the old text in exactly
 * those windows.
 *
 * The revision tracks what the provider ANNOUNCES: a locale switch, a
 * locale-list change, text added for a locale `t()` reads (any locale in
 * i18next's resolution chain `i18n.languages`: the active one, its base
 * language and the fallbacks), and the settling of initialization. It stays
 * quiet for a re-registration that leaves every rendered string identical.
 */
import { describe, expect, it } from 'vitest'

import { createI18nextProvider } from '../provider.js'
import type { LocaleConfig } from '../types.js'

/**
 * Fresh locale configs per provider. i18next's `init({ resources })` keeps the
 * `translations` objects BY REFERENCE, so a shared constant would let one test's
 * `addResourceBundle` leak into the next provider's store.
 *
 * @returns The locale configs.
 */
const locales = (): LocaleConfig[] => [
  { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
  { code: 'fr', name: 'French', direction: 'ltr', translations: { greeting: 'Bonjour' } },
]

/**
 * Builds an initialized provider pinned to `en`, with no browser detection.
 *
 * @returns The provider.
 */
const create = () =>
  createI18nextProvider({
    defaultLocale: 'en',
    fallbackLocale: 'en',
    locales: locales(),
    detection: false,
  })

/**
 * An asynchronous language detector that settles only when the test calls
 * `settle`, so a test can act while i18next's initialization is pending.
 *
 * @returns The i18next plugin and the function that settles detection.
 */
const pendingDetector = (): { plugin: unknown; settle: (lng: string) => void } => {
  let detected: ((lng: string) => void) | undefined
  return {
    plugin: {
      type: 'languageDetector',
      async: true,
      init: () => {},
      detect: (callback: (lng: string) => void) => {
        detected = callback
      },
      cacheUserLanguage: () => {},
    },
    settle: (lng) => {
      if (!detected) throw new Error('i18next has not asked the detector yet')
      detected(lng)
    },
  }
}

describe('the i18next bond exposes the optional provider revision', () => {
  it('exposes a number', async () => {
    const provider = create()
    await provider.initialize()
    expect(typeof provider.getRevision?.()).toBe('number')
  })

  it('each provider instance has its own revision', async () => {
    const a = create()
    const b = create()
    await Promise.all([a.initialize(), b.initialize()])
    a.addTranslations('en', { extra: 'Extra' })
    expect(a.getRevision?.()).toBeGreaterThan(b.getRevision?.() ?? 0)
  })
})

describe('the revision advances for every announced change', () => {
  it('advances with no listener attached', async () => {
    const provider = create()
    await provider.initialize()
    const before = provider.getRevision?.() ?? 0
    // No `onLocaleChange` subscriber exists: the change must still be visible.
    provider.addTranslations('en', { late: 'Loaded' })
    expect(provider.getRevision?.()).toBeGreaterThan(before)
  })

  it('advances on setLocale, addLocale and a successful removeLocale', async () => {
    const provider = create()
    await provider.initialize()
    const revisions: number[] = [provider.getRevision?.() ?? -1]
    await provider.setLocale('fr')
    revisions.push(provider.getRevision?.() ?? -1)
    provider.addLocale({ code: 'de', name: 'German', translations: { greeting: 'Hallo' } })
    revisions.push(provider.getRevision?.() ?? -1)
    provider.removeLocale('de')
    revisions.push(provider.getRevision?.() ?? -1)
    for (let i = 1; i < revisions.length; i += 1) {
      expect(revisions[i]).toBeGreaterThan(revisions[i - 1])
    }
  })

  it('advances for fallback-locale translations the rendered text reads', async () => {
    const provider = create()
    await provider.initialize()
    await provider.setLocale('fr')
    const before = provider.getRevision?.() ?? 0
    // French is active and lacks the key; `t()` reads the English fallback.
    provider.addTranslations('en', { lateKey: 'Loaded' })
    expect(provider.getRevision?.()).toBeGreaterThan(before)
    expect(provider.t('lateKey')).toBe('Loaded')
  })

  it('announces a translation registered before initialize() settled', async () => {
    // The standard startup sequence registers content synchronously after
    // `setProvider(provider)`; i18next's deferred init replays those bundles.
    // That delivery is the notification `addTranslations` promises.
    const provider = create()
    const before = provider.getRevision?.() ?? -1
    provider.addTranslations('en', { startup: 'Startup' })
    await provider.initialize()
    expect(provider.getRevision?.() ?? -1).toBeGreaterThan(before)
    expect(provider.t('startup')).toBe('Startup')
  })

  it('announces a lazy locale loaded during initialize()', async () => {
    // Detection can land on a locale whose text comes from a `loader`; that load
    // runs inside `initialize()`, after the first render can already have shown
    // fallback text, so its delivery has to be announced too.
    const provider = createI18nextProvider({
      defaultLocale: 'es',
      fallbackLocale: 'en',
      detection: false,
      locales: [
        { code: 'en', name: 'English', direction: 'ltr', translations: { greeting: 'Hello' } },
        {
          code: 'es',
          name: 'Español',
          direction: 'ltr',
          loader: async () => ({ greeting: 'Hola' }),
        },
      ],
    })
    const before = provider.getRevision?.() ?? -1
    await provider.initialize()
    expect(provider.t('greeting')).toBe('Hola')
    expect(provider.getRevision?.() ?? -1).toBeGreaterThan(before)
  })
})

describe('the revision stays quiet when nothing rendered changes', () => {
  it('does not advance for an identical re-registration', async () => {
    const provider = create()
    await provider.initialize()
    provider.addTranslations('en', { late: 'Loaded' })
    const afterFirst = provider.getRevision?.() ?? 0
    provider.addTranslations('en', { late: 'Loaded' })
    expect(provider.getRevision?.()).toBe(afterFirst)
  })

  it('does not advance for a locale nothing currently renders', async () => {
    const provider = create()
    await provider.initialize()
    const before = provider.getRevision?.() ?? 0
    provider.addTranslations('fr', { greeting: 'Salut' })
    expect(provider.getRevision?.()).toBe(before)
  })

  it('stays quiet while init is pending for text no rendered locale reads', () => {
    const provider = create()
    const before = provider.getRevision?.() ?? -1
    provider.addTranslations('fr', { greeting: 'Salut' })
    expect(provider.getRevision?.()).toBe(before)
  })

  it('stays quiet while init is pending for an identical re-registration', () => {
    const provider = create()
    const before = provider.getRevision?.() ?? -1
    provider.addTranslations('en', { greeting: 'Hello' })
    expect(provider.getRevision?.()).toBe(before)
  })

  it('does not advance when removing a locale that was never registered', async () => {
    const provider = create()
    await provider.initialize()
    const before = provider.getRevision?.() ?? 0
    expect(provider.removeLocale('de')).toBe(false)
    expect(provider.getRevision?.()).toBe(before)
  })
})

describe("the locales t() reads are i18next's resolution chain", () => {
  it('advances for the base language of the active regional locale', async () => {
    const provider = createI18nextProvider({
      defaultLocale: 'en',
      fallbackLocale: 'en',
      detection: false,
      locales: [
        { code: 'en', name: 'English', translations: { greeting: 'Hello' } },
        { code: 'pt', name: 'Português', translations: { greeting: 'Olá' } },
        { code: 'pt-BR', name: 'Português (Brasil)', translations: {} },
      ],
    })
    await provider.initialize()
    await provider.setLocale('pt-BR')
    const before = provider.getRevision?.() ?? 0
    // pt-BR lacks the key; `t()` reads its base language next.
    provider.addTranslations('pt', { greeting: 'Oi' })
    expect(provider.t('greeting')).toBe('Oi')
    expect(provider.getRevision?.()).toBeGreaterThan(before)
  })

  it('advances for a fallback configured through i18nextOptions.fallbackLng', async () => {
    const provider = createI18nextProvider({
      defaultLocale: 'en',
      detection: false,
      locales: [
        { code: 'en', name: 'English', translations: {} },
        { code: 'de', name: 'Deutsch', translations: {} },
        { code: 'fr', name: 'Français', translations: {} },
      ],
      i18nextOptions: { fallbackLng: ['de', 'en'] },
    })
    await provider.initialize()
    await provider.setLocale('fr')
    const before = provider.getRevision?.() ?? 0
    provider.addTranslations('de', { greeting: 'Hallo' })
    expect(provider.t('greeting')).toBe('Hallo')
    expect(provider.getRevision?.()).toBeGreaterThan(before)
  })
})

describe('the settling of initialization is announced', () => {
  it('announces the language an asynchronous detector settled on', async () => {
    const detector = pendingDetector()
    const provider = createI18nextProvider({
      defaultLocale: 'en',
      fallbackLocale: 'en',
      locales: locales(),
      plugins: [detector.plugin],
    })
    const heard: string[] = []
    provider.onLocaleChange((locale) => heard.push(locale))
    detector.settle('fr')
    await provider.initialize()
    expect(provider.getLocale()).toBe('fr')
    // i18next's own `languageChanged` fired inside init, before the bond listened.
    expect(heard).toEqual(['fr'])
  })

  it('reports what getLocale() returns while the detector is still pending', async () => {
    // Listeners read the argument (`@molecule/app-solid` stores it as the
    // locale), so it must be the locale `getLocale()` reports, not the fallback.
    const detector = pendingDetector()
    const provider = createI18nextProvider({
      defaultLocale: 'en',
      fallbackLocale: 'de',
      locales: locales(),
      plugins: [detector.plugin],
    })
    const heard: string[] = []
    provider.onLocaleChange((locale) => heard.push(locale))
    provider.addLocale({ code: 'it', name: 'Italiano', translations: { greeting: 'Ciao' } })
    expect(provider.getLocale()).toBe('en')
    expect(heard).toEqual(['en'])
    detector.settle('fr')
    await provider.initialize()
    expect(heard).toEqual(['en', 'fr'])
  })

  it('announces a locale created while initialize() is pending, as it does afterwards', async () => {
    const provider = create()
    const before = provider.getRevision?.() ?? -1
    provider.addTranslations('de', { greeting: 'Hallo' })
    expect(provider.getRevision?.()).toBeGreaterThan(before)
    expect(provider.getLocales().map((locale) => locale.code)).toContain('de')
    await provider.initialize()
  })

  it('announces a failed initialization once and keeps announcing text changes after it', async () => {
    const provider = createI18nextProvider({
      defaultLocale: 'es',
      fallbackLocale: 'en',
      detection: false,
      locales: [
        { code: 'en', name: 'English', translations: { greeting: 'Hello' } },
        {
          code: 'es',
          name: 'Español',
          loader: async () => {
            throw new Error('chunk failed to load')
          },
        },
      ],
    })
    const heard: string[] = []
    provider.onLocaleChange((locale) => heard.push(locale))
    await expect(provider.initialize()).rejects.toThrow('chunk failed to load')
    expect(heard).toEqual(['es'])
    const before = provider.getRevision?.() ?? 0
    provider.addTranslations('es', { greeting: 'Hola' })
    expect(provider.t('greeting')).toBe('Hola')
    expect(provider.getRevision?.()).toBeGreaterThan(before)
  })
})
