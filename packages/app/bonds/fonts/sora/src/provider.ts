/**
 * Sora font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Sora font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Sora',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/Sora-VariableFont.ttf', import.meta.url).href,
        weight: '100 800',
        variable: true,
      },
    ],
  },
}
