/**
 * Caveat font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** Caveat font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Caveat',
  role: 'sans',
  fallbacks: ['cursive'],
  source: {
    type: 'local',
    faces,
  },
}
