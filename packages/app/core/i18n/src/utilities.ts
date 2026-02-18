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
 * Replaces `{{key}}` placeholders in a string with values from the
 * provided map. Dates are formatted with `toLocaleDateString()`;
 * other values are converted via `String()`.
 *
 * @param text - The template string containing `\{\{key\}\}` placeholders.
 * @param values - A map of placeholder names to their replacement values.
 * @returns The interpolated string with all matched placeholders replaced.
 */
export const interpolate = (text: string, values: InterpolationValues): string => {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key]
    if (value === undefined) return `{{${key}}}`
    if (value instanceof Date) return value.toLocaleDateString()
    return String(value)
  })
}
