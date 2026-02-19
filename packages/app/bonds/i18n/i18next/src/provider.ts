/**
 * Framework-agnostic i18next provider implementation.
 *
 * Uses only i18next directly (no react-i18next), making it suitable
 * for Vue, Angular, Svelte, Solid, and any other framework.
 *
 * @module
 */

import i18next, { type i18n as I18nInstance, type InitOptions } from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import { error, getLogger } from '@molecule/app-logger'

import type {
  DateFormatOptions,
  I18nextProviderConfig,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from './types.js'
import { localeConfigToResources } from './utilities.js'

/**
 * Creates a framework-agnostic i18n provider backed by i18next. Supports eager and lazy-loaded
 * locale translations, browser language detection, custom plugins, and Intl-based number/date/list formatting.
 * @param config - i18next provider configuration including `defaultLocale`, `locales` (with optional `loader` for lazy loading), `detection` flag, `debug`, `plugins`, and raw `i18nextOptions`.
 * @returns An `I18nProvider` with translation, formatting, locale management methods, plus the underlying `i18n` instance and `initialize()` function.
 */
export const createI18nextProvider = (
  config: I18nextProviderConfig = {},
): I18nProvider & { i18n: I18nInstance; initialize: () => Promise<void> } => {
  const {
    defaultLocale = 'en',
    fallbackLocale,
    locales = [],
    detection = true,
    detectionOptions,
    debug = false,
    i18nextOptions = {},
    plugins = [],
  } = config

  // Store locale configs for metadata
  const localeConfigs = new Map<string, LocaleConfig>()
  for (const locale of locales) {
    localeConfigs.set(locale.code, locale)
  }

  const logger = getLogger('i18n')

  // Create i18next instance
  const i18n = i18next.createInstance()

  // Track which lazy locales have been loaded
  const loadedLocales = new Set<string>()

  // Registry of lazily-loaded content modules for auto-reload on locale change
  const contentLoaders = new Map<string, (locale: string) => Promise<void>>()

  // Initialize flag
  let initialized = false

  // Locale change listeners
  const listeners = new Set<(locale: string) => void>()

  const initialize = async (): Promise<void> => {
    if (initialized) return

    const initOptions: InitOptions = {
      lng: defaultLocale,
      fallbackLng: fallbackLocale || defaultLocale,
      debug,
      resources: localeConfigToResources(locales),
      interpolation: {
        escapeValue: false, // Frameworks handle escaping
      },
      ...i18nextOptions,
    }

    // Add language detector if enabled
    if (detection) {
      i18n.use(LanguageDetector)
      // Default: detect from querystring and navigator only, no caching.
      // Users can explicitly enable localStorage caching via detectionOptions.
      initOptions.detection = detectionOptions || {
        order: ['querystring', 'navigator'],
        caches: [], // No default caching - storage must be explicitly configured
      }
    }

    // Apply custom plugins (e.g. react-i18next's initReactI18next)
    for (const plugin of plugins) {
      i18n.use(plugin as Parameters<typeof i18n.use>[0])
    }

    await i18n.init(initOptions)

    // Listen for language changes
    i18n.on('languageChanged', (lng: string) => {
      listeners.forEach((listener) => listener(lng))
    })

    initialized = true
  }

  // Auto-initialize
  initialize().catch((err) => error(String(err)))

  return {
    i18n,
    initialize,

    getLocale: (): string => i18n.language || defaultLocale,

    async setLocale(locale: string): Promise<void> {
      if (!initialized) await initialize()

      // Load lazy translations if this locale has a loader and hasn't been loaded yet
      const localeConfig = localeConfigs.get(locale)
      if (localeConfig?.loader && !loadedLocales.has(locale)) {
        const translations = await localeConfig.loader()
        i18n.addResourceBundle(locale, 'translation', translations, true, true)
        loadedLocales.add(locale)
      }

      // Reload all registered content modules for the new locale.
      // This happens BEFORE changeLanguage so content keys are available
      // when the languageChanged event fires and UI components re-render.
      if (contentLoaders.size > 0) {
        logger.debug('Reloading content modules', contentLoaders.size, locale)
        await Promise.all(Array.from(contentLoaders.values()).map((loader) => loader(locale)))
      }

      await i18n.changeLanguage(locale)
    },

    getLocales: (): LocaleConfig[] => {
      return Array.from(localeConfigs.values())
    },

    addLocale(config: LocaleConfig): void {
      localeConfigs.set(config.code, config)
      i18n.addResourceBundle(config.code, 'translation', config.translations ?? {}, true, true)
    },

    addTranslations(locale: string, translations: Translations, namespace = 'translation'): void {
      i18n.addResourceBundle(locale, namespace, translations, true, true)

      // Update local config
      const existing = localeConfigs.get(locale)
      if (existing) {
        existing.translations = {
          ...existing.translations,
          ...translations,
        }
      }

      // Notify listeners when translations are added for the active locale
      // so that UI components re-render with the new content.
      if (locale === i18n.language) {
        listeners.forEach((listener) => listener(locale))
      }
    },

    t(
      key: string,
      values?: InterpolationValues,
      options?: { defaultValue?: string; count?: number },
    ): string {
      return i18n.t(key, {
        ...values,
        defaultValue: options?.defaultValue,
        count: options?.count,
      })
    },

    exists(key: string): boolean {
      return i18n.exists(key)
    },

    formatNumber(value: number, options?: NumberFormatOptions): string {
      const locale = i18n.language
      return new Intl.NumberFormat(locale, options as Intl.NumberFormatOptions).format(value)
    },

    formatDate(value: Date | number | string, options?: DateFormatOptions): string {
      const locale = i18n.language
      const date = value instanceof Date ? value : new Date(value)

      // Handle invalid dates gracefully
      if (isNaN(date.getTime())) {
        return i18n.t('i18n.date.invalidDate', { defaultValue: 'Invalid Date' })
      }

      if (options?.relative) {
        return this.formatRelativeTime(date)
      }

      return new Intl.DateTimeFormat(locale, {
        dateStyle: options?.dateStyle,
        timeStyle: options?.timeStyle,
      } as Intl.DateTimeFormatOptions).format(date)
    },

    formatRelativeTime(
      value: Date | number,
      options?: { unit?: Intl.RelativeTimeFormatUnit },
    ): string {
      const locale = i18n.language
      const date = value instanceof Date ? value : new Date(value)
      const now = Date.now()
      const diff = date.getTime() - now

      const absDiff = Math.abs(diff)
      let unit: Intl.RelativeTimeFormatUnit = options?.unit || 'second'
      let unitValue = diff / 1000

      if (!options?.unit) {
        if (absDiff < 60000) {
          unit = 'second'
          unitValue = Math.round(diff / 1000)
        } else if (absDiff < 3600000) {
          unit = 'minute'
          unitValue = Math.round(diff / 60000)
        } else if (absDiff < 86400000) {
          unit = 'hour'
          unitValue = Math.round(diff / 3600000)
        } else if (absDiff < 2592000000) {
          unit = 'day'
          unitValue = Math.round(diff / 86400000)
        } else if (absDiff < 31536000000) {
          unit = 'month'
          unitValue = Math.round(diff / 2592000000)
        } else {
          unit = 'year'
          unitValue = Math.round(diff / 31536000000)
        }
      }

      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
        Math.round(unitValue),
        unit,
      )
    },

    formatList(
      values: string[],
      options?: { type?: 'conjunction' | 'disjunction' | 'unit' },
    ): string {
      const locale = i18n.language
      return new Intl.ListFormat(locale, { type: options?.type || 'conjunction' }).format(values)
    },

    onLocaleChange(listener: (locale: string) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getDirection(): 'ltr' | 'rtl' {
      const locale = i18n.language
      const config = localeConfigs.get(locale)
      return config?.direction || 'ltr'
    },

    registerContent(module: string, loader: (locale: string) => Promise<void>): void {
      if (contentLoaders.has(module)) return
      contentLoaders.set(module, loader)
      logger.debug('Registered content module', module)
    },
  }
}

/**
 * Default provider instance.
 */
export const provider = createI18nextProvider()
