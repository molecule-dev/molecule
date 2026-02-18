/**
 * Locale registration for the payment resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  const locales = await import('@molecule/api-locales-payment')
  registerLocaleModule(locales)
} catch {
  // Locale package not available — translations will fall back to defaults
}

/**
 * The i18n registered.
 */
export const i18nRegistered = true
