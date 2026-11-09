/**
 * Space Mono font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Space Mono font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Space Mono',
  role: 'mono',
  fallbacks: ['SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/SpaceMono-Regular.ttf', import.meta.url).href,
        weight: 400,
      },
      {
        file: new URL('../fonts/SpaceMono-Bold.ttf', import.meta.url).href,
        weight: 700,
      },
      {
        file: new URL('../fonts/SpaceMono-Italic.ttf', import.meta.url).href,
        weight: 400,
        style: 'italic',
      },
    ],
  },
}
