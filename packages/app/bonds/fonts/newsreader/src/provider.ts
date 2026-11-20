/**
 * Newsreader font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** Newsreader font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Newsreader',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces,
  },
}
