/**
 * In-App Purchases utilities for molecule.dev.
 *
 * @module
 */

import { defaultTranslations } from './translations.js'
import type { IAPError } from './types.js'

/**
 * Error code mapping for user-friendly messages.
 * Derived from defaultTranslations to avoid duplicating strings.
 */
export const errorMessages: Record<string, string> = Object.fromEntries(
  Object.entries(defaultTranslations.en).map(([key, value]) => [
    key.replace('iap.error.', ''),
    value,
  ]),
)

/**
 * Gets a user-friendly error message.
 * @param error - The IAP error object or unknown thrown value to translate.
 * @param t - Optional i18n translation function for localized messages.
 * @returns A user-friendly error message string.
 */
export const getErrorMessage = (
  error: IAPError | unknown,
  t?: (
    key: string,
    values?: Record<string, unknown>,
    options?: { defaultValue?: string },
  ) => string,
): string => {
  if (typeof error === 'object' && error !== null) {
    const e = error as IAPError
    const code = String(e.code || '')

    if (errorMessages[code]) {
      const defaultMsg = errorMessages[code]
      return t ? t(`iap.error.${code}`, undefined, { defaultValue: defaultMsg }) : defaultMsg
    }

    if (e.message) {
      return e.message
    }
  }

  if (typeof error === 'string') {
    return error
  }

  const fallback = errorMessages.E_UNKNOWN
  return t ? t('iap.error.E_UNKNOWN', undefined, { defaultValue: fallback }) : fallback
}
