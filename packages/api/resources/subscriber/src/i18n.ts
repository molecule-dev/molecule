/**
 * Locale registration for the subscriber resource.
 *
 * Companion locale bond is loaded best-effort: if `@molecule/api-locales-resource-subscriber`
 * is not installed, default English fallbacks supplied via `t(key, undefined, { defaultValue })`
 * are used.
 *
 * @module
 */

import { registerLocaleModule } from '@molecule/api-i18n'

try {
  // @ts-expect-error — locale package may not be installed yet
  const locales = await import('@molecule/api-locales-resource-subscriber')
  registerLocaleModule(locales)
} catch (_error) {
  // Locale package not available — handler errors fall back to inline English defaultValues.
  // Ignoring is safe: the package is optional and all t() calls supply defaultValue fallbacks.
}

/**
 * Whether i18n registration has been attempted.
 */
export const i18nRegistered = true
