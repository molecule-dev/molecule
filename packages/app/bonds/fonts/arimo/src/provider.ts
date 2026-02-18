/**
 * Arimo font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Arimo font definition — clean sans-serif, metrically compatible with Arial. */
export const font: FontDefinition = {
  family: 'Arimo',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      { file: 'Arimo-Regular.ttf', weight: 400 },
      { file: 'Arimo-Bold.ttf', weight: 700 },
      { file: 'Arimo-VariableFont_wght.ttf', weight: '100 1000', variable: true },
    ],
  },
}
