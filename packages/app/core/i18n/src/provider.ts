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
import { deepMerge, getNestedValue, interpolate } from './utilities.js'

/**
 * Milliseconds per relative-time unit (calendar units are approximations:
 * 30-day month, 90-day quarter, 365-day year — matching the auto-select
 * thresholds below).
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
 * Whether merging `source` into `target` (as `deepMerge` does) changes any
 * translated string.
 *
 * @param target - Translations already registered.
 * @param source - Translations being added.
 * @returns `true` when at least one value would change.
 */
const changesText = (target: Translations, source: Translations): boolean =>
  Object.keys(source).some((key) => {
    const next = source[key]
    const current = target[key]
    return typeof next === 'object' &&
      next !== null &&
      typeof current === 'object' &&
      current !== null
      ? changesText(current, next)
      : current !== next
  })

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

  // Registry of lazily-loaded content modules for auto-reload on locale change
  const contentLoaders = new Map<string, (locale: string) => Promise<void>>()

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

  // Monotonic count of every change announced to listeners. It lives outside
  // the listener set so a consumer that subscribes AFTER the change — a child's
  // or an earlier sibling's layout effect, or a React Activity tree whose
  // effects were unmounted while hidden — can still see that it happened.
  let revision = 0
  const notify = (): void => {
    revision += 1
    listeners.forEach((listener) => listener(currentLocale))
  }

  // Named (rather than `return { ... }`) so methods can reference each other
  // without `this` — `formatDate({ relative: true })` crashed with an opaque
  // "Cannot read properties of undefined" when callers destructured methods
  // off the provider (`const { formatDate } = getProvider()`).
  const provider: I18nProvider = {
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

      // Reload all registered content modules for the new locale
      if (contentLoaders.size > 0) {
        logger.debug('Reloading content modules', contentLoaders.size, locale)
        await Promise.all(Array.from(contentLoaders.values()).map((loader) => loader(locale)))
      }

      currentLocale = locale
      logger.debug('Locale changed', locale)
      notify()
    },

    getLocales: () => Array.from(locales.values()),

    addLocale(config: LocaleConfig): void {
      locales.set(config.code, config)
      notify()
    },

    removeLocale(code: string): boolean {
      const removed = locales.delete(code)
      if (removed) notify()
      return removed
    },

    addTranslations(locale: string, translations: Translations, namespace?: string): void {
      // Auto-create the locale if it doesn't exist — mirroring the API-side
      // provider and the i18next bond. Throwing here broke the documented
      // locale-bond flow (`registerLocaleModule(locales)` registers 79 locales
      // and crashed on the first one not already configured), leaving the
      // provider partially mutated.
      let config = locales.get(locale)
      let createdLocale = false
      if (!config) {
        config = { code: locale, name: locale, translations: {} }
        locales.set(locale, config)
        createdLocale = true
      }
      if (!config.translations) config.translations = {}

      const target = namespace
        ? (config.translations[namespace] as Translations) || {}
        : config.translations
      // Checked before the merge: registering text that is already there (a
      // module registered twice, `enUi` re-applied after the companion bonds)
      // changes nothing on screen, so it must not re-render every subscriber.
      const changed = changesText(target, translations)

      // Deep-merge (not a shallow spread) so two modules registering under the
      // same top-level namespace key merge their subtrees instead of the
      // second call clobbering the first's nested translations wholesale —
      // matches the contract documented on `I18nProvider.addTranslations` and
      // the api-i18n-simple bond's identical fix.
      if (namespace) {
        config.translations[namespace] = deepMerge(target, translations)
      } else {
        config.translations = deepMerge(config.translations, translations)
      }

      // Notify AFTER the merge: subscribers (and the React hooks built on
      // `onLocaleChange`) must read the new keys. A new locale must be
      // announced so language pickers show it. Changed text that `t()` reads
      // must be announced so mounted components re-render instead of showing
      // the previous text or an inline fallback until an unrelated state
      // change: the ACTIVE locale's, and English's, which `t()` falls back to
      // for a key the active locale lacks. The i18next app bond also notifies
      // when translations arrive for the active language. Any other locale
      // changes nothing currently rendered, so it stays quiet.
      if (createdLocale || (changed && (locale === currentLocale || locale === 'en'))) notify()
    },

    t(
      key: string,
      values?: InterpolationValues,
      options?: { defaultValue?: string; count?: number },
    ): string {
      const config = locales.get(currentLocale)
      if (!config) {
        const fallback = options?.defaultValue || key
        return values ? interpolate(fallback, values) : fallback
      }

      // Fleet plural contract (matches i18next's key resolution order): when
      // `count` is provided, the plural-suffixed key (`key_one`/`key_few`/…,
      // falling back to `key_other`) is tried FIRST and wins over the base
      // `key` if BOTH are registered. Only when no plural-suffixed key exists
      // at all does resolution fall back to the base key. Previously the base
      // key won whenever present, so a catalog shipping both `item` and
      // `item_one`/`item_other` silently never pluralized under this provider.
      const lookup = (translations: Translations, locale: string): string | undefined => {
        if (options?.count !== undefined) {
          const pluralForm = getPluralForm(options.count, locale)
          const plural =
            getNestedValue(translations, `${key}_${pluralForm}`) ||
            getNestedValue(translations, `${key}_other`)
          if (plural !== undefined) return plural
        }
        return getNestedValue(translations, key)
      }

      let text = lookup(config.translations ?? {}, currentLocale)

      // Fall back to the English translations when the key is missing from the
      // current locale — mirroring the API-side core provider and the
      // api-i18n-simple bond. Previously a partially-translated locale showed
      // the raw KEY (or the inline defaultValue) even when a proper English
      // translation was registered, while the API side showed English text.
      if (text === undefined && currentLocale !== 'en') {
        const enConfig = locales.get('en')
        if (enConfig) {
          text = lookup(enConfig.translations ?? {}, 'en')
        }
      }

      if (text === undefined) {
        if (!options?.defaultValue) {
          logger.debug('Missing translation key', key, currentLocale)
        }
        const fallback = options?.defaultValue || key
        const allValues =
          options?.count !== undefined ? { count: options.count, ...values } : values
        return allValues ? interpolate(fallback, allValues) : fallback
      }

      // Add count to values for interpolation
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
        return provider.formatRelativeTime(date)
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

    onLocaleChange(listener: (locale: string) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    getRevision(): number {
      return revision
    },

    getDirection(): 'ltr' | 'rtl' {
      const config = locales.get(currentLocale)
      return config?.direction || 'ltr'
    },

    registerContent(module: string, loader: (locale: string) => Promise<void>): void {
      if (contentLoaders.has(module)) return
      contentLoaders.set(module, loader)
      logger.debug('Registered content module', module)
    },
  }

  return provider
}

/**
 * Default in-memory i18n provider instance with `'en'` locale.
 * Used as a fallback when no bond package provides a provider.
 */
export const simpleProvider = createSimpleI18nProvider()
