/**
 * DM Serif Display font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** DM Serif Display font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'DM Serif Display',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces: [{ file: 'DMSerifDisplay-Regular.ttf', weight: 400 }],
  },
}
