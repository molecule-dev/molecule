/**
 * Locale registration for the version-history resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  const locales = await import('@molecule/api-locales-resource-version-history')
  registerLocaleModule(locales)
} catch (_error) {
  // Locale package not available — translations fall back to inline defaults.
}

/**
 * The i18n registered.
 */
export const i18nRegistered = true
