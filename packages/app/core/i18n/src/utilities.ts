/**
 * Utility functions for the internationalization (i18n) module.
 *
 * @module
 */

import type { InterpolationValues, Translations } from './types.js'

/**
 * Retrieves a translation string from a nested translations object using
 * dot-notation keys. First checks for a flat key match (e.g. `'auth.login.email'`
 * as a direct property), then traverses nested objects.
 *
 * @param obj - The translations object to search.
 * @param key - The dot-notation key (e.g. `'auth.login.title'`).
 * @returns The translation string, or `undefined` if not found.
 */
export const getNestedValue = (obj: Translations, key: string): string | undefined => {
  // Check flat key first (e.g., 'auth.login.email' as a direct property)
  if (typeof obj[key] === 'string') return obj[key]

  // Then try nested traversal (e.g., obj.auth.login.email)
  const parts = key.split('.')
  let current: Translations | string | undefined = obj

  for (const part of parts) {
    if (current === undefined || typeof current === 'string') {
      return undefined
    }
    current = current[part]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Recursively merges source translation entries into a COPY of the target
 * object, preserving existing keys and overwriting only the leaves that
 * conflict. Used by `addTranslations()` so registering two modules that
 * share a top-level namespace key merges their subtrees instead of one
 * module's translations clobbering the other's — matching the deep-merge
 * contract documented on `I18nProvider.addTranslations`.
 *
 * @param target - The base translations object (not mutated).
 * @param source - The translations to merge on top.
 * @returns A new object with `source` deep-merged over `target`.
 */
export const deepMerge = (target: Translations, source: Translations): Translations => {
  const result: Translations = { ...target }
  for (const key of Object.keys(source)) {
    const sv = source[key]
    const tv = result[key]
    if (typeof sv === 'object' && sv !== null && typeof tv === 'object' && tv !== null) {
      result[key] = deepMerge(tv as Translations, sv as Translations)
    } else {
      result[key] = sv
    }
  }
  return result
}

/**
 * Replaces `{{key}}` placeholders in a string with values from the
 * provided map. Dates are formatted with `toLocaleDateString()`;
 * other values are converted via `String()`.
 *
 * @param text - The template string containing `\{\{key\}\}` placeholders.
 * @param values - A map of placeholder names to their replacement values.
 * @returns The interpolated string with all matched placeholders replaced.
 */
export const interpolate = (text: string, values: InterpolationValues): string => {
  // Tolerate inner whitespace ("{{ name }}") — i18next trims interpolation
  // tokens, and translators routinely add the spaces. Without this, swapping
  // the i18next bond for the simple provider rendered "{{ name }}" literally.
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = values[key]
    if (value === undefined) return `{{${key}}}`
    if (value instanceof Date) return value.toLocaleDateString()
    return String(value)
  })
}
