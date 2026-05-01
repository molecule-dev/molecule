/**
 * Pure helpers for snippet-template substitution.
 *
 * @module
 */

import type { EmbedSnippetValues } from './types.js'

/**
 * Coerce a width/height value into the string form embedded in the
 * rendered snippet. Numbers become `<n>px`; strings pass through; nullish
 * values become an empty string.
 *
 * @param value - The raw value supplied by the caller.
 * @returns A string ready for substitution.
 */
export function coerceDimension(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number') return `${value}px`
  return value
}

/**
 * Substitute `{{width}}`, `{{height}}`, `{{theme}}` (case-sensitive,
 * optional internal whitespace) in a template with the supplied values.
 *
 * Unknown placeholders are left untouched so callers can freely mix this
 * with their own templating.
 *
 * @param template - Raw snippet template.
 * @param values - Values to substitute.
 * @returns The template with known placeholders replaced.
 */
export function substituteTemplate(template: string, values: EmbedSnippetValues = {}): string {
  const map: Record<string, string> = {
    width: coerceDimension(values.width),
    height: coerceDimension(values.height),
    theme: typeof values.theme === 'string' ? values.theme : '',
  }
  return template.replace(/\{\{\s*(width|height|theme)\s*\}\}/g, (_match, key: string) => {
    return map[key] ?? ''
  })
}
