/**
 * Plus Jakarta Sans font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Plus Jakarta Sans font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Plus Jakarta Sans',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [{ file: 'PlusJakartaSans-VariableFont.ttf', weight: '200 800', variable: true }],
  },
}
