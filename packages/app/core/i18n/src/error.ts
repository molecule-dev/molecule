/**
 * I18nError — an Error subclass that carries a translation key.
 *
 * Thrown instead of `new Error(t('key'))` so that the key is preserved and
 * the message can be re-translated at render time when the locale changes.
 *
 * @module
 */

import type { InterpolationValues } from './types.js'
import { interpolate } from './utilities.js'

/**
 * An error that stores an i18n key instead of a pre-translated string.
 *
 * **Always throw this instead of `new Error(t('key'))`.**
 * The plain-Error form translates at throw-time, permanently freezing the message
 * in whatever locale was active — switching languages later has no effect.
 * `I18nError` preserves the key so `useI18nError` (from `@molecule/app-react`)
 * can re-translate at render time, making displayed errors update automatically
 * when the locale changes.
 *
 * The `fallback` argument (English text, the key's en.ts text with its `{{name}}` placeholders)
 * becomes `error.message`, filled in from `values`, for non-React consumers such as loggers and
 * unit tests; `i18nKey` and `i18nValues` keep what re-translation needs.
 */
export class I18nError extends Error {
  readonly i18nKey: string
  readonly i18nValues?: InterpolationValues

  constructor(key: string, values?: InterpolationValues, fallback?: string, cause?: unknown) {
    super(
      fallback === undefined ? key : values ? interpolate(fallback, values) : fallback,
      cause !== undefined ? { cause } : undefined,
    )
    this.name = 'I18nError'
    this.i18nKey = key
    this.i18nValues = values
  }
}
