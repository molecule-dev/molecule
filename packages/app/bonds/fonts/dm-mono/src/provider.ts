/**
 * DM Mono font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** DM Mono font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'DM Mono',
  role: 'mono',
  fallbacks: ['SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
  source: {
    type: 'local',
    faces,
  },
}
