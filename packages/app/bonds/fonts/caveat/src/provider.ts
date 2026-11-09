/**
 * Caveat font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Caveat font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Caveat',
  role: 'sans',
  fallbacks: ['cursive'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/Caveat-VariableFont.ttf', import.meta.url).href,
        weight: '400 700',
        variable: true,
      },
    ],
  },
}
