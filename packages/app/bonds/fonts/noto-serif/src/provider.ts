/**
 * Noto Serif font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Noto Serif font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Noto Serif',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/NotoSerif-VariableFont.ttf', import.meta.url).href,
        weight: '100 900',
        variable: true,
      },
      {
        file: new URL('../fonts/NotoSerif-Italic-VariableFont.ttf', import.meta.url).href,
        weight: '100 900',
        style: 'italic',
        variable: true,
      },
    ],
  },
}
