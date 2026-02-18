/**
 * Error utilities for molecule.dev frontend applications.
 *
 * @module
 */

import { defaultTranslations } from './translations.js'

/**
 * Translation function signature compatible with `@molecule/app-i18n`.
 */
type TranslateFn = (
  key: string,
  values?: Record<string, unknown>,
  options?: { defaultValue?: string },
) => string

/**
 * Maps error codes to i18n translation keys.
 */
const errorKeyMap: Record<string, string> = {
  NETWORK_ERROR: 'error.networkError',
  TIMEOUT: 'error.timeout',
  UNAUTHORIZED: 'error.unauthorized',
  FORBIDDEN: 'error.forbidden',
  NOT_FOUND: 'error.notFound',
  VALIDATION_ERROR: 'error.validationError',
  SERVER_ERROR: 'error.serverError',
  UNKNOWN: 'error.unknown',
}

/**
 * Default English error messages for each error code, used as fallbacks
 * when no translation function is provided.
 */
export const defaultErrorMessages: Record<string, string> = Object.fromEntries(
  Object.entries(errorKeyMap).map(([code, key]) => [
    code,
    defaultTranslations.en[key as keyof typeof defaultTranslations.en],
  ]),
)

/**
 * Extracts a user-friendly error message from an unknown error value.
 * Handles strings, `Error` instances, and objects with `code`/`message`/`error`
 * properties. Recognizes `TypeError` (fetch failures) as network errors
 * and `AbortError` as timeouts.
 *
 * When a translation function `t` is provided, error messages are
 * passed through it for i18n support.
 *
 * @param error - The error value (string, Error, or object with code/message).
 * @param customMessages - Optional map of error codes to custom message strings that override defaults.
 * @param t - Optional i18n translation function for localizing error messages.
 * @returns A user-friendly error message string.
 */
export const getErrorMessage = (
  error: unknown,
  customMessages?: Record<string, string>,
  t?: TranslateFn,
): string => {
  const messages = { ...defaultErrorMessages, ...customMessages }

  const translate = (code: string): string => {
    const key = errorKeyMap[code]
    const fallback = messages[code] || messages.UNKNOWN
    return t && key ? t(key, undefined, { defaultValue: fallback }) : fallback
  }

  if (typeof error === 'string') {
    if (errorKeyMap[error]) return translate(error)
    if (messages[error]) return messages[error]
    return error
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return translate('NETWORK_ERROR')
    }

    if (error.name === 'AbortError') {
      return translate('TIMEOUT')
    }

    return error.message || translate('UNKNOWN')
  }

  if (typeof error === 'object' && error !== null) {
    const e = error as { code?: string; message?: string; error?: string }

    if (e.code && messages[e.code]) {
      return translate(e.code)
    }

    if (e.message) {
      return e.message
    }

    if (e.error) {
      return e.error
    }
  }

  return translate('UNKNOWN')
}
