/**
 * IBM Plex Mono font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** IBM Plex Mono font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'IBM Plex Mono',
  role: 'mono',
  fallbacks: ['SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
  source: {
    type: 'local',
    faces: [
      { file: 'IBMPlexMono-Regular.ttf', weight: 400 },
      { file: 'IBMPlexMono-Bold.ttf', weight: 700 },
    ],
  },
}
