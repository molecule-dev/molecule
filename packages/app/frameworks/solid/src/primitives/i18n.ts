/**
 * Solid.js primitives for internationalization.
 *
 * @module
 */

import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
} from 'solid-js'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  NumberFormatOptions,
  TranslateFunction,
  TranslateOptions,
} from '@molecule/app-i18n'
import { getProvider as getBondedI18nProvider, I18nError } from '@molecule/app-i18n'

import { getI18nProvider, I18nContext } from '../context.js'

/**
 * The i18n provider: the one the nearest `MoleculeProvider` supplies
 * (`config.i18n`), otherwise the bonded `@molecule/app-i18n` provider, which
 * is the one the static `t` reads. A component can therefore translate
 * through the hooks wherever the static `t` works.
 *
 * @returns The i18n provider from context, or the bonded provider.
 */
export function useI18nProvider(): I18nProvider {
  return useContext(I18nContext) ?? getBondedI18nProvider()
}

/**
 * Subscribe the calling component to the provider's locale notifications.
 *
 * @param provider - The i18n provider from context.
 * @returns A version accessor that changes on every notification.
 */
function useLocaleNotifications(provider: I18nProvider): Accessor<number> {
  const [version, setVersion] = createSignal(0)
  const unsubscribe = provider.onLocaleChange(() => setVersion((v) => v + 1))
  onCleanup(unsubscribe)
  return version
}

/**
 * What {@link useTranslation} returns (the same names React returns).
 */
export interface UseTranslationResult {
  /**
   * Translates a key in the active locale. Follows locale changes, so text
   * read through it re-renders; `useT()` returns one that also keeps its
   * identity across locale changes.
   */
  t: I18nProvider['t']
  /** The active locale code, as an accessor. */
  locale: Accessor<string>
  /** Switches the active locale. Same function while the provider is unchanged. */
  setLocale: I18nProvider['setLocale']
  /** The registered locales, as an accessor; a new list once per notification. */
  locales: Accessor<ReturnType<I18nProvider['getLocales']>>
  /** Formats a number for the active locale. */
  formatNumber: I18nProvider['formatNumber']
  /** Formats a date for the active locale. */
  formatDate: I18nProvider['formatDate']
  /** The active locale's text direction, as an accessor. */
  direction: Accessor<'ltr' | 'rtl'>
}

/**
 * Internationalization state and actions, under React's hook name.
 *
 * @returns The translation function, the locale, and the formatters.
 * @example
 * ```tsx
 * const { t, locale, setLocale, formatNumber } = useTranslation()
 * <h1>{t('welcome.title', { name: 'User' })}</h1>
 * ```
 */
export function useTranslation(): UseTranslationResult {
  const provider = useI18nProvider()
  const version = useLocaleNotifications(provider)

  const t: I18nProvider['t'] = (key, values, options) => {
    version()
    return provider.t(key, values, options)
  }

  return {
    t,
    locale: () => {
      version()
      return provider.getLocale()
    },
    setLocale: (code: string) => provider.setLocale(code),
    locales: () => {
      version()
      return provider.getLocales()
    },
    formatNumber: (value: number, options?: NumberFormatOptions) =>
      provider.formatNumber(value, options),
    formatDate: (value: Date | number | string, options?: DateFormatOptions) =>
      provider.formatDate(value, options),
    direction: () => {
      version()
      return provider.getDirection()
    },
  }
}

/**
 * Options for the shorthand form of {@link UseTFunction}: the fallback text is
 * passed positionally, so only `count` remains here.
 */
export type UseTShorthandOptions = Omit<TranslateOptions, 'defaultValue'>

/**
 * Translation function returned by {@link useT}.
 *
 * Two compatible call forms:
 * - `t(key, values?, options?)` — the {@link I18nProvider.t} signature.
 * - `t(key, fallback, options?)` — a string second argument is the inline
 *   English `defaultValue`, with optional `count` for pluralization.
 *
 * Its identity is stable while the i18n provider instance is unchanged, so it
 * can be used directly as an effect dependency.
 */
export type UseTFunction = I18nProvider['t'] & {
  (key: string, fallback: string, options?: UseTShorthandOptions): string
}

/**
 * The translation function alone, under React's hook name.
 *
 * The returned function keeps ONE identity for as long as the provider
 * instance is unchanged (locale changes included), and still re-reads the
 * active translations on every call, so text read through it is current. Call
 * it in either of two compatible forms:
 *
 * - `t(key, values?, options?)` — the provider signature.
 * - `t(key, fallback, options?)` — a string second argument is the
 *   `defaultValue`, so `t('cart.empty', 'Your cart is empty')` equals
 *   `t('cart.empty', undefined, { defaultValue: 'Your cart is empty' })`.
 *
 * @returns The translation function (stable identity while the provider is
 *   unchanged).
 */
export function useT(): UseTFunction {
  const provider = useI18nProvider()
  const version = useLocaleNotifications(provider)

  const t = (
    key: string,
    valuesOrDefault?: InterpolationValues | string,
    options?: TranslateOptions,
  ): string => {
    version()
    return typeof valuesOrDefault === 'string'
      ? provider.t(key, undefined, { ...options, defaultValue: valuesOrDefault })
      : provider.t(key, valuesOrDefault, options)
  }
  return t as UseTFunction
}

/**
 * The current locale, under React's hook name.
 *
 * @returns Accessor for the current locale code.
 */
export function useLocale(): Accessor<string> {
  const { locale } = useTranslation()
  return locale
}

/**
 * The text direction, under React's hook name.
 *
 * @returns Accessor for the active locale's text direction ('ltr' or 'rtl').
 */
export function useDirection(): Accessor<'ltr' | 'rtl'> {
  const { direction } = useTranslation()
  return direction
}

/**
 * Translates an error at render time so the displayed message updates
 * automatically when the locale changes, under React's hook name.
 *
 * If `error` is an `I18nError` (thrown via `throw new I18nError(key)`), its
 * key is translated using the current locale; for plain `Error` instances,
 * `error.message` is returned unchanged.
 *
 * @param error - The error to translate, or `null`/`undefined`.
 * @returns Accessor for the translated error string, or null without an error.
 */
export function useI18nError(error: Error | null | undefined): Accessor<string | null> {
  const { t } = useTranslation()
  return () => {
    if (!error) return null
    // defaultValue is the I18nError's own message — the fallback text its
    // throw site provided (for a server error: the server's already-translated
    // message). Without it, a key the CLIENT dictionary happens to lack
    // renders as the raw key instead of a message.
    if (error instanceof I18nError) {
      return t(error.i18nKey, error.i18nValues, { defaultValue: error.message })
    }
    return error.message
  }
}

/**
 * Create i18n primitives for translations.
 *
 * @returns I18n primitives object
 *
 * @example
 * ```tsx
 * import { createI18n } from '@molecule/app-solid'
 *
 * function Greeting() {
 *   const { t, locale, setLocale } = createI18n()
 *
 *   return (
 *     <div>
 *       <h1>{t('greeting.hello')}</h1>
 *       <select
 *         value={locale()}
 *         onChange={(e) => setLocale(e.target.value)}
 *       >
 *         <option value="en">English</option>
 *         <option value="es">Español</option>
 *       </select>
 *     </div>
 *   )
 * }
 * ```
 */

/**
 * Creates a i18n.
 * @returns The created result.
 */
export function createI18n(): {
  t: TranslateFunction
  locale: Accessor<string>
  setLocale: (newLocale: string) => Promise<void>
  isReady: Accessor<boolean>
  getLocales: () => LocaleConfig[]
  hasKey: (key: string) => boolean
} {
  const provider = getI18nProvider()

  const [locale, setLocaleSignal] = createSignal<string>(provider.getLocale())
  const [isReady, setIsReady] = createSignal<boolean>(provider.isReady?.() ?? true)
  const [translationVersion, setTranslationVersion] = createSignal(0)

  // Subscribe to locale changes
  createEffect(() => {
    const unsubscribe = provider.onLocaleChange((newLocale: string) => {
      setLocaleSignal(newLocale)
      setTranslationVersion((v) => v + 1)
    })

    onCleanup(unsubscribe)
  })

  // Subscribe to ready state
  createEffect(() => {
    const unsubscribe = provider.onReady?.(() => {
      setIsReady(true)
    })

    onCleanup(() => unsubscribe?.())
  })

  const t: TranslateFunction = (
    key: string,
    values?: InterpolationValues,
    options?: TranslateOptions,
  ) => {
    // Re-run when locale or translations change
    locale()
    translationVersion()
    return provider.t(key, values, options)
  }

  const setLocale = async (newLocale: string): Promise<void> => {
    await provider.setLocale(newLocale)
  }

  return {
    t,
    locale,
    setLocale,
    isReady,
    getLocales: () => provider.getLocales(),
    hasKey: (key: string) => provider.hasKey?.(key) ?? provider.exists(key),
  }
}

/**
 * Get translate function.
 *
 * @returns Translate function
 *
 * @example
 * ```tsx
 * function Button() {
 *   const t = useTranslate()
 *   return <button>{t('buttons.submit')}</button>
 * }
 * ```
 */
export function useTranslate(): TranslateFunction {
  const { t } = createI18n()
  return t
}

/**
 * Create a reactive plural translation.
 *
 * @param key - Translation key
 * @param count - Count accessor for pluralization
 * @param values - Interpolation values for the translation.
 * @returns Accessor for translated string
 *
 * @example
 * ```tsx
 * function ItemCount() {
 *   const [count, setCount] = createSignal(5)
 *   const text = usePlural('items.count', count)
 *   return <span>{text()}</span>
 * }
 * ```
 */
export function usePlural(
  key: string,
  count: Accessor<number>,
  values?: InterpolationValues,
): Accessor<string> {
  const { t, locale } = createI18n()

  return createMemo(() => {
    locale()
    return t(key, values, { count: count() })
  })
}

/**
 * Create i18n helpers from context.
 *
 * @returns I18n helper functions
 */

/**
 * Creates a i18n helpers.
 * @returns The created result.
 */
export function createI18nHelpers(): {
  t: TranslateFunction
  getLocale: () => string
  setLocale: (locale: string) => Promise<void>
  getLocales: () => LocaleConfig[]
  hasKey: (key: string) => boolean
  isReady: () => boolean
} {
  const provider = getI18nProvider()

  return {
    t: provider.t.bind(provider),
    getLocale: () => provider.getLocale(),
    setLocale: (locale: string) => provider.setLocale(locale),
    getLocales: () => provider.getLocales(),
    hasKey: (key: string) => provider.hasKey?.(key) ?? provider.exists(key),
    isReady: () => provider.isReady?.() ?? true,
  }
}

/**
 * Create i18n primitives from a specific provider.
 *
 * @param provider - I18n provider
 * @returns I18n primitives
 */

/**
 * Creates a i18n from provider.
 * @param provider - The provider implementation.
 * @returns The created result.
 */
export function createI18nFromProvider(provider: I18nProvider): {
  t: TranslateFunction
  locale: Accessor<string>
  setLocale: (newLocale: string) => Promise<void>
  isReady: Accessor<boolean>
  getLocales: () => LocaleConfig[]
  hasKey: (key: string) => boolean
} {
  const [locale, setLocaleSignal] = createSignal<string>(provider.getLocale())
  const [isReady, setIsReady] = createSignal<boolean>(provider.isReady?.() ?? true)
  const [translationVersion, setTranslationVersion] = createSignal(0)

  createEffect(() => {
    const unsubscribe = provider.onLocaleChange((newLocale: string) => {
      setLocaleSignal(newLocale)
      setTranslationVersion((v) => v + 1)
    })

    onCleanup(unsubscribe)
  })

  createEffect(() => {
    const unsubscribe = provider.onReady?.(() => {
      setIsReady(true)
    })

    onCleanup(() => unsubscribe?.())
  })

  const t: TranslateFunction = (
    key: string,
    values?: InterpolationValues,
    options?: TranslateOptions,
  ) => {
    locale()
    translationVersion()
    return provider.t(key, values, options)
  }

  return {
    t,
    locale,
    setLocale: async (newLocale: string) => {
      await provider.setLocale(newLocale)
    },
    isReady,
    getLocales: () => provider.getLocales(),
    hasKey: (key: string) => provider.hasKey?.(key) ?? provider.exists(key),
  }
}
