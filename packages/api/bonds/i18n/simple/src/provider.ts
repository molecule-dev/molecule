/**
 * Simple i18n provider implementation.
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
} from '@molecule/api-i18n'
import { getNestedValue, getPluralForm, interpolate } from '@molecule/api-i18n'

/**
 * Creates a simple i18n provider that implements the `I18nProvider` interface
 * using in-memory translations, `Intl` APIs for formatting, and CLDR plural rules.
 *
 * @param initialLocale - The starting locale code (default: `'en'`).
 * @param initialLocales - Pre-loaded locale configurations with translations.
 * @returns An `I18nProvider` with translation, formatting, and pluralization support.
 */
export const createSimpleI18nProvider = (
  initialLocale: string = 'en',
  initialLocales: LocaleConfig[] = [],
): I18nProvider => {
  let currentLocale = initialLocale
  const locales = new Map<string, LocaleConfig>()

  for (const config of initialLocales) {
    locales.set(config.code, { ...config, translations: config.translations ?? {} })
  }

  if (!locales.has('en')) {
    locales.set('en', {
      code: 'en',
      name: 'English',
      direction: 'ltr',
      translations: {},
    })
  }

  return {
    getLocale: () => currentLocale,

    setLocale(locale: string): void {
      if (!locales.has(locale)) {
        throw new Error(`Locale "${locale}" not found`)
      }
      currentLocale = locale
    },

    getLocales: () => Array.from(locales.values()),

    addLocale(config: LocaleConfig): void {
      locales.set(config.code, config)
    },

    addTranslations(locale: string, translations: Translations, namespace?: string): void {
      if (!locales.has(locale)) {
        locales.set(locale, {
          code: locale,
          name: locale,
          translations: {},
        })
      }

      const config = locales.get(locale)!
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
      options?: { defaultValue?: string; count?: number; locale?: string },
    ): string {
      const targetLocale = options?.locale ?? currentLocale
      const config = locales.get(targetLocale)

      const fallbackConfig = config ? undefined : locales.get('en')
      const resolvedConfig = config ?? fallbackConfig

      if (!resolvedConfig) {
        return options?.defaultValue || key
      }

      let text = getNestedValue(resolvedConfig.translations ?? {}, key)

      if (options?.count !== undefined && text === undefined) {
        const pluralForm = getPluralForm(options.count, targetLocale)
        text =
          getNestedValue(resolvedConfig.translations ?? {}, `${key}_${pluralForm}`) ||
          getNestedValue(resolvedConfig.translations ?? {}, `${key}_other`)
      }

      if (text === undefined) {
        return options?.defaultValue || key
      }

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

    getDirection(): 'ltr' | 'rtl' {
      const config = locales.get(currentLocale)
      return config?.direction || 'ltr'
    },
  }
}

/**
 * Default simple provider.
 */
export const provider: I18nProvider = createSimpleI18nProvider()
