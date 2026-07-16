/**
 * Playfair Display font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Playfair Display font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Playfair Display',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces: [{ file: 'PlayfairDisplay-VariableFont.ttf', weight: '400 900', variable: true }],
  },
}
