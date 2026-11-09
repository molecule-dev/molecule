/**
 * Inter Tight font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Inter Tight font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Inter Tight',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/InterTight-VariableFont.ttf', import.meta.url).href,
        weight: '100 900',
        variable: true,
      },
    ],
  },
}
