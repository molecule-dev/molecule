/**
 * System font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** System font definition — native OS fonts, zero network requests. */
export const font: FontDefinition = {
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
