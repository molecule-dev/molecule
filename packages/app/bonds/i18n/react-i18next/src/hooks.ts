/**
 * React hooks for i18n.
 *
 * @module
 */

import { useTranslation } from 'react-i18next'

import type { DateFormatOptions, InterpolationValues, NumberFormatOptions } from './types.js'

/**
 * React hook that provides translation, locale switching, and formatting functions
 * using `react-i18next` under the hood. Wraps `useTranslation()` into the molecule i18n interface.
 * @returns An object with `t` (translate), `locale`, `setLocale`, `formatNumber`, and `formatDate`.
 */
export const useI18n = (): {
  t: (key: string, values?: InterpolationValues) => string
  locale: string
  setLocale: (locale: string) => Promise<unknown>
  formatNumber: (value: number, options?: NumberFormatOptions) => string
  formatDate: (value: Date | number | string, options?: DateFormatOptions) => string
} => {
  const { t, i18n } = useTranslation()

  return {
    t: (key: string, values?: InterpolationValues) => t(key, values as Record<string, unknown>),
    locale: i18n.language,
    setLocale: (locale: string) => i18n.changeLanguage(locale),
    formatNumber: (value: number, options?: NumberFormatOptions) =>
      new Intl.NumberFormat(i18n.language, options as Intl.NumberFormatOptions).format(value),
    formatDate: (value: Date | number | string, options?: DateFormatOptions) => {
      const date = value instanceof Date ? value : new Date(value)
      return new Intl.DateTimeFormat(i18n.language, {
        dateStyle: options?.dateStyle,
        timeStyle: options?.timeStyle,
      } as Intl.DateTimeFormatOptions).format(date)
    },
  }
}
