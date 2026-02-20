/**
 * Locale registration for the status resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  const locales = await import('@molecule/api-locales-status')
  registerLocaleModule(locales)
} catch {
  // Locale package not available (not built or not installed).
}

/**
 * The i18n namespace for the status resource.
 */
export const i18nNamespace = 'status'

/**
 * The i18n registered.
 */
export const i18nRegistered = true
