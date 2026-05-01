/**
 * Locale registration for the room-type resource.
 *
 * The companion locale bond (`@molecule/api-locales-room-type`) is loaded
 * dynamically when present so this package remains usable in environments
 * that have not installed the locale bond yet — `t()` will fall through to
 * the inline `defaultValue` strings the handlers supply.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  // @ts-expect-error — locale package may not be installed yet
  const locales = await import('@molecule/api-locales-room-type')
  registerLocaleModule(locales)
} catch {
  // Locale package not available (not built or not installed).
}

/**
 * Whether i18n registration has been attempted.
 */
export const i18nRegistered = true
