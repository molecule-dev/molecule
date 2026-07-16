/**
 * Lato font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Lato font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Lato',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      { file: 'Lato-Regular.ttf', weight: 400 },
      { file: 'Lato-Bold.ttf', weight: 700 },
    ],
  },
}
