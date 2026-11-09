/**
 * Public Sans font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Public Sans font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Public Sans',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/PublicSans-VariableFont.ttf', import.meta.url).href,
        weight: '100 900',
        variable: true,
      },
    ],
  },
}
