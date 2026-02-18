/**
 * Pluralization utilities for the internationalization (i18n) module.
 *
 * @module
 */

/**
 * Returns the CLDR plural category for a given count and locale
 * using the `Intl.PluralRules` API.
 *
 * @param count - The numeric count to determine the plural form for.
 * @param locale - The BCP 47 locale string (e.g. `'en'`, `'fr'`, `'ar'`).
 * @returns The plural category: `'zero'`, `'one'`, `'two'`, `'few'`, `'many'`, or `'other'`.
 */
export const getPluralForm = (count: number, locale: string): string => {
  const rules = new Intl.PluralRules(locale)
  return rules.select(count)
}
