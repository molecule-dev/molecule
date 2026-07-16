/**
 * Source Serif 4 font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Source Serif 4 font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Source Serif 4',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces: [{ file: 'SourceSerif4-VariableFont.ttf', weight: '200 900', variable: true }],
  },
}
