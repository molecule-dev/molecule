/**
 * Svelte stores for internationalization.
 *
 * @module
 */

import { derived, type Readable, readable } from 'svelte/store'

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
  t: Readable<(key: string, values?: InterpolationValues) => string>
  setLocale: (code: string) => Promise<void>
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

  // Internal version counter — bumps on every locale or translation change
  const _version: Readable<number> = readable(0, (set) => {
    let v = 0
    return provider.onLocaleChange(() => set(++v))
  })

  return {
    locale: derived(_version, () => provider.getLocale()),
    direction: derived(_version, () => provider.getDirection()),
    locales: derived(_version, () => provider.getLocales()),
    t: derived(
      _version,
      () => (key: string, values?: InterpolationValues) => provider.t(key, values),
    ),
    setLocale: (code: string) => provider.setLocale(code),
    formatNumber: (value: number, options?: NumberFormatOptions) =>
      provider.formatNumber(value, options),
    formatDate: (value: Date | number | string, options?: DateFormatOptions) =>
      provider.formatDate(value, options),
  }
}

/**
 * Create i18n stores from a specific provider.
 *
 * @param provider - I18n provider
 * @returns I18n stores and actions
 */
export function createI18nStoresFromProvider(provider: I18nProvider): I18nStores {
  const _version: Readable<number> = readable(0, (set) => {
    let v = 0
    return provider.onLocaleChange(() => set(++v))
  })

  return {
    locale: derived(_version, () => provider.getLocale()),
    direction: derived(_version, () => provider.getDirection()),
    locales: derived(_version, () => provider.getLocales()),
    t: derived(
      _version,
      () => (key: string, values?: InterpolationValues) => provider.t(key, values),
    ),
    setLocale: (code: string) => provider.setLocale(code),
    formatNumber: (value: number, options?: NumberFormatOptions) =>
      provider.formatNumber(value, options),
    formatDate: (value: Date | number | string, options?: DateFormatOptions) =>
      provider.formatDate(value, options),
  }
}
