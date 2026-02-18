/**
 * Locale registration for the device resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  const locales = await import('@molecule/api-locales-device')
  registerLocaleModule(locales)
} catch {
  // Locale package not available (not built or not installed).
}

/**
 * The i18n registered.
 */
export const i18nRegistered = true
