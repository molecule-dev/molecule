/**
 * Arimo font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** Arimo font definition — clean sans-serif, metrically compatible with Arial. */
export const font: FontDefinition = {
  family: 'Arimo',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces,
  },
}
