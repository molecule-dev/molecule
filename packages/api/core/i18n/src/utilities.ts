/**
 * Utility functions for the internationalization (i18n) module.
 *
 * @module
 */

import type { InterpolationValues, Translations } from './types.js'

/**
 * Resolves a dot-notation key (e.g. `'auth.login.email'`) against a nested
 * translations object. Checks for a flat key match first, then traverses
 * the nested structure.
 *
 * @param obj - The translations object to search.
 * @param key - The dot-notation key to resolve.
 * @returns The translation string if found, or `undefined`.
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
 * Replaces `{{variable}}` placeholders in a translation string with their
 * corresponding values. Date values are formatted with `toLocaleDateString()`.
 *
 * @param text - The translation string containing `{{variable}}` placeholders.
 * @param values - Key-value map of interpolation values.
 * @returns The string with placeholders replaced by their values.
 */
export const interpolate = (text: string, values: InterpolationValues): string => {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key]
    if (value === undefined) return `{{${key}}}`
    if (value instanceof Date) return value.toLocaleDateString()
    return String(value)
  })
}
