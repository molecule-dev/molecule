/**
 * Svelte hook for internationalization, porting React's `useTranslation`
 * family: the locale-reactive values as readable stores, the translation and
 * formatting functions as plain functions.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { derived, type Readable, writable } from 'svelte/store'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  NumberFormatOptions,
  TranslateOptions,
} from '@molecule/app-i18n'
import { I18nError } from '@molecule/app-i18n'

import { useI18nProvider } from '../context.js'

/**
 * Options for the shorthand form of {@link UseTFunction}: the fallback text
 * is passed positionally, so only `count` remains here.
 */
export type UseTShorthandOptions = Omit<TranslateOptions, 'defaultValue'>

/**
 * Translation function returned by `useT()`.
 *
 * Two compatible call forms:
 * - `t(key, values?, options?)` — the provider's signature.
 * - `t(key, fallback, options?)` — a string second argument is the inline
 *   English `defaultValue`, with optional `count` for pluralization.
 */
export type UseTFunction = I18nProvider['t'] & {
  (key: string, fallback: string, options?: UseTShorthandOptions): string
}

/**
 * What {@link useTranslation} returns: the locale-reactive values as readable
 * stores and the provider's functions as plain functions.
 */
export interface UseTranslationResult {
  /**
   * Translates a key in the active locale. Reads the provider at call time,
   * so it always speaks the active locale (like React's `t`, which is rebuilt
   * on every locale change).
   */
  t: I18nProvider['t']
  /** The active locale code. */
  locale: Readable<string>
  /** Switches the active locale. */
  setLocale: I18nProvider['setLocale']
  /** The registered locales. */
  locales: Readable<ReturnType<I18nProvider['getLocales']>>
  /** Formats a number for the active locale. */
  formatNumber: I18nProvider['formatNumber']
  /** Formats a date for the active locale. */
  formatDate: I18nProvider['formatDate']
  /** The active locale's text direction. */
  direction: Readable<'ltr' | 'rtl'>
}

/**
 * Subscribes the calling component to the provider's locale notifications,
 * like React's `useLocaleSnapshot`.
 *
 * The store's value counts this hook's notifications, carries the active
 * locale and includes the provider's `getRevision()` when it exposes one, so
 * a notification, a locale switch or a revision bump (translations added for
 * the active locale) makes every derived value re-read the provider.
 *
 * @param provider - The i18n provider from context.
 * @returns A store whose value changes on every notification, revision and locale switch.
 */
function localeVersionStore(provider: I18nProvider): Readable<string> {
  let notifications = 0
  const read = (): string =>
    `${notifications}:${provider.getRevision?.() ?? 0}:${provider.getLocale()}`
  const version = writable(read())
  const stop = provider.onLocaleChange(() => {
    notifications += 1
    version.set(read())
  })
  onDestroy(stop)
  return version
}

/**
 * A locale-reactive value: re-read from the provider whenever the locale
 * version store changes.
 *
 * @param version - The store from {@link localeVersionStore}.
 * @param read - Reads the provider's current value.
 * @returns A readable store of the value.
 */
function localeValue<T>(version: Readable<string>, read: () => T): Readable<T> {
  return derived(version, () => read())
}

/**
 * Internationalization, React's `useTranslation` in Svelte's idiom: call it
 * during component init under `setMoleculeContext({ i18n })`.
 *
 * @returns The translation function and the locale values as stores.
 * @example
 * ```svelte
 * <script>
 *   import { useTranslation } from '@molecule/app-svelte'
 *   const { t, locale } = useTranslation()
 * </script>
 *
 * <h1>{t('welcome.title', { name: 'User' })}</h1>
 * <select value={$locale} onchange={(e) => setLocale(e.currentTarget.value)}>
 * ```
 */
export function useTranslation(): UseTranslationResult {
  const provider = useI18nProvider()
  const version = localeVersionStore(provider)

  return {
    t: (key: string, values?: InterpolationValues, options?: TranslateOptions) =>
      provider.t(key, values, options),
    locale: localeValue(version, () => provider.getLocale()),
    setLocale: (code: string) => provider.setLocale(code),
    locales: localeValue(version, () => provider.getLocales()),
    formatNumber: (value: number, options?: NumberFormatOptions) =>
      provider.formatNumber(value, options),
    formatDate: (value: Date | number | string, options?: DateFormatOptions) =>
      provider.formatDate(value, options),
    direction: localeValue(version, () => provider.getDirection()),
  }
}

/**
 * The translation function alone, React's `useT` in Svelte's idiom.
 *
 * Call it in either of two compatible forms:
 * - `t(key, values?, options?)` — the provider signature.
 * - `t(key, fallback, options?)` — a string second argument is the inline
 *   English `defaultValue`.
 *
 * @returns The translation function.
 */
export function useT(): UseTFunction {
  const provider = useI18nProvider()
  // The locale subscription keeps the component's `$store` reads (and any
  // locale-derived render) current; the function itself reads the provider at
  // call time, so its one identity is safe as a dependency either way.
  localeVersionStore(provider)
  return ((
    key: string,
    valuesOrDefault?: InterpolationValues | string,
    options?: TranslateOptions,
  ): string =>
    typeof valuesOrDefault === 'string'
      ? provider.t(key, undefined, { ...options, defaultValue: valuesOrDefault })
      : provider.t(key, valuesOrDefault, options)) as UseTFunction
}

/**
 * The current locale, React's `useLocale` in Svelte's idiom.
 *
 * @returns A readable store of the locale code.
 */
export function useLocale(): Readable<string> {
  const { locale } = useTranslation()
  return locale
}

/**
 * The text direction, React's `useDirection` in Svelte's idiom.
 *
 * @returns A readable store of 'ltr' or 'rtl'.
 */
export function useDirection(): Readable<'ltr' | 'rtl'> {
  const { direction } = useTranslation()
  return direction
}

/**
 * Translates an error at render time so the displayed message updates
 * automatically when the locale changes, React's `useI18nError` in Svelte's
 * idiom: a readable store of the translated message.
 *
 * **Always use this hook to display errors** — reading `error.message`
 * directly leaves stale text after a locale switch. If `error` is an
 * `I18nError` (thrown via `throw new I18nError(key)`), its key is translated
 * using the current locale. For plain `Error` instances, `error.message` is
 * returned unchanged.
 *
 * @param error - The error to translate, or `null`/`undefined`.
 * @returns A readable store of the translated error string, or null.
 */
export function useI18nError(error: Error | null | undefined): Readable<string | null> {
  const { t, locale } = useTranslation()
  return derived(locale, () => {
    if (!error) return null
    // defaultValue is the I18nError's own message — the fallback text its
    // throw site provided. Without it, a key the CLIENT dictionary lacks
    // renders as the raw key instead of a message.
    if (error instanceof I18nError) {
      return t(error.i18nKey, error.i18nValues, { defaultValue: error.message })
    }
    return error.message
  })
}
