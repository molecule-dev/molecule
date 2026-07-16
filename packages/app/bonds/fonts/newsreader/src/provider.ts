/**
 * Newsreader font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Newsreader font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Newsreader',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces: [{ file: 'Newsreader-VariableFont.ttf', weight: '200 800', variable: true }],
  },
}
