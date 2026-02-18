/**
 * String utilities for molecule.dev frontend applications.
 *
 * @module
 */

import type { AlphanumericOptions } from './types.js'

/**
 * Tests whether a string contains only alphanumeric characters
 * (and optionally spaces, dashes, or underscores). Supports
 * length constraints via `minLength` and `maxLength` options.
 *
 * @param value - The string to test.
 * @param options - Optional flags to allow spaces, dashes, underscores, and length constraints.
 * @returns `true` if the string matches the alphanumeric pattern.
 */
export const isAlphanumeric = (value: string, options?: AlphanumericOptions): boolean => {
  if (!value) return false

  let pattern = '^[a-zA-Z0-9'
  if (options?.allowSpaces) pattern += ' '
  if (options?.allowDashes) pattern += '\\-'
  if (options?.allowUnderscores) pattern += '_'
  pattern += ']'

  if (options?.minLength !== undefined || options?.maxLength !== undefined) {
    const min = options.minLength ?? 0
    const max = options.maxLength ?? ''
    pattern += `{${min},${max}}`
  } else {
    pattern += '+'
  }

  pattern += '$'

  return new RegExp(pattern).test(value)
}

/**
 * Strips non-alphanumeric characters from a string, keeping only
 * letters and digits (plus optionally spaces, dashes, or underscores).
 *
 * @param value - The string to clean.
 * @param options - Optional flags to preserve spaces, dashes, or underscores.
 * @returns The cleaned string with disallowed characters removed.
 */
export const alphanumeric = (value: string, options?: AlphanumericOptions): string => {
  if (!value) return ''

  let pattern = '[^a-zA-Z0-9'
  if (options?.allowSpaces) pattern += ' '
  if (options?.allowDashes) pattern += '\\-'
  if (options?.allowUnderscores) pattern += '_'
  pattern += ']'

  return value.replace(new RegExp(pattern, 'g'), '')
}

/**
 * Truncates a string to a maximum length, appending a suffix
 * (default `"..."`) when the string exceeds the limit.
 *
 * @param value - The string to truncate.
 * @param maxLength - The maximum total length including the suffix.
 * @param suffix - The truncation indicator appended when the string is shortened (default: `"..."`).
 * @returns The original string if within limits, or the truncated string with suffix.
 */
export const truncate = (value: string, maxLength: number, suffix = '...'): string => {
  if (!value || value.length <= maxLength) return value

  return value.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Converts a string to Title Case (capitalizes the first letter of each word).
 *
 * @param value - The string to convert.
 * @returns The title-cased string, or an empty string if the input is falsy.
 */
export const toTitleCase = (value: string): string => {
  if (!value) return ''

  return value.toLowerCase().replace(/(?:^|\s)\w/g, (char) => char.toUpperCase())
}

/**
 * Converts a camelCase, PascalCase, snake_case, or space-separated string
 * to kebab-case (e.g. `"myVariable"` becomes `"my-variable"`).
 *
 * @param value - The string to convert.
 * @returns The kebab-cased string, or an empty string if the input is falsy.
 */
export const toKebabCase = (value: string): string => {
  if (!value) return ''

  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

/**
 * Converts a kebab-case, snake_case, or space-separated string
 * to camelCase (e.g. `"my-variable"` becomes `"myVariable"`).
 *
 * @param value - The string to convert.
 * @returns The camelCased string, or an empty string if the input is falsy.
 */
export const toCamelCase = (value: string): string => {
  if (!value) return ''

  return value
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[A-Z]/, (char) => char.toLowerCase())
}
