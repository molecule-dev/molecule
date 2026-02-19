/**
 * i18n bond accessor and convenience translation functions.
 *
 * If no custom provider is bonded, a simple in-memory i18n provider
 * is auto-created on first access.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import { createSimpleI18nProvider } from './provider.js'
import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  Translations,
} from './types.js'

const BOND_TYPE = 'app-i18n'

/**
 * Registers an i18n provider as the active singleton.
 *
 * @param provider - The i18n provider implementation to bond.
 */
export const setProvider = (provider: I18nProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded i18n provider. If none is bonded,
 * automatically creates a simple in-memory provider.
 *
 * @returns The active i18n provider instance.
 */
export const getProvider = (): I18nProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createSimpleI18nProvider())
  }
  return bondGet<I18nProvider>(BOND_TYPE)!
}

/**
 * Returns the current locale code (e.g. `'en'`, `'fr'`).
 * @returns The active locale code string.
 */
export const getLocale = (): string => getProvider().getLocale()

/**
 * Sets the active locale and loads its translations if a loader is configured.
 *
 * @param locale - The locale code to activate (e.g. `'en'`, `'fr'`).
 * @returns A promise that resolves when the locale is activated and translations are loaded.
 */
export const setLocale = (locale: string): Promise<void> => getProvider().setLocale(locale)

/**
 * Registers a locale configuration (code, name, translations or loader).
 *
 * @param config - The locale configuration to add.
 * @returns Nothing.
 */
export const addLocale = (config: LocaleConfig): void => getProvider().addLocale(config)

/**
 * Adds translations to a locale, optionally under a namespace prefix.
 *
 * @param locale - The locale code to add translations to.
 * @param translations - The translation key-value map.
 * @param namespace - Optional namespace prefix for the translation keys.
 * @returns Nothing.
 */
export const addTranslations = (
  locale: string,
  translations: Translations,
  namespace?: string,
): void => getProvider().addTranslations(locale, translations, namespace)

/**
 * Registers all locale exports from a locale bond module.
 * Handles `zhTW` → `zh-TW` camelCase-to-code mapping automatically.
 *
 * @param moduleExports - The `import * as locales` object from a locale bond package.
 *
 * @example
 * ```typescript
 * import * as locales from '@molecule/app-locales-forms'
 * registerLocaleModule(locales)
 * ```
 */
export const registerLocaleModule = (moduleExports: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(moduleExports)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Check if this looks like a translations record (object with string values)
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length === 0 || typeof entries[0][1] !== 'string') continue

      // Map camelCase locale identifiers to standard codes (e.g., zhTW → zh-TW)
      const locale = key === 'zhTW' ? 'zh-TW' : key
      addTranslations(locale, value as Translations)
    }
  }
}

/**
 * Translates a key using the bonded i18n provider, with optional
 * interpolation values and pluralization.
 *
 * @param key - Dot-delimited translation key (e.g. `'auth.login.title'`).
 * @param values - Interpolation values to substitute into the translation.
 * @param options - Translation options including `defaultValue` and `count` for pluralization.
 * @param options.defaultValue - Fallback string if the key is not found.
 * @param options.count - Count value for pluralization.
 * @returns The translated string, or the `defaultValue` / key if not found.
 */
export const t = (
  key: string,
  values?: InterpolationValues,
  options?: { defaultValue?: string; count?: number },
): string => getProvider().t(key, values, options)

/**
 * Formats a number according to the current locale.
 *
 * @param value - The number to format.
 * @param options - Number formatting options (style, currency, fraction digits).
 * @returns The locale-formatted number string.
 */
export const formatNumber = (value: number, options?: NumberFormatOptions): string =>
  getProvider().formatNumber(value, options)

/**
 * Formats a date according to the current locale.
 *
 * @param value - The date to format (Date object, timestamp, or date string).
 * @param options - Date formatting options (dateStyle, timeStyle, relative).
 * @returns The locale-formatted date string.
 */
export const formatDate = (value: Date | number | string, options?: DateFormatOptions): string =>
  getProvider().formatDate(value, options)

/**
 * Formats a relative time (e.g. "2 hours ago", "in 3 days").
 *
 * @param value - The date or timestamp to express relative to now.
 * @returns The locale-formatted relative time string.
 */
export const formatRelativeTime = (value: Date | number): string =>
  getProvider().formatRelativeTime(value)

/**
 * Subscribes to locale changes. The listener fires whenever `setLocale()` is called.
 *
 * @param listener - Callback invoked with the new locale code.
 * @returns An unsubscribe function.
 */
export const onLocaleChange = (listener: (locale: string) => void): (() => void) =>
  getProvider().onLocaleChange(listener)

/**
 * Registers a lazily-loaded content module for automatic reload on locale changes.
 * All registered content is reloaded during `setLocale()` before listeners fire.
 *
 * @param module - Unique content module identifier (e.g. `'privacyPolicy'`).
 * @param loader - Function that loads and merges translations for a given locale.
 */
export const registerContent = (
  module: string,
  loader: (locale: string) => Promise<void>,
): void => {
  getProvider().registerContent?.(module, loader)
}
