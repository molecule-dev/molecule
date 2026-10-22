/**
 * JetBrains Mono font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** JetBrains Mono font definition — developer-focused monospace font. */
export const font: FontDefinition = {
  family: 'JetBrains Mono',
  role: 'mono',
  fallbacks: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  source: {
    type: 'local',
    faces: [
      { file: new URL('../fonts/JetBrainsMono-Regular.ttf', import.meta.url).href, weight: 400 },
      { file: new URL('../fonts/JetBrainsMono-Bold.ttf', import.meta.url).href, weight: 700 },
      {
        file: new URL('../fonts/JetBrainsMono-VariableFont_wght.ttf', import.meta.url).href,
        weight: '100 800',
        variable: true,
      },
    ],
  },
}
