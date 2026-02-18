/**
 * Simple in-memory i18n provider implementation.
 *
 * @module
 */

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from './types.js'
import { getNestedValue, interpolate } from './utilities.js'

/** RTL locale codes. */
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'])

/**
 * Recursively merges source translation entries into the target object,
 * preserving existing keys and overwriting conflicts.
 *
 * @param target - The target translations object to merge into.
 * @param source - The source translations to merge from.
 * @returns The mutated target object with merged translations.
 */
const deepMerge = (target: Translations, source: Translations): Translations => {
  for (const key of Object.keys(source)) {
    const sv = source[key]
    const tv = target[key]
    if (typeof sv === 'object' && sv !== null && typeof tv === 'object' && tv !== null) {
      target[key] = deepMerge(tv as Translations, sv as Translations)
    } else {
      target[key] = sv
    }
  }
  return target
}

/**
 * Creates a simple in-memory i18n provider with translation lookup, interpolation,
 * `Intl`-based number/date/relative-time formatting, and RTL detection.
 * Used as the default provider when no bond package is installed.
 *
 * @param defaultLocale - The initial locale code (defaults to `'en'`).
 * @returns A fully functional `I18nProvider` backed by in-memory translation maps.
 */
export const createSimpleI18nProvider = (defaultLocale = 'en'): I18nProvider => {
  let currentLocale = defaultLocale
  const locales = new Map<string, LocaleConfig>()
  const translations = new Map<string, Translations>()

  // Auto-create the default locale
  locales.set(defaultLocale, { code: defaultLocale, name: defaultLocale })
  translations.set(defaultLocale, {})

  const provider: I18nProvider = {
    getLocale(): string {
      return currentLocale
    },

    setLocale(locale: string): void {
      if (!translations.has(locale)) {
        throw new Error(`Locale "${locale}" not found`)
      }
      currentLocale = locale
    },

    getLocales(): LocaleConfig[] {
      return Array.from(locales.values())
    },

    addLocale(config: LocaleConfig): void {
      locales.set(config.code, config)
      if (!translations.has(config.code)) {
        translations.set(config.code, {})
      }
    },

    addTranslations(locale: string, newTranslations: Translations, namespace?: string): void {
      // Auto-create locale if it doesn't exist
      if (!locales.has(locale)) {
        locales.set(locale, { code: locale, name: locale })
      }
      if (!translations.has(locale)) {
        translations.set(locale, {})
      }

      const existing = translations.get(locale)!

      if (namespace) {
        // Wrap translations under the namespace key and deep merge
        const namespaced: Translations = { [namespace]: newTranslations }
        deepMerge(existing, namespaced)
      } else {
        deepMerge(existing, newTranslations)
      }
    },

    t(
      key: string,
      values?: InterpolationValues,
      options?: { defaultValue?: string; count?: number; locale?: string },
    ): string {
      const locale = options?.locale || currentLocale

      // Try requested locale
      let result: string | undefined
      const localeTranslations = translations.get(locale)
      if (localeTranslations) {
        result = getNestedValue(localeTranslations, key)
      }

      // Fall back to 'en' if not found and locale isn't already 'en'
      if (result === undefined && locale !== 'en') {
        const enTranslations = translations.get('en')
        if (enTranslations) {
          result = getNestedValue(enTranslations, key)
        }
      }

      // Fall back to defaultValue
      if (result === undefined && options?.defaultValue !== undefined) {
        result = options.defaultValue
      }

      // Fall back to key
      if (result === undefined) {
        result = key
      }

      // Interpolate values if provided
      if (values) {
        result = interpolate(result, values)
      }

      return result
    },

    exists(key: string): boolean {
      const localeTranslations = translations.get(currentLocale)
      if (!localeTranslations) return false
      return getNestedValue(localeTranslations, key) !== undefined
    },

    formatNumber(value: number, options?: NumberFormatOptions): string {
      return new Intl.NumberFormat(currentLocale, options as Intl.NumberFormatOptions).format(value)
    },

    formatDate(value: Date | number | string, options?: DateFormatOptions): string {
      const date = value instanceof Date ? value : new Date(value)
      const intlOptions: Intl.DateTimeFormatOptions = {}
      if (options?.dateStyle) intlOptions.dateStyle = options.dateStyle
      if (options?.timeStyle) intlOptions.timeStyle = options.timeStyle
      return new Intl.DateTimeFormat(currentLocale, intlOptions).format(date)
    },

    formatRelativeTime(value: Date | number): string {
      const now = Date.now()
      const timestamp = value instanceof Date ? value.getTime() : value
      const diffMs = timestamp - now
      const diffSeconds = Math.round(diffMs / 1000)
      const absDiffSeconds = Math.abs(diffSeconds)

      let unit: Intl.RelativeTimeFormatUnit
      let amount: number

      if (absDiffSeconds < 60) {
        unit = 'second'
        amount = diffSeconds
      } else if (absDiffSeconds < 3600) {
        unit = 'minute'
        amount = Math.round(diffSeconds / 60)
      } else if (absDiffSeconds < 86400) {
        unit = 'hour'
        amount = Math.round(diffSeconds / 3600)
      } else if (absDiffSeconds < 2592000) {
        unit = 'day'
        amount = Math.round(diffSeconds / 86400)
      } else if (absDiffSeconds < 31536000) {
        unit = 'month'
        amount = Math.round(diffSeconds / 2592000)
      } else {
        unit = 'year'
        amount = Math.round(diffSeconds / 31536000)
      }

      return new Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' }).format(amount, unit)
    },

    formatList(
      values: string[],
      options?: { type?: 'conjunction' | 'disjunction' | 'unit' },
    ): string {
      try {
        return new Intl.ListFormat(currentLocale, { type: options?.type || 'conjunction' }).format(
          values,
        )
      } catch {
        return values.join(', ')
      }
    },

    getDirection(): 'ltr' | 'rtl' {
      const baseLocale = currentLocale.split('-')[0]
      return RTL_LOCALES.has(baseLocale) ? 'rtl' : 'ltr'
    },
  }

  return provider
}

/**
 * Default simple in-memory i18n provider instance with `'en'` locale.
 * Used as a fallback when no bond package provides a provider.
 */
export const simpleProvider = createSimpleI18nProvider()
