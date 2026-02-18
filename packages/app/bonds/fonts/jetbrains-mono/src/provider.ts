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
      { file: 'JetBrainsMono-Regular.ttf', weight: 400 },
      { file: 'JetBrainsMono-Bold.ttf', weight: 700 },
      { file: 'JetBrainsMono-VariableFont_wght.ttf', weight: '100 800', variable: true },
    ],
  },
}
