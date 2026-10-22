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
      { file: new URL('../fonts/IBMPlexMono-Regular.ttf', import.meta.url).href, weight: 400 },
      { file: new URL('../fonts/IBMPlexMono-Bold.ttf', import.meta.url).href, weight: 700 },
    ],
  },
}
