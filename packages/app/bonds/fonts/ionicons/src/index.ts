/**
 * Ionicons 2.0.1 icon font for molecule.dev — self-hosted, no external CDN.
 *
 * **Bond this provider when the app's markup renders icons through Ionicons
 * 2.x `i.ion-*` classes** (`<i class="ion-heart">`, `ion-plus-round`,
 * `ion-edit`, `ion-trash-a`, `ion-gear-a`, `ion-compose`, … — the class-name
 * set the RealWorld "Conduit" spec's markup is written against). Without it
 * the icon webfont is never loaded: every `<i class="ion-*">` renders 0×0,
 * glyphs disappear and e2e click targets on icon buttons fail.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font as icons } from '@molecule/app-fonts-ionicons'
 *
 * setFont(icons)   // once, at app startup — before first paint
 * ```
 *
 * `setFont()` injects the `@font-face` — whose source is the package's own
 * webfont URL, emitted as a hashed asset by the bundler — plus the full
 * `.ion-*` glyph stylesheet, so plain markup like
 *
 * ```html
 * <i class="ion-heart"></i>
 * ```
 *
 * renders its glyph with nothing else to wire. There is no file to copy into
 * `app/public/` and no app-side asset import. To bond it:
 *
 * ```bash
 * mlcl add @molecule/app-fonts-ionicons
 * ```
 *
 * @remarks
 * - **Wire with `setFont()` from `@molecule/app-fonts`, never a raw
 *   `bond('font', …)`** — `setFont()` injects the `@font-face` and the glyph
 *   CSS; a raw bond renders nothing.
 * - This is the Ionicons **2.0.x** class-name set (`ion-heart`, not the
 *   version 4+ `ion-md-heart` names). Current Ionicons (4/5/6/7) use
 *   different class names and different packages; this provider exists so
 *   markup written against the 2.x names (RealWorld Conduit and its
 *   ecosystem) works self-hosted.
 * - **Wiring it without `mlcl` (the sandbox):** the package is already
 *   installed under `node_modules` — add an `"@molecule/app-fonts-ionicons"`
 *   dependency to the app's `package.json` (pin the version already installed
 *   there), then in `app/src/bonds/index.ts` call `setFont(icons)`. That is
 *   the whole wiring: the exported definition's face is
 *   `new URL('../fonts/ionicons.woff', import.meta.url)`, which the bundler
 *   resolves to the emitted asset in both dev and the production build.
 *   Copying the file into `app/public/fonts/` is unnecessary; a missing file
 *   there is not a configuration to add.
 * - **A face URL that answers with HTML means the file is not there.** If the
 *   browser reports `Failed to decode downloaded font: <url>` with
 *   `OTS parsing error: invalid sfntVersion: 1008821359` (0x3C21646F), the URL served
 *   the app's `index.html` (the SPA fallback), not a font — check how the
 *   face's `file` resolved instead of replacing the `<i>` elements.
 *
 * @module
 */

export * from './provider.js'
