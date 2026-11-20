/**
 * DM Sans font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** DM Sans font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'DM Sans',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces,
  },
}
