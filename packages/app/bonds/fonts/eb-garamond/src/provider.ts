/**
 * EB Garamond font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** EB Garamond font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'EB Garamond',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces,
  },
}
