/**
 * Pluralization utilities for the internationalization (i18n) module.
 *
 * @module
 */

/**
 * Returns the CLDR plural category (`'zero'`, `'one'`, `'two'`, `'few'`, `'many'`,
 * or `'other'`) for a given count and locale using `Intl.PluralRules`.
 *
 * @param count - The numeric count to determine the plural form for.
 * @param locale - The locale code to use for plural rule selection (e.g. `'en'`, `'ar'`).
 * @returns The plural category string.
 */
export const getPluralForm = (count: number, locale: string): string => {
  const rules = new Intl.PluralRules(locale)
  return rules.select(count)
}
