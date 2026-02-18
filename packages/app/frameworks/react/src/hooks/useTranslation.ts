/**
 * React hook for internationalization.
 *
 * @module
 */

import { useCallback, useContext, useEffect, useState } from 'react'

import type {
  DateFormatOptions,
  I18nProvider,
  InterpolationValues,
  NumberFormatOptions,
} from '@molecule/app-i18n'
import { t } from '@molecule/app-i18n'

import { I18nContext } from '../contexts.js'
import type { UseTranslationResult } from '../types.js'

/**
 * Hook to access the i18n provider from context.
 *
 * @returns The i18n provider from context
 * @throws {Error} Error if used outside of I18nProvider
 */
export function useI18nProvider(): I18nProvider {
  const provider = useContext(I18nContext)
  if (!provider) {
    throw new Error(
      t('react.error.useI18nOutsideProvider', undefined, {
        defaultValue: 'useI18nProvider must be used within an I18nProvider',
      }),
    )
  }
  return provider
}

/**
 * Hook for internationalization.
 *
 * @returns Translation function and locale management
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale, formatNumber } = useTranslation()
 *
 * return (
 *   <div>
 *     <h1>{t('welcome.title', { name: 'User' })}</h1>
 *     <p>{formatNumber(1234.56, { style: 'currency', currency: 'USD' })}</p>
 *     <select value={locale} onChange={(e) => setLocale(e.target.value)}>
 *       <option value="en">English</option>
 *       <option value="es">Spanish</option>
 *     </select>
 *   </div>
 * )
 * ```
 */
export function useTranslation(): UseTranslationResult {
  const provider = useI18nProvider()

  const [locale, setLocaleState] = useState(() => provider.getLocale())
  const [direction, setDirection] = useState(() => provider.getDirection())
  const [locales, setLocales] = useState(() => provider.getLocales())

  useEffect(() => {
    const unsubscribe = provider.onLocaleChange(() => {
      setLocaleState(provider.getLocale())
      setDirection(provider.getDirection())
      setLocales(provider.getLocales())
    })
    return unsubscribe
  }, [provider])

  // Memoized translation function
  const t = useCallback(
    (key: string, values?: InterpolationValues) => provider.t(key, values),
    [provider, locale],
  )

  // Memoized action wrappers
  const setLocale = useCallback((code: string) => provider.setLocale(code), [provider])

  const formatNumber = useCallback(
    (value: number, options?: NumberFormatOptions) => provider.formatNumber(value, options),
    [provider],
  )

  const formatDate = useCallback(
    (value: Date | number | string, options?: DateFormatOptions) =>
      provider.formatDate(value, options),
    [provider],
  )

  return {
    t,
    locale,
    setLocale,
    locales,
    formatNumber,
    formatDate,
    direction,
  }
}

/**
 * Hook to get just the translation function.
 *
 * @returns The translation function
 */
export function useT(): (key: string, values?: InterpolationValues) => string {
  const provider = useI18nProvider()
  return useCallback(
    (key: string, values?: InterpolationValues) => provider.t(key, values),
    [provider],
  )
}

/**
 * Hook to get the current locale.
 *
 * @returns The current locale code
 */
export function useLocale(): string {
  const { locale } = useTranslation()
  return locale
}

/**
 * Hook to get the text direction.
 *
 * @returns The text direction ('ltr' or 'rtl')
 */
export function useDirection(): 'ltr' | 'rtl' {
  const { direction } = useTranslation()
  return direction
}
