/**
 * Locale registration for the API key resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  const locales = await import('@molecule/api-locales-resource-api-key')
  registerLocaleModule(locales)
} catch {
  // Locale package not available — translations will fall back to defaults.
}

/** Marker indicating that the i18n locale module has been wired up. */
export const i18nRegistered = true
