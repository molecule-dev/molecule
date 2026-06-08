/**
 * Locale registration for the order resource.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  // @ts-expect-error — locale package may not be installed yet
  const locales = await import('@molecule/api-locales-order')
  registerLocaleModule(locales)
} catch (_error) {
  // Locale package not available (not built or not installed) — safe to skip.
}

/**
 * Whether i18n registration has been attempted.
 */
export const i18nRegistered = true
