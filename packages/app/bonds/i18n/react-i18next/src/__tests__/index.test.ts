import { describe, expect, it, vi } from 'vitest'

// Mock i18next and react-i18next before importing modules
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

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: vi.fn(() => ({
    t: vi.fn((key: string) => key),
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  })),
  Trans: vi.fn(({ children }: { children: React.ReactNode }) => children),
  I18nextProvider: vi.fn(({ children }: { children: React.ReactNode }) => children),
}))

vi.mock('i18next-browser-languagedetector', () => ({
  default: {
    type: 'languageDetector',
    detect: vi.fn(() => 'en'),
    init: vi.fn(),
    cacheUserLanguage: vi.fn(),
  },
}))

// Import after mocks are set up
import type { ReactI18nextProviderConfig } from '../index.js'
import { createReactI18nextProvider, localeConfigToResources, provider, useI18n } from '../index.js'

describe('@molecule/app-i18n-react-i18next', () => {
  describe('createReactI18nextProvider', () => {
    it('should create a working provider', async () => {
      const testProvider = createReactI18nextProvider({
        defaultLocale: 'en',
        locales: [
          {
            code: 'en',
            name: 'English',
            translations: { greeting: 'Hello' },
          },
        ],
        detection: false,
      })
      await testProvider.initialize()
      expect(testProvider.t('greeting')).toBe('Hello')
      expect(testProvider.getLocale()).toBe('en')
    })

    it('should apply the initReactI18next plugin', async () => {
      const { initReactI18next } = await import('react-i18next')
      // Clear any calls from previous tests or module-level provider initialization
      ;(initReactI18next.init as ReturnType<typeof vi.fn>).mockClear()

      const testProvider = createReactI18nextProvider({
        defaultLocale: 'en',
        detection: false,
      })
      await testProvider.initialize()

      // During initialization, i18next calls plugin.init() on registered plugins.
      // The mocked initReactI18next.init should have been called.
      expect(initReactI18next.init).toHaveBeenCalled()
    })

    it('should accept ReactI18nextProviderConfig type', () => {
      const config: ReactI18nextProviderConfig = {
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

    it('should have all I18nProvider methods', async () => {
      const testProvider = createReactI18nextProvider({ detection: false })
      await testProvider.initialize()
      expect(typeof testProvider.getLocale).toBe('function')
      expect(typeof testProvider.setLocale).toBe('function')
      expect(typeof testProvider.getLocales).toBe('function')
      expect(typeof testProvider.addLocale).toBe('function')
      expect(typeof testProvider.addTranslations).toBe('function')
      expect(typeof testProvider.t).toBe('function')
      expect(typeof testProvider.exists).toBe('function')
      expect(typeof testProvider.formatNumber).toBe('function')
      expect(typeof testProvider.formatDate).toBe('function')
      expect(typeof testProvider.formatRelativeTime).toBe('function')
      expect(typeof testProvider.formatList).toBe('function')
      expect(typeof testProvider.onLocaleChange).toBe('function')
      expect(typeof testProvider.getDirection).toBe('function')
    })
  })

  describe('localeConfigToResources', () => {
    it('should be re-exported from base i18next package', () => {
      expect(typeof localeConfigToResources).toBe('function')
      const result = localeConfigToResources([
        { code: 'en', name: 'English', translations: { hello: 'Hello' } },
      ])
      expect(result).toEqual({
        en: { translation: { hello: 'Hello' } },
      })
    })
  })

  describe('Default provider export', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.t).toBe('function')
      expect(typeof provider.getLocale).toBe('function')
      expect(typeof provider.initialize).toBe('function')
      expect(provider.i18n).toBeDefined()
    })
  })

  describe('useI18n hook', () => {
    it('should be exported', () => {
      expect(useI18n).toBeDefined()
      expect(typeof useI18n).toBe('function')
    })

    it('should return expected shape', () => {
      const result = useI18n()
      expect(result).toHaveProperty('t')
      expect(result).toHaveProperty('locale')
      expect(result).toHaveProperty('setLocale')
      expect(result).toHaveProperty('formatNumber')
      expect(result).toHaveProperty('formatDate')
    })

    it('should have t function', () => {
      const { t } = useI18n()
      expect(typeof t).toBe('function')
    })

    it('should have setLocale function', () => {
      const { setLocale } = useI18n()
      expect(typeof setLocale).toBe('function')
    })

    it('should have formatNumber function', () => {
      const { formatNumber } = useI18n()
      expect(typeof formatNumber).toBe('function')
      const result = formatNumber(1234.56)
      expect(result).toBeTruthy()
    })

    it('should have formatDate function', () => {
      const { formatDate } = useI18n()
      expect(typeof formatDate).toBe('function')
      const result = formatDate(new Date())
      expect(result).toBeTruthy()
    })
  })

  describe('Re-exported react-i18next components', () => {
    it('should export useTranslation hook', async () => {
      const { useTranslation } = await import('../index.js')
      expect(useTranslation).toBeDefined()
      expect(typeof useTranslation).toBe('function')
    })

    it('should export Trans component', async () => {
      const { Trans } = await import('../index.js')
      expect(Trans).toBeDefined()
    })

    it('should export I18nextProvider component', async () => {
      const { I18nextProvider } = await import('../index.js')
      expect(I18nextProvider).toBeDefined()
    })
  })
})
