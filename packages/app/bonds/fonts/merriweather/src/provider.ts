/**
 * Merriweather font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Merriweather font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Merriweather',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces: [{ file: 'Merriweather-VariableFont.ttf', weight: '300 900', variable: true }],
  },
}
