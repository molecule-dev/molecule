/**
 * Material Symbols Outlined font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

/** Material Symbols Outlined font definition — local, self-hosted (no external CDN). */
export const font: FontDefinition = {
  family: 'Material Symbols Outlined',
  role: 'icon',
  fallbacks: [],
  source: {
    type: 'local',
    faces: [{ file: 'MaterialSymbolsOutlined.woff2', weight: '100 700', variable: true }],
  },
  utilityCss:
    ".material-symbols-outlined {\n  font-family: 'Material Symbols Outlined';\n  font-weight: normal;\n  font-style: normal;\n  font-size: 24px;\n  line-height: 1;\n  letter-spacing: normal;\n  text-transform: none;\n  display: inline-block;\n  white-space: nowrap;\n  word-wrap: normal;\n  direction: ltr;\n  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;\n  -webkit-font-feature-settings: 'liga';\n  -webkit-font-smoothing: antialiased;\n}",
}
