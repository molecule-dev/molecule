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
 * - **Wiring it without `mlcl` (the sandbox):** the package is already
 *   installed under `node_modules` — add an `"@molecule/app-fonts-source-sans-3"`
 *   dependency to the app's `package.json` (pin the version already installed
 *   there), then in `app/src/bonds/index.ts` call `setFont(sans)`.
 *   Preferred: import the webfont as an asset so nothing is copied —
 *   `import woff from '@molecule/app-fonts-source-sans-3/fonts/SourceSans3-VariableFont.ttf?url'` then
 *   `setFont({ ...sans, source: { type: 'local', faces: [{ file: woff,
 *   weight: '200 900' }] } })`. `setFont()` uses a `file` starting with
 *   `/`, `http` or `data:` as-is.
 *   Without an asset import, copy
 *   `node_modules/@molecule/app-fonts-source-sans-3/fonts/SourceSans3-VariableFont.ttf` to
 *   `app/public/fonts/SourceSans3-VariableFont.ttf` and call `setFont(sans)` — a
 *   plain filename is served from `<basePath>fonts/<file>`.
 *
 * @module
 */

export * from './provider.js'
