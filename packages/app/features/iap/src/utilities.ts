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
 *
 * Every recognized error code maps to one literal `t()` call with a literal key
 * (`iap.error.<code>`), so the locale bond's parity check can see each key and
 * every non-English locale resolves it. A code outside the known set (store
 * providers are open-ended) falls back to the error's own message, and an
 * unknown-shaped error to the `iap.error.E_UNKNOWN` fallback key.
 *
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
      if (!t) {
        return errorMessages[code]
      }
      switch (code) {
        case 'E_UNKNOWN':
          return t('iap.error.E_UNKNOWN', undefined, {
            defaultValue: 'An unknown error occurred.',
          })
        case 'E_NOT_AVAILABLE':
          return t('iap.error.E_NOT_AVAILABLE', undefined, {
            defaultValue: 'In-app purchases are not available.',
          })
        case 'E_USER_CANCELLED':
          return t('iap.error.E_USER_CANCELLED', undefined, {
            defaultValue: 'Purchase was cancelled.',
          })
        case 'E_ITEM_UNAVAILABLE':
          return t('iap.error.E_ITEM_UNAVAILABLE', undefined, {
            defaultValue: 'This item is not available for purchase.',
          })
        case 'E_NETWORK':
          return t('iap.error.E_NETWORK', undefined, { defaultValue: 'Network error.' })
        case 'E_SERVICE_ERROR':
          return t('iap.error.E_SERVICE_ERROR', undefined, {
            defaultValue: 'The store service encountered an error.',
          })
        case 'E_ALREADY_OWNED':
          return t('iap.error.E_ALREADY_OWNED', undefined, {
            defaultValue: 'You already own this item.',
          })
        case 'E_NOT_OWNED':
          return t('iap.error.E_NOT_OWNED', undefined, {
            defaultValue: 'You do not own this item.',
          })
        case 'E_VERIFICATION_FAILED':
          return t('iap.error.E_VERIFICATION_FAILED', undefined, {
            defaultValue: 'Purchase verification failed.',
          })
        case 'E_DEFERRED':
          return t('iap.error.E_DEFERRED', undefined, {
            defaultValue: 'Purchase requires approval.',
          })
      }
    }

    if (e.message) {
      return e.message
    }
  }

  if (typeof error === 'string') {
    return error
  }

  const fallback = errorMessages.E_UNKNOWN
  return t
    ? t('iap.error.E_UNKNOWN', undefined, { defaultValue: 'An unknown error occurred.' })
    : fallback
}
