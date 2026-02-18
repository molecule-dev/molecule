/**
 * Locale registration for the user resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  const userLocales = await import('@molecule/api-locales-user')
  registerLocaleModule(userLocales)
} catch {
  // Locale package not available (not built or not installed).
}

try {
  const paymentLocales = await import('@molecule/api-locales-user-payments')
  registerLocaleModule(paymentLocales)
} catch {
  // Locale package not available (not built or not installed).
}

/**
 * The i18n registered.
 */
export const i18nRegistered = true
