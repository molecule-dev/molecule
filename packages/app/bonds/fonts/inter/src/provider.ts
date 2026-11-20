/**
 * Inter font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** Inter font definition — modern sans-serif designed for screens. */
export const font: FontDefinition = {
  family: 'Inter',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces,
  },
}
