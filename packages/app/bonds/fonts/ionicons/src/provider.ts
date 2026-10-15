/**
 * Ionicons 2.0.1 icon font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { ioniconsUtilityCss } from './utility-css.js'

/**
 * Ionicons 2.0.1 font definition — local, self-hosted (no external CDN).
 *
 * Markup rendered by the Ionicons 2.x class names (`<i class="ion-heart">`,
 * `ion-plus-round`, `ion-edit`, `ion-trash-a`, `ion-gear-a`, `ion-compose`, …
 * — the set the RealWorld "Conduit" spec's markup uses) needs this provider
 * bonded: without the webfont the `<i>` elements render 0×0 and their click
 * targets vanish. The full `.ion-*` glyph map ships as `utilityCss`, injected
 * by `setFont()` alongside the `@font-face`.
 */
export const font: FontDefinition = {
  family: 'Ionicons',
  role: 'icon',
  fallbacks: [],
  source: {
    type: 'local',
    faces: [{ file: 'ionicons.woff', weight: 400 }],
  },
  utilityCss: ioniconsUtilityCss,
}
