/**
 * Locale registration for the inventory resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  // @ts-expect-error — locale package may not be installed yet
  const locales = await import('@molecule/api-locales-inventory')
  registerLocaleModule(locales)
} catch {
  // Locale package not available (not built or not installed).
}

/**
 * Whether i18n registration has been attempted.
 */
export const i18nRegistered = true
