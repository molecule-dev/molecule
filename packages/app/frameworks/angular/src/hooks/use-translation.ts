/**
 * Angular functions for internationalization, mirroring `useTranslation`,
 * `useT`, `useLocale`, `useDirection`, `useI18nError` and `useI18nProvider`
 * from `@molecule/app-react`.
 *
 * @module
 */

import { computed, DestroyRef, inject, type Signal, signal } from '@angular/core'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  NumberFormatOptions,
  TranslateOptions,
} from '@molecule/app-i18n'
import { getProvider, I18nError } from '@molecule/app-i18n'

import { I18N_PROVIDER } from '../tokens.js'

/**
 * The i18n provider registered by `provideMolecule({ i18n })` or
 * `provideI18n`, otherwise the bonded `@molecule/app-i18n` provider — the one
 * the static `t` reads. Call it in an injection context.
 *
 * @returns The i18n provider from the injector, or the bonded provider.
 */
export function useI18nProvider(): I18nProvider {
  const provided = inject(I18N_PROVIDER, { optional: true })
  return provided ?? getProvider()
}

/**
 * Subscribes to the provider's locale notifications and returns a signal that
 * changes on every notification (a locale switch, `addTranslations` for the
 * active locale, a revision bump).
 *
 * @param provider - The i18n provider.
 * @returns A signal that changes on every locale notification.
 */
function useLocaleNotifications(provider: I18nProvider): Signal<number> {
  const notifications = signal(0)
  const stop = provider.onLocaleChange(() => notifications.update((count) => count + 1))
  inject(DestroyRef).onDestroy(stop)
  return notifications.asReadonly()
}

/**
 * What {@link useTranslation} returns.
 */
export interface UseTranslationResult {
  /**
   * The translation function. A plain function (a signal would be read as the
   * method itself) that reads the provider on every call AND the locale
   * notifications signal, so a template, `computed` or `effect` that calls it
   * re-runs on a locale switch the way React re-renders on one.
   */
  readonly t: I18nProvider['t']
  /** The active locale code. */
  readonly locale: Signal<string>
  /** Switches the active locale; resolves when the provider has switched it. */
  setLocale: I18nProvider['setLocale']
  /** The available locales; a fresh list once per notification. */
  readonly locales: Signal<I18nProvider['getLocales'] extends () => infer L ? L : never>
  /** Formats a number for the active locale. */
  formatNumber: (value: number, options?: NumberFormatOptions) => string
  /** Formats a date for the active locale. */
  formatDate: (value: Date | number | string, options?: DateFormatOptions) => string
  /** The active locale's text direction. */
  readonly direction: Signal<'ltr' | 'rtl'>
}

/**
 * Translation, locale state and the formatters. Call it in an injection
 * context (a component field initializer or constructor).
 *
 * @returns The translation function, the locale fields and the formatters.
 */
export function useTranslation(): UseTranslationResult {
  const provider = useI18nProvider()
  const notifications = useLocaleNotifications(provider)

  // Read from the provider on every read, never copied into state: a replaced
  // provider shows its own values immediately.
  const locale = computed(() => {
    void notifications()
    return provider.getLocale()
  })
  const direction = computed(() => {
    void notifications()
    return provider.getDirection()
  })
  // A new list once per notification, the same list otherwise, so a computed
  // that depends on it stays stable.
  const locales = computed(() => {
    void notifications()
    return provider.getLocales()
  })
  // A plain function (never a signal: the conformance kit reads a method field
  // by calling the value itself, and an Angular signal IS a function). Reading
  // the notifications signal inside it makes the CALLER depend on the locale, so
  // a view that renders `t(…)` (directly or through a method) refreshes on a
  // switch without reading `locale()` itself.
  const t: I18nProvider['t'] = (
    key: string,
    values?: InterpolationValues,
    options?: TranslateOptions,
  ) => {
    void notifications()
    return provider.t(key, values, options)
  }

  // The provider's own promise is returned (a caller may await the switch, and
  // a rejected switch surfaces to the caller exactly like React's).
  const setLocale: I18nProvider['setLocale'] = (code: string) => provider.setLocale(code)

  const formatNumber = (value: number, options?: NumberFormatOptions): string =>
    provider.formatNumber(value, options)

  const formatDate = (value: Date | number | string, options?: DateFormatOptions): string =>
    provider.formatDate(value, options)

  return { t, locale, setLocale, locales, formatNumber, formatDate, direction }
}

/**
 * The translation function alone. Call it in an injection context.
 *
 * The returned function keeps ONE identity for as long as the provider is
 * unchanged; it reads the active locale and the locale notifications on
 * every CALL, so its text is current and its caller re-runs on a switch.
 *
 * Call it in either of two compatible forms:
 * - `t(key, values?, options?)` — the provider signature.
 * - `t(key, fallback, options?)` — a string second argument is the
 *   `defaultValue`.
 *
 * @returns The translation function.
 */
export function useT(): (
  key: string,
  valuesOrDefault?: InterpolationValues | string,
  options?: TranslateOptions,
) => string {
  const provider = useI18nProvider()
  const notifications = useLocaleNotifications(provider)
  return (
    key: string,
    valuesOrDefault?: InterpolationValues | string,
    options?: TranslateOptions,
  ): string => {
    // The caller depends on the locale through this read (see useTranslation).
    void notifications()
    return typeof valuesOrDefault === 'string'
      ? provider.t(key, undefined, { ...options, defaultValue: valuesOrDefault })
      : provider.t(key, valuesOrDefault, options)
  }
}

/**
 * The active locale code alone. Call it in an injection context.
 *
 * @returns A signal of the locale code.
 */
export function useLocale(): Signal<string> {
  return useTranslation().locale
}

/**
 * The active locale's text direction alone. Call it in an injection context.
 *
 * @returns A signal of `'ltr'` or `'rtl'`.
 */
export function useDirection(): Signal<'ltr' | 'rtl'> {
  return useTranslation().direction
}

/**
 * Translates an error at read time, so the displayed message follows locale
 * changes. An `I18nError` is translated through its key (its own message as
 * the default value); a plain `Error` returns its message unchanged; no error
 * returns `null`. Call it in an injection context.
 *
 * @param error - The error to translate, or `null`/`undefined`.
 * @returns A signal of the error's display text, or `null`.
 */
export function useI18nError(error: Error | null | undefined): Signal<string | null> {
  const provider = useI18nProvider()
  const notifications = useLocaleNotifications(provider)
  return computed(() => {
    // The notification count is the recompute key: the provider is read live
    // inside, so the text follows locale changes like React's render-time read.
    void notifications()
    if (!error) return null
    if (error instanceof I18nError) {
      return provider.t(error.i18nKey, error.i18nValues, { defaultValue: error.message })
    }
    return error.message
  })
}
