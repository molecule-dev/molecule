/**
 * Svelte stores for internationalization.
 *
 * @module
 */

import { type Readable, readable } from 'svelte/store'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
} from '@molecule/app-i18n'

import { getI18nProvider } from '../context.js'

/**
 * I18n stores and actions.
 */
interface I18nStores {
  locale: Readable<string>
  direction: Readable<'ltr' | 'rtl'>
  locales: Readable<LocaleConfig[]>
  t: (key: string, values?: InterpolationValues) => string
  setLocale: (code: string) => void
  formatNumber: (value: number, options?: NumberFormatOptions) => string
  formatDate: (value: Date | number | string, options?: DateFormatOptions) => string
}

/**
 * Create i18n stores from the i18n provider in context.
 *
 * @returns I18n stores and actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createI18nStores } from '`@molecule/app-svelte`'
 *
 *   const { locale, direction, t, setLocale, formatNumber } = createI18nStores()
 * </script>
 *
 * <h1>{t('welcome.title', { name: 'User' })}</h1>
 * <p>Price: {formatNumber(99.99, { style: 'currency', currency: 'USD' })}</p>
 * <select bind:value={$locale} on:change={(e) => setLocale(e.target.value)}>
 *   <option value="en">English</option>
 *   <option value="es">Spanish</option>
 * </select>
 * ```
 */
export function createI18nStores(): I18nStores {
  const provider = getI18nProvider()

  // Locale store
  const locale: Readable<string> = readable(
    provider.getLocale(),
    (set: (value: string) => void) => {
      return provider.onLocaleChange(() => {
        set(provider.getLocale())
      })
    },
  )

  // Direction store
  const direction: Readable<'ltr' | 'rtl'> = readable(
    provider.getDirection(),
    (set: (value: 'ltr' | 'rtl') => void) => {
      return provider.onLocaleChange(() => {
        set(provider.getDirection())
      })
    },
  )

  // Locales store
  const locales: Readable<LocaleConfig[]> = readable(
    provider.getLocales(),
    (set: (value: LocaleConfig[]) => void) => {
      return provider.onLocaleChange(() => {
        set(provider.getLocales())
      })
    },
  )

  // Translation function (not a store, but reactive when locale changes)
  const t = (key: string, values?: InterpolationValues): string => {
    return provider.t(key, values)
  }

  // Actions
  const setLocale = (code: string): void => {
    provider.setLocale(code)
  }

  const formatNumber = (value: number, options?: NumberFormatOptions): string => {
    return provider.formatNumber(value, options)
  }

  const formatDate = (value: Date | number | string, options?: DateFormatOptions): string => {
    return provider.formatDate(value, options)
  }

  return {
    locale,
    direction,
    locales,
    t,
    setLocale,
    formatNumber,
    formatDate,
  }
}

/**
 * Create i18n stores from a specific provider.
 *
 * @param provider - I18n provider
 * @returns I18n stores and actions
 */
export function createI18nStoresFromProvider(provider: I18nProvider): I18nStores {
  const locale: Readable<string> = readable(
    provider.getLocale(),
    (set: (value: string) => void) => {
      return provider.onLocaleChange(() => set(provider.getLocale()))
    },
  )

  const direction: Readable<'ltr' | 'rtl'> = readable(
    provider.getDirection(),
    (set: (value: 'ltr' | 'rtl') => void) => {
      return provider.onLocaleChange(() => set(provider.getDirection()))
    },
  )

  return {
    locale,
    direction,
    locales: readable(provider.getLocales()),
    t: (key: string, values?: InterpolationValues) => provider.t(key, values),
    setLocale: (code: string) => provider.setLocale(code),
    formatNumber: (value: number, options?: NumberFormatOptions) =>
      provider.formatNumber(value, options),
    formatDate: (value: Date | number | string, options?: DateFormatOptions) =>
      provider.formatDate(value, options),
  }
}
