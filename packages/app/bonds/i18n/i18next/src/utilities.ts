/**
 * Utility functions for i18next provider.
 *
 * @module
 */

import type { LocaleConfig, Translations } from './types.js'

/**
 * Converts an array of molecule `LocaleConfig` objects to the i18next resource bundle format.
 * Each locale's translations are placed under a `translation` namespace keyed by locale code.
 * @param locales - The locale configurations with code and translations.
 * @returns An i18next-compatible resources object (e.g. `{ en: { translation: { ... } } }`).
 */
export const localeConfigToResources = (
  locales: LocaleConfig[],
): Record<string, { translation: Translations }> => {
  const resources: Record<string, { translation: Translations }> = {}
  for (const locale of locales) {
    resources[locale.code] = {
      translation: locale.translations ?? {},
    }
  }
  return resources
}
