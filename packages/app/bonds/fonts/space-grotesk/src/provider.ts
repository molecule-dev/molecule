/**
 * Space Grotesk font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Space Grotesk font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Space Grotesk',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/SpaceGrotesk-VariableFont.ttf', import.meta.url).href,
        weight: '300 700',
        variable: true,
      },
    ],
  },
}
