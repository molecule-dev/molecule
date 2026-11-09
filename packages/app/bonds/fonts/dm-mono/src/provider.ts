/**
 * DM Mono font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** DM Mono font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'DM Mono',
  role: 'mono',
  fallbacks: ['SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/DMMono-Regular.ttf', import.meta.url).href,
        weight: 400,
      },
      {
        file: new URL('../fonts/DMMono-Medium.ttf', import.meta.url).href,
        weight: 500,
      },
      {
        file: new URL('../fonts/DMMono-Italic.ttf', import.meta.url).href,
        weight: 400,
        style: 'italic',
      },
    ],
  },
}
