/**
 * Source Sans Pro font for molecule.dev — the current upstream Source Sans 3
 * variable font, served locally under the family name `Source Sans Pro`.
 *
 * Use this for any stylesheet that asks for `'Source Sans Pro', sans-serif`
 * (the RealWorld/Conduit theme among others) instead of downloading the font
 * from a CDN or `npm pack`ing fontsource in the sandbox. The bond registers the
 * `sans` role and injects the `@font-face` for the packaged file.
 *
 * **Do not `npm install source-sans-pro`** (or `@fontsource/source-sans-pro`,
 * `typeface-source-sans-pro`) for a stylesheet that asks for this family: this
 * bond IS the family, already available to the sandbox, and wiring it is one
 * `setFont()` call. The install only adds a second, unused copy under the
 * workspace root's `node_modules` after ~90 s, and that copy is not where a
 * path relative to the app directory looks.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font as sans } from '@molecule/app-fonts-source-sans-3'
 *
 * setFont(sans)   // once, at app startup — before first paint
 * ```
 *
 * @remarks
 * - The package name follows the font's current upstream name (Adobe renamed
 *   Source Sans Pro to Source Sans 3); the `family` is `Source Sans Pro` so the
 *   CSS family a shipped theme writes matches with no edit.
 * - **Browser wiring:** import `font` from this package and call `setFont(font)`
 *   at startup. The packaged faces resolve relative to this module; the browser
 *   bundler emits the complete files as fingerprinted assets, including its
 *   configured public base path. No manual copy or app-side asset import is needed.
 * - The registry retains filenames for `mlcl` static font copying. A custom
 *   face may still use a plain filename with `setFont`'s `basePath` option.
 *
 * @module
 */

export * from './provider.js'
