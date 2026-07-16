/**
 * Manrope font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Manrope font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Manrope',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [{ file: 'Manrope-VariableFont.ttf', weight: '200 800', variable: true }],
  },
}
