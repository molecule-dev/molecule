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

import { type MaybeSignal, readMaybeSignal } from '../maybe-signal.js'
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
 * Options for the shorthand form of {@link UseTFunction}: the fallback text is
 * passed positionally, so only `count` remains here.
 */
export type UseTShorthandOptions = Omit<TranslateOptions, 'defaultValue'>

/**
 * The translation function {@link useT} returns.
 *
 * Two compatible call forms:
 * - `t(key, values?, options?)` — the {@link I18nProvider.t} signature.
 * - `t(key, fallback, options?)` — a string second argument is the inline
 *   English `defaultValue`, with optional `count` for pluralization.
 */
export type UseTFunction = I18nProvider['t'] & {
  (key: string, fallback: string, options?: UseTShorthandOptions): string
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
   *
   * Its identity follows the active locale, like React's `useTranslation().t`:
   * a value memoized on it (a `computed`, a child bound `t` as an input)
   * refreshes after a switch, while an `addTranslations` for the same locale
   * keeps it. `useT()` is the one-identity form.
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
  //
  // ONE identity per locale, like React's `useTranslation().t`: a locale switch
  // hands back a new function (so a value memoized on `t` refreshes), and an
  // `addTranslations` for the same locale keeps the current one. The function
  // still reads the notifications signal, so new text for the active locale
  // re-runs its caller even though its identity did not change.
  let translator: { locale: string; fn: I18nProvider['t'] } | null = null
  const currentTranslator = (): I18nProvider['t'] => {
    const code = provider.getLocale()
    if (translator?.locale === code) return translator.fn
    const fn: I18nProvider['t'] = (key, values, options) => {
      void notifications()
      return provider.t(key, values, options)
    }
    translator = { locale: code, fn }
    return fn
  }

  // The provider's own promise is returned (a caller may await the switch, and
  // a rejected switch surfaces to the caller exactly like React's).
  const setLocale: I18nProvider['setLocale'] = (code: string) => provider.setLocale(code)

  const formatNumber = (value: number, options?: NumberFormatOptions): string =>
    provider.formatNumber(value, options)

  const formatDate = (value: Date | number | string, options?: DateFormatOptions): string =>
    provider.formatDate(value, options)

  return {
    // A getter, so reading `t` yields the function for the locale active at
    // that read: the identity follows a switch without the caller re-creating
    // the result object.
    get t(): I18nProvider['t'] {
      return currentTranslator()
    },
    locale,
    setLocale,
    locales,
    formatNumber,
    formatDate,
    direction,
  }
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
export function useT(): UseTFunction {
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
 * The error may be a signal: the message then follows a changed error on the
 * same component, the way React re-renders `useI18nError` with a new argument.
 *
 * @param error - The error to translate, or `null`/`undefined` (or a signal of
 *   it).
 * @returns A signal of the error's display text, or `null`.
 */
export function useI18nError(error: MaybeSignal<Error | null | undefined>): Signal<string | null> {
  const provider = useI18nProvider()
  const notifications = useLocaleNotifications(provider)
  return computed(() => {
    // The notification count is the recompute key: the provider is read live
    // inside, so the text follows locale changes like React's render-time read.
    void notifications()
    const current = readMaybeSignal(error)
    if (!current) return null
    if (current instanceof I18nError) {
      return provider.t(current.i18nKey, current.i18nValues, { defaultValue: current.message })
    }
    return current.message
  })
}
