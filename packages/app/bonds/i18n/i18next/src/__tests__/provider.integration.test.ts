/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual i18next +
 * i18next-browser-languagedetector.
 *
 * The unit suite (`index.test.ts`) mocks i18next, so it can only validate OUR
 * assumptions about i18next — not i18next. That gap let a whole feature ship
 * dead: passing `lng: defaultLocale` to `init()` makes real i18next skip the
 * language detector entirely (`changeLanguage(lng)` only calls `detect()` when
 * lng is undefined), so `detection: true` — the documented default — never
 * detected anything. The mocked init couldn't feel that. Every bond wrapping a
 * pure-local dependency should carry a file like this one; the unit mocks stay
 * for shape/edge cases.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { LocaleConfig } from '../types.js'
import { createI18nextProvider, provider as defaultProvider } from '../provider.js'

const LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    translations: {
      greeting: 'Hello',
      welcome: 'Welcome, {{ name }}!',
      item_one: '{{count}} item',
      item_other: '{{count}} items',
      'en.only': 'English only',
    },
  },
  {
    code: 'fr',
    name: 'Français',
    translations: { greeting: 'Bonjour' },
  },
]

describe('@molecule/app-i18n-i18next × REAL i18next', () => {
  it('full lifecycle: init → translate → interpolate → pluralize → switch locale → format', async () => {
    const p = createI18nextProvider({ detection: false, locales: LOCALES })
    await p.initialize()

    expect(p.getLocale()).toBe('en')
    expect(p.t('greeting')).toBe('Hello')
    // Real i18next trims interpolation tokens — "{{ name }}" with inner
    // whitespace (the way translators actually write it) must interpolate.
    expect(p.t('welcome', { name: 'John' })).toBe('Welcome, John!')
    // Real CLDR plural suffix resolution (i18next v21+ `_one`/`_other`).
    expect(p.t('item', undefined, { count: 1 })).toBe('1 item')
    expect(p.t('item', undefined, { count: 5 })).toBe('5 items')

    await p.setLocale('fr')
    expect(p.getLocale()).toBe('fr')
    expect(p.t('greeting')).toBe('Bonjour')
    // Key missing from fr falls back to fallbackLng (defaultLocale) — a
    // partially-translated locale renders English text, never the raw key.
    expect(p.t('en.only')).toBe('English only')

    await p.setLocale('en')
    // Real Intl formatting for the active locale.
    expect(p.formatNumber(1234.5)).toBe('1,234.5')
    expect(p.formatList(['a', 'b', 'c'])).toBe('a, b, and c')
  })

  it('CONSUMER PROPERTY: translations registered during the create → init window survive', async () => {
    // The standard startup sequence is synchronous: `setProvider(provider)`
    // followed immediately by `registerLocaleModule(...)`/`addTranslations(...)`
    // — all BEFORE the auto-init promise settles. Real i18next's deferred init
    // REPLACES the resource store with `init({ resources })`, so without the
    // pending-bundle replay these registrations silently vanish.
    const p = createI18nextProvider({ detection: false, locales: LOCALES })
    p.addTranslations('en', { 'auth.signIn': 'Sign in' })
    p.addLocale({ code: 'de', name: 'Deutsch', translations: { greeting: 'Hallo' } })
    await p.initialize()

    expect(p.t('auth.signIn')).toBe('Sign in')
    await p.setLocale('de')
    expect(p.t('greeting')).toBe('Hallo')
  })

  it('CONSUMER PROPERTY: `detection: true` (the default) actually detects — ?lng= beats defaultLocale', async () => {
    // Real i18next only consults the detector when no explicit `lng` reaches
    // init(). This pins the fix for the dead-detection trap: with a `?lng=fr`
    // querystring (first entry in the bond's default detection order), a
    // provider created with defaultLocale 'en' must come up in French.
    ;(globalThis as { window?: unknown }).window = {
      location: { search: '?lng=fr', hash: '' },
    }
    try {
      const p = createI18nextProvider({ defaultLocale: 'en', locales: LOCALES })
      await p.initialize()
      expect(p.getLocale()).toBe('fr')
      expect(p.t('greeting')).toBe('Bonjour')
    } finally {
      delete (globalThis as { window?: unknown }).window
    }
  })

  it('CONSUMER PROPERTY: a DETECTED locale with a lazy loader renders translated, not fallback text', async () => {
    // Detection can land on a locale whose translations come from a lazy
    // `loader` (the standard fleet setup). Loaders used to run only inside
    // setLocale(), so a detected locale reported e.g. 'es' while every string
    // rendered in English — the picker and the page disagreed.
    ;(globalThis as { window?: unknown }).window = {
      location: { search: '?lng=es', hash: '' },
    }
    try {
      let loads = 0
      const p = createI18nextProvider({
        defaultLocale: 'en',
        locales: [
          LOCALES[0],
          {
            code: 'es',
            name: 'Español',
            loader: async () => {
              loads += 1
              return { greeting: 'Hola' }
            },
          },
        ],
      })
      await p.initialize()
      expect(p.getLocale()).toBe('es')
      expect(p.t('greeting')).toBe('Hola')
      // And the loader is not re-run by a later explicit setLocale.
      await p.setLocale('en')
      await p.setLocale('es')
      expect(loads).toBe(1)
    } finally {
      delete (globalThis as { window?: unknown }).window
    }
  })

  it('CONSUMER PROPERTY: detection enabled with nothing to detect still renders the default locale', async () => {
    // SSR / tests / first paint with no querystring: the detector finds
    // nothing (or a navigator language without resources) and the provider
    // must gracefully resolve translations via fallbackLng — never throw,
    // never render raw keys.
    const p = createI18nextProvider({ defaultLocale: 'en', locales: LOCALES })
    await p.initialize()
    expect(p.t('greeting')).toBe('Hello')
    expect(typeof p.getLocale()).toBe('string')
  })

  it('lazy locale loader runs exactly once and its translations render', async () => {
    let loads = 0
    const p = createI18nextProvider({
      detection: false,
      locales: [
        LOCALES[0],
        {
          code: 'es',
          name: 'Español',
          loader: async () => {
            loads += 1
            return { greeting: 'Hola' }
          },
        },
      ],
    })
    await p.initialize()
    await p.setLocale('es')
    expect(p.t('greeting')).toBe('Hola')
    await p.setLocale('en')
    await p.setLocale('es')
    expect(p.t('greeting')).toBe('Hola')
    expect(loads).toBe(1)
  })

  it('FAILURE DISAMBIGUATION: missing key vs defaultValue vs unknown locale are all tellable apart', async () => {
    const p = createI18nextProvider({ detection: false, locales: LOCALES })
    await p.initialize()

    // A missing key echoes the KEY (and exists() is false) — distinguishable
    // from a real translation (exists() true) and from a defaultValue render.
    expect(p.t('nope.missing')).toBe('nope.missing')
    expect(p.exists('nope.missing')).toBe(false)
    expect(p.t('nope.missing', undefined, { defaultValue: 'Fallback' })).toBe('Fallback')
    expect(p.exists('greeting')).toBe(true)

    // removeLocale reports whether anything was actually removed.
    expect(p.removeLocale?.('never-added')).toBe(false)
    expect(p.removeLocale?.('fr')).toBe(true)

    // Switching to an unregistered locale does not throw with real i18next —
    // rendering degrades to fallbackLng text instead of crashing the app.
    // (NOTE: the core simple provider THROWS here instead; divergence is
    // tracked as an audit finding, this pins the i18next bond's contract.)
    await p.setLocale('xx')
    expect(p.t('greeting')).toBe('Hello')
  })

  it('getDirection derives RTL from real i18next when LocaleConfig omits direction', async () => {
    const p = createI18nextProvider({
      detection: false,
      locales: [LOCALES[0], { code: 'ar', name: 'العربية', translations: { greeting: 'مرحبا' } }],
    })
    await p.initialize()
    expect(p.getDirection()).toBe('ltr')
    await p.setLocale('ar')
    expect(p.getDirection()).toBe('rtl')
  })

  it('formatDate({ relative: true }) works even when the method is destructured off the provider', async () => {
    const p = createI18nextProvider({ detection: false, locales: LOCALES })
    await p.initialize()
    const { formatDate } = p
    // Exactly 2h back (rounding is stable for any sub-minute test overhead).
    expect(formatDate(new Date(Date.now() - 2 * 3_600_000), { relative: true })).toBe('2 hours ago')
    expect(formatDate('not-a-date')).toBe('Invalid Date')
  })

  it('the module-level default provider initializes without a browser environment', async () => {
    // Import-time side effect: `provider` auto-initializes with detection on.
    // In Node (no window/document) this must degrade gracefully, not crash.
    await defaultProvider.initialize()
    expect(defaultProvider.t('missing.key', undefined, { defaultValue: 'ok' })).toBe('ok')
  })
})
