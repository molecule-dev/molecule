/**
 * Inter Tight font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** Inter Tight font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Inter Tight',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces,
  },
}
