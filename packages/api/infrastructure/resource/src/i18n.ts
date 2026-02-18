/**
 * Locale registration for the resource package.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  const locales = await import('@molecule/api-locales-resource')
  registerLocaleModule(locales)
} catch {
  // Locale package not available (not built or not installed).
}

/**
 * Sentinel value confirming that locale translations for the resource package
 * have been registered (or attempted). Always `true` after this module loads.
 */
export const i18nRegistered = true
