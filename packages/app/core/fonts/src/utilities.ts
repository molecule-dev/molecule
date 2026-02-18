/**
 * Font utility functions for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from './types.js'

/** System sans-serif font stack (used when no provider is configured). */
export const systemSans: FontDefinition = {
  family: 'system-ui',
  role: 'sans',
  fallbacks: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ],
  source: { type: 'system' },
}

/** System serif font stack (used when no provider is configured). */
export const systemSerif: FontDefinition = {
  family: 'Georgia',
  role: 'serif',
  fallbacks: ['"Times New Roman"', 'Times', 'serif'],
  source: { type: 'system' },
}

/** System monospace font stack (used when no provider is configured). */
export const systemMono: FontDefinition = {
  family: 'SFMono-Regular',
  role: 'mono',
  fallbacks: ['Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
  source: { type: 'system' },
}

/**
 * Build a CSS font-family value from a FontDefinition.
 *
 * @example
 * ```typescript
 * buildFontFamily(arimoFont)
 * // => "'Arimo', system-ui, -apple-system, sans-serif"
 * ```
 * @param font - The font definition containing a primary family and fallback list.
 * @returns A CSS-ready `font-family` string (e.g. `"'Arimo', system-ui, sans-serif"`).
 */
export function buildFontFamily(font: FontDefinition): string {
  const primary = font.family.includes(' ') ? `'${font.family}'` : font.family
  return [primary, ...font.fallbacks].join(', ')
}
