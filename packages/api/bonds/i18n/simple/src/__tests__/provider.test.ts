import { beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, provider } from '../provider.js'

describe('@molecule/api-i18n-simple', () => {
  describe('createSimpleI18nProvider', () => {
    it('should create a provider with default locale "en"', () => {
      const i18n = createSimpleI18nProvider()
      expect(i18n.getLocale()).toBe('en')
    })

    it('should create a provider with custom initial locale', () => {
      const i18n = createSimpleI18nProvider('fr', [
        { code: 'fr', name: 'French', translations: {} },
      ])
      expect(i18n.getLocale()).toBe('fr')
    })

    it('should always include English as a fallback', () => {
      const i18n = createSimpleI18nProvider()
      const locales = i18n.getLocales()
      expect(locales.some((l) => l.code === 'en')).toBe(true)
    })
  })

  describe('default provider export', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.getLocale()).toBe('en')
    })
  })

  describe('locale management', () => {
    let i18n: ReturnType<typeof createSimpleI18nProvider>

    beforeEach(() => {
      i18n = createSimpleI18nProvider('en', [
        { code: 'en', name: 'English', direction: 'ltr', translations: {} },
        { code: 'fr', name: 'French', direction: 'ltr', translations: {} },
      ])
    })

    it('should switch locale', () => {
      i18n.setLocale('fr')
      expect(i18n.getLocale()).toBe('fr')
    })

    it('should throw when switching to unknown locale', () => {
      expect(() => i18n.setLocale('xx')).toThrow('Locale "xx" not found')
    })

    it('should list available locales', () => {
      const locales = i18n.getLocales()
      expect(locales).toHaveLength(2)
      expect(locales.map((l) => l.code)).toContain('en')
      expect(locales.map((l) => l.code)).toContain('fr')
    })

    it('should add new locale', () => {
      i18n.addLocale({ code: 'de', name: 'German', translations: {} })
      const locales = i18n.getLocales()
      expect(locales.map((l) => l.code)).toContain('de')
    })
  })

  describe('translations', () => {
    let i18n: ReturnType<typeof createSimpleI18nProvider>

    beforeEach(() => {
      i18n = createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          direction: 'ltr',
          translations: {
            greeting: 'Hello',
            farewell: 'Goodbye',
            'nested.key': 'Nested value',
            welcome: 'Welcome, {{name}}!',
          },
        },
        {
          code: 'fr',
          name: 'French',
          direction: 'ltr',
          translations: {
            greeting: 'Bonjour',
          },
        },
      ])
    })

    it('should translate simple keys', () => {
      expect(i18n.t('greeting')).toBe('Hello')
    })

    it('should return key when translation is missing', () => {
      expect(i18n.t('unknown.key')).toBe('unknown.key')
    })

    it('should return defaultValue when translation is missing', () => {
      expect(i18n.t('unknown.key', undefined, { defaultValue: 'Fallback' })).toBe('Fallback')
    })

    it('should interpolate values into the defaultValue when translation is missing', () => {
      // The defaultValue is the rendered English fallback — it must be
      // interpolated exactly like catalog text (the core no-provider fallback
      // and i18next both do). Features whose keys ship no locale bond (e.g.
      // @molecule/api-email-templates' built-in defaults) render ONLY through
      // this path; returning the raw defaultValue shipped literal
      // `{{placeholders}}` in transactional emails.
      expect(i18n.t('unknown.key', { name: 'World' }, { defaultValue: 'Hello, {{name}}!' })).toBe(
        'Hello, World!',
      )
    })

    it('should interpolate count into the defaultValue when translation is missing', () => {
      expect(i18n.t('unknown.key', undefined, { defaultValue: '{{count}} items', count: 3 })).toBe(
        '3 items',
      )
    })

    it('should interpolate values', () => {
      expect(i18n.t('welcome', { name: 'World' })).toBe('Welcome, World!')
    })

    it('should translate for specified locale', () => {
      expect(i18n.t('greeting', undefined, { locale: 'fr' })).toBe('Bonjour')
    })

    it('should fall back to English for unknown locale', () => {
      expect(i18n.t('greeting', undefined, { locale: 'xx' })).toBe('Hello')
    })

    it('should add translations to existing locale', () => {
      i18n.addTranslations('en', { newKey: 'New value' })
      expect(i18n.t('newKey')).toBe('New value')
    })

    it('should add translations with namespace', () => {
      i18n.addTranslations('en', { title: 'My Page' }, 'page')
      expect(i18n.t('page.title')).toBe('My Page')
    })

    it('should create locale when adding translations to unknown locale', () => {
      i18n.addTranslations('de', { greeting: 'Hallo' })
      i18n.addLocale({ code: 'de', name: 'German', translations: { greeting: 'Hallo' } })
      i18n.setLocale('de')
      expect(i18n.t('greeting')).toBe('Hallo')
    })

    it('should check if key exists', () => {
      expect(i18n.exists('greeting')).toBe(true)
      expect(i18n.exists('nonexistent')).toBe(false)
    })

    it('exists() reports true via the English fallback (matches t()) for a key missing from the active locale', () => {
      // FAILURE-DISAMBIGUATION regression: exists() previously checked ONLY
      // the active locale's own catalog, so it disagreed with t() (which
      // falls back to English) for every partially-translated locale.
      i18n.setLocale('fr')
      expect(i18n.t('farewell')).toBe('Goodbye') // renders via English fallback
      expect(i18n.exists('farewell')).toBe(true) // must agree with t()
      expect(i18n.exists('nonexistent')).toBe(false) // truly absent stays false
    })
  })

  describe('plural resolution order (matches i18next)', () => {
    it('prefers the plural-suffixed key over the base key when count is provided', () => {
      // Regression: previously the base `key` won whenever it existed, so a
      // catalog shipping both `item` and `item_one`/`item_other` never
      // pluralized under this provider even though i18next-backed bonds did.
      const i18n = createSimpleI18nProvider('en', [
        {
          code: 'en',
          name: 'English',
          translations: {
            item: 'the item (no count)',
            item_one: '{{count}} item',
            item_other: '{{count}} items',
          },
        },
      ])
      expect(i18n.t('item', undefined, { count: 1 })).toBe('1 item')
      expect(i18n.t('item', undefined, { count: 5 })).toBe('5 items')
      // Without a count, pluralization isn't requested — the base key wins.
      expect(i18n.t('item')).toBe('the item (no count)')
    })

    it('falls back to the base key when no plural-suffixed key is registered', () => {
      const i18n = createSimpleI18nProvider('en', [
        { code: 'en', name: 'English', translations: { widget: 'widget(s)' } },
      ])
      expect(i18n.t('widget', undefined, { count: 3 })).toBe('widget(s)')
    })
  })

  describe('addTranslations deep merge', () => {
    it('merges nested translation subtrees instead of clobbering a sibling key', () => {
      // Regression: a shallow spread merge dropped the ENTIRE `auth` subtree
      // from the first call when the second call registered another key
      // under the same top-level `auth` namespace.
      const i18n = createSimpleI18nProvider('en', [
        { code: 'en', name: 'English', translations: {} },
      ])
      i18n.addTranslations('en', { auth: { login: 'Log in' } })
      i18n.addTranslations('en', { auth: { signup: 'Sign up' } })
      expect(i18n.t('auth.login')).toBe('Log in')
      expect(i18n.t('auth.signup')).toBe('Sign up')
    })
  })

  describe('formatting', () => {
    let i18n: ReturnType<typeof createSimpleI18nProvider>

    beforeEach(() => {
      i18n = createSimpleI18nProvider('en')
    })

    it('should format numbers', () => {
      const result = i18n.formatNumber(1234.56)
      expect(result).toContain('1')
      expect(result).toContain('234')
    })

    it('should format dates', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const result = i18n.formatDate(date)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should format date from string', () => {
      const result = i18n.formatDate('2024-01-15')
      expect(typeof result).toBe('string')
    })

    it('should format list with conjunction', () => {
      const result = i18n.formatList(['apples', 'bananas', 'oranges'])
      expect(result).toContain('apples')
      expect(result).toContain('bananas')
      expect(result).toContain('oranges')
    })

    it('should format list with disjunction', () => {
      const result = i18n.formatList(['red', 'blue'], { type: 'disjunction' })
      expect(result).toContain('red')
      expect(result).toContain('blue')
    })
  })

  describe('direction', () => {
    it('should return ltr for English', () => {
      const i18n = createSimpleI18nProvider('en', [
        { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      ])
      expect(i18n.getDirection()).toBe('ltr')
    })

    it('should return rtl for Arabic', () => {
      const i18n = createSimpleI18nProvider('ar', [
        { code: 'ar', name: 'Arabic', direction: 'rtl', translations: {} },
      ])
      expect(i18n.getDirection()).toBe('rtl')
    })

    it('should default to ltr when direction is not set', () => {
      const i18n = createSimpleI18nProvider('en')
      expect(i18n.getDirection()).toBe('ltr')
    })
  })
})
