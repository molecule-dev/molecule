/**
 * Translation convenience functions for the internationalization (i18n) module.
 *
 * These functions provide a simplified API that delegates to the bonded i18n provider.
 * If no provider is bonded when `t()` is called, returns the `defaultValue` or the key itself.
 * If no provider is bonded when `getProvider()` is called, a simple in-memory provider is
 * auto-created and bonded.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'

import { createSimpleI18nProvider } from './provider.js'
import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from './types.js'

const BOND_TYPE = 'i18n'

/**
 * Registers an i18n provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The i18n provider implementation to bond.
 */
export const setProvider = (provider: I18nProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded i18n provider. If none is bonded, auto-creates and
 * bonds a simple in-memory provider with `'en'` as the default locale.
 *
 * @returns The bonded i18n provider.
 */
export const getProvider = (): I18nProvider => {
  const existing = bondGet<I18nProvider>(BOND_TYPE)
  if (existing) {
    return existing
  }
  const defaultProvider = createSimpleI18nProvider()
  bond(BOND_TYPE, defaultProvider)
  return defaultProvider
}

/**
 * Checks whether an i18n provider is currently bonded.
 *
 * @returns `true` if an i18n provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Returns the current locale code (e.g. `'en'`, `'fr'`, `'zh-TW'`).
 *
 * @returns The active locale code.
 */
export const getLocale = (): string => getProvider().getLocale()

/**
 * Sets the active locale. Throws if the locale hasn't been registered.
 *
 * @param locale - The locale code to switch to (e.g. `'fr'`, `'zh-TW'`).
 * @returns Nothing.
 */
export const setLocale = (locale: string): void => getProvider().setLocale(locale)

/**
 * Registers a locale configuration (code, display name, direction, translations).
 *
 * @param config - The locale configuration to add.
 * @returns Nothing.
 */
export const addLocale = (config: LocaleConfig): void => getProvider().addLocale(config)

/**
 * Adds translation key-value pairs for a locale. Auto-creates the locale if
 * it doesn't already exist. Translations are deep-merged with existing ones.
 *
 * @param locale - The locale code to add translations for (e.g. `'en'`, `'fr'`).
 * @param translations - The translation key-value map to merge.
 * @param namespace - Optional namespace prefix to nest translations under.
 * @returns Nothing.
 */
export const addTranslations = (
  locale: string,
  translations: Translations,
  namespace?: string,
): void => getProvider().addTranslations(locale, translations, namespace)

/**
 * Translates a key using the bonded i18n provider. Falls back to `defaultValue` or
 * the key itself if no translation is found. Supports interpolation via `{{variable}}`
 * syntax and per-request locale override.
 *
 * On the API side, use the `locale` option for per-request translation
 * (e.g., emails, notifications) to avoid global state race conditions:
 *
 * ```ts
 * // Error responses — use default locale (English)
 * t('user.error.usernameRequired')
 *
 * // Emails — translate in user's locale
 * t('user.email.resetSubject', { appName }, { locale: userLocale })
 * ```
 *
 * @param key - The translation key (dot-notation, e.g. `'user.error.notFound'`).
 * @param values - Optional interpolation values to substitute `{{variable}}` placeholders.
 * @param options - Optional settings.
 * @param options.defaultValue - Fallback string if no translation is found.
 * @param options.count - Count for pluralization.
 * @param options.locale - Override locale for this specific translation.
 * @returns The translated string, or `defaultValue`, or the key if nothing matches.
 */
export const t = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string; count?: number; locale?: string },
): string => {
  const provider = bondGet<I18nProvider>(BOND_TYPE)
  if (!provider) {
    return options?.defaultValue || key
  }
  return provider.t(key, values, options)
}

/**
 * Formats a number according to the current locale using `Intl.NumberFormat`.
 *
 * @param value - The number to format.
 * @param options - Formatting options (style, currency, fraction digits, grouping).
 * @returns The locale-formatted number string.
 */
export const formatNumber = (value: number, options?: NumberFormatOptions): string =>
  getProvider().formatNumber(value, options)

/**
 * Formats a date according to the current locale using `Intl.DateTimeFormat`.
 *
 * @param value - The date to format (Date object, timestamp, or ISO string).
 * @param options - Formatting options (dateStyle, timeStyle, relative).
 * @returns The locale-formatted date string.
 */
export const formatDate = (value: Date | number | string, options?: DateFormatOptions): string =>
  getProvider().formatDate(value, options)

/**
 * Formats a relative time string (e.g. "2 hours ago", "in 3 days") using
 * `Intl.RelativeTimeFormat`.
 *
 * @param value - The date or timestamp to express relative to now.
 * @returns The locale-formatted relative time string.
 */
export const formatRelativeTime = (value: Date | number): string =>
  getProvider().formatRelativeTime(value)

/**
 * Registers all locale exports from a locale bond module. Iterates the module's
 * named exports, treating each object-valued export as a translation map keyed
 * by locale code (e.g. `en`, `fr`, `zhTW`). Handles `zhTW` → `zh-TW` mapping.
 *
 * @example
 * ```typescript
 * import * as locales from '@molecule/api-locales-user'
 * registerLocaleModule(locales)
 * ```
 *
 * @param moduleExports - The module's named exports (e.g. `{ en: {...}, fr: {...} }`).
 */
export const registerLocaleModule = (moduleExports: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(moduleExports)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0 || typeof entries[0][1] !== 'string') continue

      const locale = key === 'zhTW' ? 'zh-TW' : key
      addTranslations(locale, value as Translations)
    }
  }
}
