/**
 * Ionicons 2.0.1 icon font provider for molecule.dev.
 *
 * @module
 */

import type { FontDefinition } from '@molecule/app-fonts'

import { ioniconsUtilityCss } from './utility-css.js'

/**
 * The webfont's own URL, resolved from this module rather than a public path.
 *
 * `setFont()` uses a face `file` that is already a URL as-is, so the default
 * definition needs no copy into `public/fonts/`: the package's `fonts/`
 * directory is the source of truth. A bundler (Vite) rewrites this `new URL`
 * against `import.meta.url` and emits the `.woff` as a hashed asset in the
 * production build; under Node the same expression is the package file's
 * `file:` URL. Resolving `dist/provider.js` upward by one directory lands on
 * the package root, whose `fonts/` the published tarball ships.
 */
const webfontUrl = new URL('../fonts/ionicons.woff', import.meta.url).href

/**
 * Ionicons 2.0.1 font definition — local, self-hosted (no external CDN).
 *
 * Markup rendered by the Ionicons 2.x class names (`<i class="ion-heart">`,
 * `ion-plus-round`, `ion-edit`, `ion-trash-a`, `ion-gear-a`, `ion-compose`, …
 * — the set the RealWorld "Conduit" spec's markup uses) needs this provider
 * bonded: without the webfont the `<i>` elements render 0×0 and their click
 * targets vanish. The full `.ion-*` glyph map ships as `utilityCss`, injected
 * by `setFont()` alongside the `@font-face`.
 *
 * The default face is the package's own webfont URL, so `setFont(font)` alone
 * delivers the file in dev and in the production build — no copy into the
 * app's `public/fonts/` and no app-side asset import.
 */
export const font: FontDefinition = {
  family: 'Ionicons',
  role: 'icon',
  fallbacks: [],
  source: {
    type: 'local',
    faces: [{ file: webfontUrl, weight: 400 }],
  },
  utilityCss: ioniconsUtilityCss,
}
