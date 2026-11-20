/**
 * JetBrains Mono font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { faces } from './font-faces.js'

/** JetBrains Mono font definition — developer-focused monospace font. */
export const font: FontDefinition = {
  family: 'JetBrains Mono',
  role: 'mono',
  fallbacks: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  source: {
    type: 'local',
    faces,
  },
}
