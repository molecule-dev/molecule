/**
 * DM Sans font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** DM Sans font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'DM Sans',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/DMSans-VariableFont.ttf', import.meta.url).href,
        weight: '100 1000',
        variable: true,
      },
    ],
  },
}
