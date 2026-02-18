/**
 * i18n provider implementation for the internationalization module.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

import { getPluralForm } from './plural.js'
import { t } from './translator.js'
import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from './types.js'
import { getNestedValue, interpolate } from './utilities.js'

/**
 * Creates an in-memory i18n provider with translation lookup, interpolation,
 * pluralization, `Intl`-based formatting, lazy locale loading, and
 * locale change subscription.
 *
 * @param initialLocale - The initial active locale code (defaults to `'en'`).
 * @param initialLocales - Pre-registered locale configurations with optional translations.
 * @returns A fully functional `I18nProvider` instance.
 */
export const createSimpleI18nProvider = (
  initialLocale: string = 'en',
  initialLocales: LocaleConfig[] = [],
): I18nProvider => {
  const logger = getLogger('i18n')
  let currentLocale = initialLocale
  const locales = new Map<string, LocaleConfig>()
  const listeners = new Set<(locale: string) => void>()
  const loadedLoaders = new Set<string>()

  // Add initial locales
  for (const config of initialLocales) {
    locales.set(config.code, { ...config, translations: config.translations ?? {} })
  }

  // Add default English locale if not provided
  if (!locales.has('en')) {
    locales.set('en', {
      code: 'en',
      name: 'English',
      direction: 'ltr',
      translations: {},
    })
  }

  const notify = (): void => {
    listeners.forEach((listener) => listener(currentLocale))
  }

  return {
    getLocale: () => currentLocale,

    async setLocale(locale: string): Promise<void> {
      const config = locales.get(locale)
      if (!config) {
        throw new Error(
          t(
            'i18n.error.localeNotFound',
            { locale },
            { defaultValue: `Locale "${locale}" not found` },
          ),
        )
      }

      if (config.loader && !loadedLoaders.has(locale)) {
        const loaded = await config.loader()
        config.translations = { ...config.translations, ...loaded }
        loadedLoaders.add(locale)
      }

      currentLocale = locale
      logger.debug('Locale changed', locale)
      notify()
    },

    getLocales: () => Array.from(locales.values()),

    addLocale(config: LocaleConfig): void {
      locales.set(config.code, config)
    },

    addTranslations(locale: string, translations: Translations, namespace?: string): void {
      const config = locales.get(locale)
      if (!config) {
        throw new Error(
          t(
            'i18n.error.localeNotFound',
            { locale },
            { defaultValue: `Locale "${locale}" not found` },
          ),
        )
      }
      if (!config.translations) config.translations = {}

      if (namespace) {
        config.translations[namespace] = {
          ...((config.translations[namespace] as Translations) || {}),
          ...translations,
        }
      } else {
        config.translations = {
          ...config.translations,
          ...translations,
        }
      }
    },

    t(
      key: string,
      values?: InterpolationValues,
      options?: { defaultValue?: string; count?: number },
    ): string {
      const config = locales.get(currentLocale)
      if (!config) {
        return options?.defaultValue || key
      }

      let text = getNestedValue(config.translations ?? {}, key)

      // Handle pluralization
      if (options?.count !== undefined && text === undefined) {
        const pluralForm = getPluralForm(options.count, currentLocale)
        text =
          getNestedValue(config.translations ?? {}, `${key}_${pluralForm}`) ||
          getNestedValue(config.translations ?? {}, `${key}_other`)
      }

      if (text === undefined) {
        if (!options?.defaultValue) {
          logger.debug('Missing translation key', key, currentLocale)
        }
        return options?.defaultValue || key
      }

      // Add count to values for interpolation
      const allValues = options?.count !== undefined ? { count: options.count, ...values } : values

      if (allValues) {
        return interpolate(text, allValues)
      }

      return text
    },

    exists(key: string): boolean {
      const config = locales.get(currentLocale)
      if (!config) return false
      return getNestedValue(config.translations ?? {}, key) !== undefined
    },

    formatNumber(value: number, options?: NumberFormatOptions): string {
      return new Intl.NumberFormat(currentLocale, options as Intl.NumberFormatOptions).format(value)
    },

    formatDate(value: Date | number | string, options?: DateFormatOptions): string {
      const date = value instanceof Date ? value : new Date(value)

      if (options?.relative) {
        return this.formatRelativeTime(date)
      }

      return new Intl.DateTimeFormat(currentLocale, {
        dateStyle: options?.dateStyle,
        timeStyle: options?.timeStyle,
      } as Intl.DateTimeFormatOptions).format(date)
    },

    formatRelativeTime(
      value: Date | number,
      options?: { unit?: Intl.RelativeTimeFormatUnit },
    ): string {
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

      return new Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' }).format(
        Math.round(unitValue),
        unit,
      )
    },

    formatList(
      values: string[],
      options?: { type?: 'conjunction' | 'disjunction' | 'unit' },
    ): string {
      return new Intl.ListFormat(currentLocale, { type: options?.type || 'conjunction' }).format(
        values,
      )
    },

    onLocaleChange(listener: (locale: string) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getDirection(): 'ltr' | 'rtl' {
      const config = locales.get(currentLocale)
      return config?.direction || 'ltr'
    },
  }
}

/**
 * Default in-memory i18n provider instance with `'en'` locale.
 * Used as a fallback when no bond package provides a provider.
 */
export const simpleProvider = createSimpleI18nProvider()
