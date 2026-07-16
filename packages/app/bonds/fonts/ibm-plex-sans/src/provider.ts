/**
 * IBM Plex Sans font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** IBM Plex Sans font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'IBM Plex Sans',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [{ file: 'IBMPlexSans-VariableFont.ttf', weight: '100 700', variable: true }],
  },
}
