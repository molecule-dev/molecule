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
      { file: new URL('../fonts/Arimo-Regular.ttf', import.meta.url).href, weight: 400 },
      { file: new URL('../fonts/Arimo-Bold.ttf', import.meta.url).href, weight: 700 },
      {
        file: new URL('../fonts/Arimo-VariableFont_wght.ttf', import.meta.url).href,
        weight: '100 1000',
        variable: true,
      },
    ],
  },
}
