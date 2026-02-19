/**
 * Solid.js primitives for internationalization.
 *
 * @module
 */

import { type Accessor, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'

import type {
  I18nProvider,
  InterpolationValues,
  LocaleConfig,
  TranslateFunction,
  TranslateOptions,
} from '@molecule/app-i18n'

import { getI18nProvider } from '../context.js'

/**
 * Create i18n primitives for translations.
 *
 * @returns I18n primitives object
 *
 * @example
 * ```tsx
 * import { createI18n } from '`@molecule/app-solid`'
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
 * Get current locale as accessor.
 *
 * @returns Accessor for current locale
 *
 * @example
 * ```tsx
 * function LocaleIndicator() {
 *   const locale = useLocale()
 *   return <span>Current: {locale()}</span>
 * }
 * ```
 */
export function useLocale(): Accessor<string> {
  const { locale } = createI18n()
  return locale
}

/**
 * Create a reactive translation.
 *
 * @param key - Translation key
 * @param values - Interpolation values for the translation.
 * @param options - Translation options
 * @returns Accessor for translated string
 *
 * @example
 * ```tsx
 * function WelcomeMessage() {
 *   const message = useTranslation('welcome.message', { name: 'User' })
 *   return <p>{message()}</p>
 * }
 * ```
 */
export function useTranslation(
  key: string,
  values?: InterpolationValues,
  options?: TranslateOptions,
): Accessor<string> {
  const { t, locale } = createI18n()

  return createMemo(() => {
    // Re-run when locale changes
    locale()
    return t(key, values, options)
  })
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
