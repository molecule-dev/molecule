/**
 * Source Sans 3 font provider for molecule.dev.
 *
 * The registered family is `Source Sans Pro` — the name the shipped stylesheets
 * ask for. Adobe renamed the typeface to Source Sans 3; this bond serves the
 * current upstream variable font under the older family name, so a stylesheet
 * written against `'Source Sans Pro'` (the RealWorld Conduit theme among others)
 * renders without an edit.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Source Sans Pro (upstream: Source Sans 3) font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Source Sans Pro',
  role: 'sans',
  fallbacks: ['system-ui', '-apple-system', 'sans-serif'],
  source: {
    type: 'local',
    faces: [
      {
        file: new URL('../fonts/SourceSans3-VariableFont.ttf', import.meta.url).href,
        weight: '200 900',
        variable: true,
      },
    ],
  },
}
