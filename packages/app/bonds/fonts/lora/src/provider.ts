/**
 * Lora font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Lora font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Lora',
  role: 'serif',
  fallbacks: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
  source: {
    type: 'local',
    faces: [{ file: 'Lora-VariableFont.ttf', weight: '400 700', variable: true }],
  },
}
