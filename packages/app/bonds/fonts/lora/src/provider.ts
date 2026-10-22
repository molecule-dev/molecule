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
    faces: [
      {
        file: new URL('../fonts/Lora-VariableFont.ttf', import.meta.url).href,
        weight: '400 700',
        variable: true,
      },
    ],
  },
}
