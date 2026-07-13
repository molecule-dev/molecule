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
 * Recursively merges source translation entries into a COPY of the target
 * object, preserving existing keys and overwriting only the leaves that
 * conflict. Mirrors `@molecule/api-i18n`'s own auto-created fallback
 * provider so `addTranslations()` behaves identically whichever provider is
 * bonded — a shallow spread here previously clobbered an entire nested
 * namespace object when two modules shared its top-level key.
 *
 * @param target - The base translations object (not mutated).
 * @param source - The translations to merge on top.
 * @returns A new object with `source` deep-merged over `target`.
 */
const deepMerge = (target: Translations, source: Translations): Translations => {
  const result: Translations = { ...target }
  for (const key of Object.keys(source)) {
    const sv = source[key]
    const tv = result[key]
    if (typeof sv === 'object' && sv !== null && typeof tv === 'object' && tv !== null) {
      result[key] = deepMerge(tv as Translations, sv as Translations)
    } else {
      result[key] = sv
    }
  }
  return result
}

/**
 * Milliseconds per relative-time unit (calendar units are approximations:
 * 30-day month, 90-day quarter, 365-day year — matching the auto-select
 * thresholds in `formatRelativeTime`).
 */
const UNIT_MS: Record<string, number> = {
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  quarter: 7_776_000_000,
  year: 31_536_000_000,
}

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

  // Named (rather than `return { ... }`) so methods can reference each other
  // without `this` — `formatDate({ relative: true })` crashed with an opaque
  // "Cannot read properties of undefined" when callers destructured methods
  // off the provider (`const { formatDate } = getProvider()`).
  const i18nProvider: I18nProvider = {
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
        config.translations[namespace] = deepMerge(
          (config.translations[namespace] as Translations) || {},
          translations,
        )
      } else {
        config.translations = deepMerge(config.translations, translations)
      }
    },

    t(
      key: string,
      values?: InterpolationValues,
      options?: { defaultValue?: string; count?: number; locale?: string },
    ): string {
      const targetLocale = options?.locale ?? currentLocale

      // Fleet plural contract (matches i18next's key resolution order): when
      // `count` is provided, the plural-suffixed key (`key_one`/`key_few`/…,
      // falling back to `key_other`) is tried FIRST and wins over the base
      // `key` if BOTH are registered. Only when no plural-suffixed key exists
      // at all does resolution fall back to the base key. Previously the base
      // key won whenever present, so a catalog shipping both `item` and
      // `item_one`/`item_other` silently never pluralized under this provider.
      const lookup = (translations: Translations): string | undefined => {
        if (options?.count !== undefined) {
          const pluralForm = getPluralForm(options.count, targetLocale)
          const plural =
            getNestedValue(translations, `${key}_${pluralForm}`) ||
            getNestedValue(translations, `${key}_other`)
          if (plural !== undefined) return plural
        }
        return getNestedValue(translations, key)
      }

      const config = locales.get(targetLocale)
      let text = config ? lookup(config.translations ?? {}) : undefined

      // Fall back to the English translations whether the key is missing from a
      // KNOWN locale or the whole locale is unknown — previously only the latter
      // fell back, so a partially-translated locale returned the raw key while
      // an unregistered locale returned proper English text.
      if (text === undefined && targetLocale !== 'en') {
        const enConfig = locales.get('en')
        if (enConfig) text = lookup(enConfig.translations ?? {})
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
      // Mirrors t()'s fallback chain (current locale, then English) rather
      // than checking only the current locale's own catalog — otherwise
      // `exists()` reports `false` for a key that `t()` happily renders via
      // the English fallback, and callers using `exists()` to predict `t()`
      // get a wrong answer for every partially-translated locale.
      const config = locales.get(currentLocale)
      if (config && getNestedValue(config.translations ?? {}, key) !== undefined) {
        return true
      }
      if (currentLocale === 'en') return false
      const enConfig = locales.get('en')
      return enConfig ? getNestedValue(enConfig.translations ?? {}, key) !== undefined : false
    },

    formatNumber(value: number, options?: NumberFormatOptions): string {
      return new Intl.NumberFormat(currentLocale, options as Intl.NumberFormatOptions).format(value)
    },

    formatDate(value: Date | number | string, options?: DateFormatOptions): string {
      const date = value instanceof Date ? value : new Date(value)

      if (options?.relative) {
        return i18nProvider.formatRelativeTime(date)
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

      // An explicit unit means "express the difference IN that unit" — convert
      // the millisecond diff before formatting. Previously the raw seconds
      // count was labeled with the unit ("7,200 hours ago" for 2 hours).
      if (options?.unit) {
        const unitMs = UNIT_MS[options.unit.replace(/s$/, '')] ?? 1000
        return new Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' }).format(
          Math.round(diff / unitMs),
          options.unit,
        )
      }

      const absDiff = Math.abs(diff)
      // Declared without initializers: the if/else chain below is exhaustive (its final
      // `else` always assigns), so any seed value here is dead code.
      let unit: Intl.RelativeTimeFormatUnit
      let unitValue: number

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

  return i18nProvider
}

/**
 * Default simple provider.
 */
export const provider: I18nProvider = createSimpleI18nProvider()
