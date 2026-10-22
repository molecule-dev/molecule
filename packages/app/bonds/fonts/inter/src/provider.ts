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
      { file: new URL('../fonts/Inter-Regular.ttf', import.meta.url).href, weight: 400 },
      { file: new URL('../fonts/Inter-Bold.ttf', import.meta.url).href, weight: 700 },
      {
        file: new URL('../fonts/Inter-VariableFont_opsz,wght.ttf', import.meta.url).href,
        weight: '100 900',
        variable: true,
      },
    ],
  },
}
