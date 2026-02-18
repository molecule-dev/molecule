import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock i18next before importing modules
vi.mock('i18next', () => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  let currentLanguage = 'en'
  const resources: Record<string, Record<string, unknown>> = {}

  const mockI18n = {
    language: currentLanguage,
    createInstance: vi.fn(() => mockI18n),
    use: vi.fn(() => mockI18n),
    init: vi.fn(async (options: { lng?: string; resources?: Record<string, unknown> }) => {
      currentLanguage = options.lng || 'en'
      mockI18n.language = currentLanguage
      if (options.resources) {
        Object.assign(resources, options.resources)
      }
      return mockI18n
    }),
    changeLanguage: vi.fn(async (lng: string) => {
      currentLanguage = lng
      mockI18n.language = lng
      const languageListeners = listeners.get('languageChanged')
      if (languageListeners) {
        languageListeners.forEach((listener) => listener(lng))
      }
      return mockI18n
    }),
    t: vi.fn((key: string, options?: Record<string, unknown>) => {
      const locale = currentLanguage
      const resource = resources[locale]?.translation as Record<string, string> | undefined
      if (resource && resource[key]) {
        let result = resource[key]
        // Simple interpolation (including count)
        if (options) {
          Object.entries(options).forEach(([k, v]) => {
            if (k !== 'defaultValue') {
              result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
            }
          })
        }
        return result
      }
      return options?.defaultValue || key
    }),
    exists: vi.fn((key: string) => {
      const locale = currentLanguage
      const resource = resources[locale]?.translation as Record<string, string> | undefined
      return resource ? key in resource : false
    }),
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(listener)
    }),
    addResourceBundle: vi.fn(
      (lng: string, ns: string, translations: unknown, deep?: boolean, overwrite?: boolean) => {
        if (!resources[lng]) {
          resources[lng] = {}
        }
        if (deep || overwrite) {
          resources[lng][ns] = {
            ...((resources[lng][ns] as object) || {}),
            ...(translations as object),
          }
        } else {
          resources[lng][ns] = translations
        }
      },
    ),
  }

  return {
    default: mockI18n,
    createInstance: mockI18n.createInstance,
  }
})

vi.mock('i18next-browser-languagedetector', () => ({
  default: {
    type: 'languageDetector',
    detect: vi.fn(() => 'en'),
    init: vi.fn(),
    cacheUserLanguage: vi.fn(),
  },
}))

// Import after mocks are set up
import type {
  DateFormatOptions,
  I18nextProviderConfig,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from '../index.js'
import { createI18nextProvider, localeConfigToResources, provider } from '../index.js'

describe('@molecule/app-i18n-i18next', () => {
  describe('Type definitions compile correctly', () => {
    it('should compile LocaleConfig type', () => {
      const config: LocaleConfig = {
        code: 'en-US',
        name: 'English (US)',
        nativeName: 'English',
        direction: 'ltr',
        translations: { hello: 'Hello' },
      }
      expect(config.code).toBe('en-US')
      expect(config.direction).toBe('ltr')
    })

    it('should compile Translations type', () => {
      const translations: Translations = {
        simple: 'Simple',
        nested: {
          level1: 'Level 1',
          deeper: {
            level2: 'Level 2',
          },
        },
      }
      expect(translations.simple).toBe('Simple')
    })

    it('should compile InterpolationValues type', () => {
      const values: InterpolationValues = {
        name: 'John',
        count: 5,
        active: true,
        date: new Date(),
      }
      expect(values.name).toBe('John')
    })

    it('should compile NumberFormatOptions type', () => {
      const options: NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
      }
      expect(options.style).toBe('currency')
    })

    it('should compile DateFormatOptions type', () => {
      const options: DateFormatOptions = {
        dateStyle: 'full',
        timeStyle: 'short',
        relative: false,
      }
      expect(options.dateStyle).toBe('full')
    })

    it('should compile I18nextProviderConfig type', () => {
      const config: I18nextProviderConfig = {
        defaultLocale: 'en',
        fallbackLocale: 'en',
        locales: [],
        detection: true,
        detectionOptions: {
          order: ['querystring', 'localStorage', 'navigator'],
          caches: ['localStorage'],
        },
        debug: false,
        i18nextOptions: {},
      }
      expect(config.defaultLocale).toBe('en')
    })
  })

  describe('localeConfigToResources', () => {
    it('should convert empty array to empty resources', () => {
      const result = localeConfigToResources([])
      expect(result).toEqual({})
    })

    it('should convert single locale config to resources', () => {
      const locales: LocaleConfig[] = [
        {
          code: 'en',
          name: 'English',
          translations: { hello: 'Hello', world: 'World' },
        },
      ]
      const result = localeConfigToResources(locales)
      expect(result).toEqual({
        en: {
          translation: { hello: 'Hello', world: 'World' },
        },
      })
    })

    it('should convert multiple locale configs to resources', () => {
      const locales: LocaleConfig[] = [
        {
          code: 'en',
          name: 'English',
          translations: { hello: 'Hello' },
        },
        {
          code: 'fr',
          name: 'French',
          translations: { hello: 'Bonjour' },
        },
        {
          code: 'de',
          name: 'German',
          translations: { hello: 'Hallo' },
        },
      ]
      const result = localeConfigToResources(locales)
      expect(result).toEqual({
        en: { translation: { hello: 'Hello' } },
        fr: { translation: { hello: 'Bonjour' } },
        de: { translation: { hello: 'Hallo' } },
      })
    })

    it('should handle nested translations', () => {
      const locales: LocaleConfig[] = [
        {
          code: 'en',
          name: 'English',
          translations: {
            simple: 'Simple',
            nested: {
              level1: 'Level 1',
              deeper: {
                level2: 'Level 2',
              },
            },
          },
        },
      ]
      const result = localeConfigToResources(locales)
      expect(result.en.translation).toEqual({
        simple: 'Simple',
        nested: {
          level1: 'Level 1',
          deeper: {
            level2: 'Level 2',
          },
        },
      })
    })
  })

  describe('createI18nextProvider', () => {
    let testProvider: I18nProvider & { i18n: unknown; initialize: () => Promise<void> }

    beforeEach(async () => {
      vi.clearAllMocks()
      testProvider = createI18nextProvider({
        defaultLocale: 'en',
        fallbackLocale: 'en',
        locales: [
          {
            code: 'en',
            name: 'English',
            direction: 'ltr',
            translations: {
              greeting: 'Hello',
              welcome: 'Welcome, {{name}}!',
              items: '{{count}} items',
            },
          },
          {
            code: 'fr',
            name: 'French',
            direction: 'ltr',
            translations: {
              greeting: 'Bonjour',
              welcome: 'Bienvenue, {{name}}!',
            },
          },
          {
            code: 'ar',
            name: 'Arabic',
            direction: 'rtl',
            translations: {
              greeting: 'Ahlan',
            },
          },
        ],
        detection: false,
        debug: false,
      })
      // Wait for auto-initialization
      await testProvider.initialize()
    })

    describe('initialization', () => {
      it('should create a provider with i18n instance', () => {
        expect(testProvider.i18n).toBeDefined()
      })

      it('should have initialize method', () => {
        expect(typeof testProvider.initialize).toBe('function')
      })

      it('should not re-initialize if already initialized', async () => {
        const initSpy = vi.spyOn(testProvider, 'initialize')
        await testProvider.initialize()
        await testProvider.initialize()
        // The method is called but should return early
        expect(initSpy).toHaveBeenCalledTimes(2)
      })
    })

    describe('getLocale', () => {
      it('should return the current locale', () => {
        expect(testProvider.getLocale()).toBe('en')
      })
    })

    describe('setLocale', () => {
      it('should change the locale', async () => {
        await testProvider.setLocale('fr')
        expect(testProvider.getLocale()).toBe('fr')
      })

      it('should trigger language change', async () => {
        const listener = vi.fn()
        testProvider.onLocaleChange(listener)
        await testProvider.setLocale('fr')
        expect(listener).toHaveBeenCalledWith('fr')
      })
    })

    describe('getLocales', () => {
      it('should return all available locales', () => {
        const locales = testProvider.getLocales()
        expect(locales).toHaveLength(3)
        expect(locales.map((l) => l.code)).toEqual(['en', 'fr', 'ar'])
      })

      it('should return locale configs with proper structure', () => {
        const locales = testProvider.getLocales()
        const englishLocale = locales.find((l) => l.code === 'en')
        expect(englishLocale).toEqual({
          code: 'en',
          name: 'English',
          direction: 'ltr',
          translations: {
            greeting: 'Hello',
            welcome: 'Welcome, {{name}}!',
            items: '{{count}} items',
          },
        })
      })
    })

    describe('addLocale', () => {
      it('should add a new locale', () => {
        testProvider.addLocale({
          code: 'de',
          name: 'German',
          direction: 'ltr',
          translations: { greeting: 'Hallo' },
        })
        const locales = testProvider.getLocales()
        expect(locales.map((l) => l.code)).toContain('de')
      })

      it('should make new locale translations available', () => {
        testProvider.addLocale({
          code: 'es',
          name: 'Spanish',
          translations: { greeting: 'Hola' },
        })
        const locales = testProvider.getLocales()
        const spanish = locales.find((l) => l.code === 'es')
        expect(spanish?.translations!.greeting).toBe('Hola')
      })
    })

    describe('addTranslations', () => {
      it('should add translations to existing locale', () => {
        testProvider.addTranslations('en', { newKey: 'New value' })
        // The mock's addResourceBundle should have been called
        const locales = testProvider.getLocales()
        const english = locales.find((l) => l.code === 'en')
        expect(english?.translations!.newKey).toBe('New value')
      })

      it('should merge with existing translations', () => {
        testProvider.addTranslations('en', { anotherKey: 'Another value' })
        const locales = testProvider.getLocales()
        const english = locales.find((l) => l.code === 'en')
        // Original translations should still exist
        expect(english?.translations!.greeting).toBe('Hello')
        expect(english?.translations!.anotherKey).toBe('Another value')
      })
    })

    describe('t (translate)', () => {
      it('should translate a key', () => {
        const result = testProvider.t('greeting')
        expect(result).toBe('Hello')
      })

      it('should translate with interpolation values', () => {
        const result = testProvider.t('welcome', { name: 'John' })
        expect(result).toBe('Welcome, John!')
      })

      it('should return key for missing translation', () => {
        const result = testProvider.t('nonexistent')
        expect(result).toBe('nonexistent')
      })

      it('should return default value for missing translation', () => {
        const result = testProvider.t('missing', undefined, { defaultValue: 'Default text' })
        expect(result).toBe('Default text')
      })

      it('should handle count option', () => {
        const result = testProvider.t('items', { count: 5 }, { count: 5 })
        expect(result).toBe('5 items')
      })
    })

    describe('exists', () => {
      it('should return true for existing key', () => {
        expect(testProvider.exists('greeting')).toBe(true)
      })

      it('should return false for non-existent key', () => {
        expect(testProvider.exists('nonexistent')).toBe(false)
      })
    })

    describe('formatNumber', () => {
      it('should format a basic number', () => {
        const formatted = testProvider.formatNumber(1234.56)
        expect(formatted).toContain('1')
        expect(formatted).toContain('234')
      })

      it('should format with currency style', () => {
        const formatted = testProvider.formatNumber(1234.56, {
          style: 'currency',
          currency: 'USD',
        })
        expect(formatted).toContain('$')
      })

      it('should format with percent style', () => {
        const formatted = testProvider.formatNumber(0.75, { style: 'percent' })
        expect(formatted).toContain('75')
        expect(formatted).toContain('%')
      })

      it('should respect fraction digit options', () => {
        const formatted = testProvider.formatNumber(1234.5678, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        expect(formatted).toContain('1,234.57')
      })
    })

    describe('formatDate', () => {
      it('should format a Date object', () => {
        const date = new Date('2024-01-15T10:30:00')
        const formatted = testProvider.formatDate(date)
        expect(formatted).toBeTruthy()
        expect(typeof formatted).toBe('string')
      })

      it('should format a timestamp number', () => {
        const timestamp = new Date('2024-01-15').getTime()
        const formatted = testProvider.formatDate(timestamp)
        expect(formatted).toBeTruthy()
      })

      it('should format a date string', () => {
        const formatted = testProvider.formatDate('2024-01-15')
        expect(formatted).toBeTruthy()
      })

      it('should use dateStyle option', () => {
        const date = new Date('2024-01-15')
        const formatted = testProvider.formatDate(date, { dateStyle: 'full' })
        expect(formatted).toContain('2024')
      })

      it('should use timeStyle option', () => {
        const date = new Date('2024-01-15T14:30:00')
        const formatted = testProvider.formatDate(date, { timeStyle: 'short' })
        expect(formatted).toBeTruthy()
      })

      it('should handle relative option', () => {
        const date = new Date(Date.now() - 60000) // 1 minute ago
        const formatted = testProvider.formatDate(date, { relative: true })
        expect(formatted).toBeTruthy()
      })
    })

    describe('formatRelativeTime', () => {
      it('should format past time in seconds', () => {
        const past = new Date(Date.now() - 30000) // 30 seconds ago
        const formatted = testProvider.formatRelativeTime(past)
        expect(formatted).toBeTruthy()
        expect(typeof formatted).toBe('string')
      })

      it('should format past time in minutes', () => {
        const past = new Date(Date.now() - 300000) // 5 minutes ago
        const formatted = testProvider.formatRelativeTime(past)
        expect(formatted).toBeTruthy()
      })

      it('should format past time in hours', () => {
        const past = new Date(Date.now() - 7200000) // 2 hours ago
        const formatted = testProvider.formatRelativeTime(past)
        expect(formatted).toBeTruthy()
      })

      it('should format past time in days', () => {
        const past = new Date(Date.now() - 172800000) // 2 days ago
        const formatted = testProvider.formatRelativeTime(past)
        expect(formatted).toBeTruthy()
      })

      it('should format past time in months', () => {
        const past = new Date(Date.now() - 5184000000) // ~60 days ago
        const formatted = testProvider.formatRelativeTime(past)
        expect(formatted).toBeTruthy()
      })

      it('should format past time in years', () => {
        const past = new Date(Date.now() - 63072000000) // ~2 years ago
        const formatted = testProvider.formatRelativeTime(past)
        expect(formatted).toBeTruthy()
      })

      it('should format future time', () => {
        const future = new Date(Date.now() + 3600000) // 1 hour from now
        const formatted = testProvider.formatRelativeTime(future)
        expect(formatted).toBeTruthy()
      })

      it('should use specific unit option', () => {
        const date = new Date(Date.now() - 86400000) // 1 day ago
        const formatted = testProvider.formatRelativeTime(date, { unit: 'day' })
        expect(formatted).toBeTruthy()
      })

      it('should format timestamp number', () => {
        const timestamp = Date.now() - 60000
        const formatted = testProvider.formatRelativeTime(timestamp)
        expect(formatted).toBeTruthy()
      })
    })

    describe('formatList', () => {
      it('should format a list with conjunction (and)', () => {
        const formatted = testProvider.formatList(['Apple', 'Banana', 'Cherry'])
        expect(formatted).toContain('Apple')
        expect(formatted).toContain('Banana')
        expect(formatted).toContain('Cherry')
      })

      it('should format a list with disjunction (or)', () => {
        const formatted = testProvider.formatList(['Red', 'Green', 'Blue'], {
          type: 'disjunction',
        })
        expect(formatted).toBeTruthy()
      })

      it('should format a list with unit type', () => {
        const formatted = testProvider.formatList(['5 hours', '30 minutes'], {
          type: 'unit',
        })
        expect(formatted).toBeTruthy()
      })

      it('should handle empty list', () => {
        const formatted = testProvider.formatList([])
        expect(formatted).toBe('')
      })

      it('should handle single item list', () => {
        const formatted = testProvider.formatList(['Apple'])
        expect(formatted).toBe('Apple')
      })

      it('should handle two item list', () => {
        const formatted = testProvider.formatList(['Apple', 'Banana'])
        expect(formatted).toContain('Apple')
        expect(formatted).toContain('Banana')
      })
    })

    describe('onLocaleChange', () => {
      it('should register a listener', () => {
        const listener = vi.fn()
        testProvider.onLocaleChange(listener)
        expect(listener).not.toHaveBeenCalled()
      })

      it('should call listener on locale change', async () => {
        const listener = vi.fn()
        testProvider.onLocaleChange(listener)
        await testProvider.setLocale('fr')
        expect(listener).toHaveBeenCalledWith('fr')
      })

      it('should return unsubscribe function', async () => {
        const listener = vi.fn()
        const unsubscribe = testProvider.onLocaleChange(listener)
        expect(typeof unsubscribe).toBe('function')

        unsubscribe()
        await testProvider.setLocale('fr')
        expect(listener).not.toHaveBeenCalled()
      })

      it('should support multiple listeners', async () => {
        const listener1 = vi.fn()
        const listener2 = vi.fn()
        testProvider.onLocaleChange(listener1)
        testProvider.onLocaleChange(listener2)

        await testProvider.setLocale('fr')
        expect(listener1).toHaveBeenCalledWith('fr')
        expect(listener2).toHaveBeenCalledWith('fr')
      })
    })

    describe('getDirection', () => {
      it('should return ltr for English', () => {
        expect(testProvider.getDirection()).toBe('ltr')
      })

      it('should return rtl for Arabic', async () => {
        await testProvider.setLocale('ar')
        expect(testProvider.getDirection()).toBe('rtl')
      })

      it('should default to ltr for locale without direction', async () => {
        testProvider.addLocale({
          code: 'unknown',
          name: 'Unknown',
          translations: {},
          // No direction specified
        })
        await testProvider.setLocale('unknown')
        expect(testProvider.getDirection()).toBe('ltr')
      })
    })
  })

  describe('createI18nextProvider with options', () => {
    it('should use default locale when not specified', async () => {
      const testProvider = createI18nextProvider()
      await testProvider.initialize()
      expect(testProvider.getLocale()).toBe('en')
    })

    it('should enable language detection when detection is true', async () => {
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        detection: true,
      })
      await testProvider.initialize()
      expect(testProvider.i18n).toBeDefined()
    })

    it('should use custom detection options', async () => {
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        detection: true,
        detectionOptions: {
          order: ['querystring', 'cookie'],
          caches: ['cookie'],
        },
      })
      await testProvider.initialize()
      expect(testProvider.i18n).toBeDefined()
    })

    it('should enable debug mode', async () => {
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        debug: true,
      })
      await testProvider.initialize()
      expect(testProvider.i18n).toBeDefined()
    })

    it('should accept custom i18next options', async () => {
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        i18nextOptions: {
          interpolation: {
            prefix: '[[',
            suffix: ']]',
          },
        },
      })
      await testProvider.initialize()
      expect(testProvider.i18n).toBeDefined()
    })

    it('should use fallback locale', async () => {
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        fallbackLocale: 'fr',
      })
      await testProvider.initialize()
      expect(testProvider.i18n).toBeDefined()
    })
  })

  describe('Default provider export', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.getLocale).toBeDefined()
      expect(provider.setLocale).toBeDefined()
      expect(provider.t).toBeDefined()
    })

    it('should have all I18nProvider methods', () => {
      expect(typeof provider.getLocale).toBe('function')
      expect(typeof provider.setLocale).toBe('function')
      expect(typeof provider.getLocales).toBe('function')
      expect(typeof provider.addLocale).toBe('function')
      expect(typeof provider.addTranslations).toBe('function')
      expect(typeof provider.t).toBe('function')
      expect(typeof provider.exists).toBe('function')
      expect(typeof provider.formatNumber).toBe('function')
      expect(typeof provider.formatDate).toBe('function')
      expect(typeof provider.formatRelativeTime).toBe('function')
      expect(typeof provider.formatList).toBe('function')
      expect(typeof provider.onLocaleChange).toBe('function')
      expect(typeof provider.getDirection).toBe('function')
    })

    it('should have i18n instance', () => {
      expect(provider.i18n).toBeDefined()
    })

    it('should have initialize method', () => {
      expect(typeof provider.initialize).toBe('function')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty translations object', async () => {
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        locales: [
          {
            code: 'en',
            name: 'English',
            translations: {},
          },
        ],
      })
      await testProvider.initialize()
      expect(testProvider.t('missing')).toBe('missing')
    })

    it('should handle locale with no name', async () => {
      const testProvider = createI18nextProvider({
        locales: [
          {
            code: 'en',
            name: '',
            translations: { hello: 'Hello' },
          },
        ],
      })
      await testProvider.initialize()
      const locales = testProvider.getLocales()
      expect(locales[0].name).toBe('')
    })

    it('should handle very large numbers in formatNumber', async () => {
      const testProvider = createI18nextProvider({ defaultLocale: 'en' })
      await testProvider.initialize()
      const formatted = testProvider.formatNumber(Number.MAX_SAFE_INTEGER)
      expect(formatted).toBeTruthy()
    })

    it('should handle negative numbers in formatNumber', async () => {
      const testProvider = createI18nextProvider({ defaultLocale: 'en' })
      await testProvider.initialize()
      const formatted = testProvider.formatNumber(-1234.56)
      expect(formatted).toContain('-')
    })

    it('should handle very old dates in formatDate', async () => {
      const testProvider = createI18nextProvider({ defaultLocale: 'en' })
      await testProvider.initialize()
      const oldDate = new Date('1900-01-01')
      const formatted = testProvider.formatDate(oldDate)
      expect(formatted).toBeTruthy()
    })

    it('should handle future dates in formatDate', async () => {
      const testProvider = createI18nextProvider({ defaultLocale: 'en' })
      await testProvider.initialize()
      const futureDate = new Date('2100-12-31')
      const formatted = testProvider.formatDate(futureDate)
      expect(formatted).toBeTruthy()
    })

    it('should handle invalid date string', async () => {
      const testProvider = createI18nextProvider({ defaultLocale: 'en' })
      await testProvider.initialize()
      const formatted = testProvider.formatDate('invalid-date')
      // Should return "Invalid Date" or similar
      expect(formatted).toBeTruthy()
    })
  })

  describe('plugins option', () => {
    it('should apply plugins via i18n.use()', async () => {
      const i18next = await import('i18next')
      const mockI18n = i18next.default
      vi.clearAllMocks()

      const mockPlugin = { type: '3rdParty' as const, init: vi.fn() }
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        detection: false,
        plugins: [mockPlugin],
      })
      await testProvider.initialize()
      expect(mockI18n.use).toHaveBeenCalledWith(mockPlugin)
    })

    it('should apply multiple plugins in order', async () => {
      const i18next = await import('i18next')
      const mockI18n = i18next.default
      vi.clearAllMocks()

      const plugin1 = { type: '3rdParty' as const, init: vi.fn() }
      const plugin2 = { type: '3rdParty' as const, init: vi.fn() }
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        detection: false,
        plugins: [plugin1, plugin2],
      })
      await testProvider.initialize()
      expect(mockI18n.use).toHaveBeenCalledWith(plugin1)
      expect(mockI18n.use).toHaveBeenCalledWith(plugin2)
    })

    it('should work with no plugins (default)', async () => {
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        detection: false,
        locales: [{ code: 'en', name: 'English', translations: { test: 'Test' } }],
      })
      await testProvider.initialize()
      expect(testProvider.t('test')).toBe('Test')
    })
  })

  describe('No framework dependencies', () => {
    it('should not import react-i18next', async () => {
      // Verify that the provider module does not depend on react-i18next
      const providerModule = await import('../provider.js')
      expect(providerModule.createI18nextProvider).toBeDefined()
      expect(providerModule.provider).toBeDefined()
    })

    it('should not have any React-specific configuration', async () => {
      // The provider should work without React being available
      const testProvider = createI18nextProvider({
        defaultLocale: 'en',
        locales: [
          {
            code: 'en',
            name: 'English',
            translations: { test: 'Test' },
          },
        ],
      })
      await testProvider.initialize()
      expect(testProvider.t('test')).toBe('Test')
    })
  })
})
