/**
 * Sora font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** Sora font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Sora',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces,
  },
}
