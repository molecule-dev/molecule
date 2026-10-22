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
      { file: new URL('../fonts/Lato-Regular.ttf', import.meta.url).href, weight: 400 },
      { file: new URL('../fonts/Lato-Bold.ttf', import.meta.url).href, weight: 700 },
    ],
  },
}
