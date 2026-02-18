/**
 * Inter font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Inter font definition — modern sans-serif designed for screens. */
export const font: FontDefinition = {
  family: 'Inter',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      { file: 'Inter-Regular.ttf', weight: 400 },
      { file: 'Inter-Bold.ttf', weight: 700 },
      { file: 'Inter-VariableFont_opsz,wght.ttf', weight: '100 900', variable: true },
    ],
  },
}
