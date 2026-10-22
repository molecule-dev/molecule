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
    faces: [
      {
        file: new URL('../fonts/Manrope-VariableFont.ttf', import.meta.url).href,
        weight: '200 800',
        variable: true,
      },
    ],
  },
}
