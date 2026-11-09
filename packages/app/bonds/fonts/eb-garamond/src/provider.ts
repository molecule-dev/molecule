/**
 * EB Garamond font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** EB Garamond font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'EB Garamond',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/EBGaramond-VariableFont.ttf', import.meta.url).href,
        weight: '400 800',
        variable: true,
      },
      {
        file: new URL('../fonts/EBGaramond-Italic-VariableFont.ttf', import.meta.url).href,
        weight: '400 800',
        style: 'italic',
        variable: true,
      },
    ],
  },
}
