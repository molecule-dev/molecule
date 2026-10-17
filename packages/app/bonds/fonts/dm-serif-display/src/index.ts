/**
 * DM Serif Display font for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font as serif } from '@molecule/app-fonts-dm-serif-display'
 *
 * setFont(serif)   // once, at app startup — before first paint
 * ```
 *
 * @remarks
 * - **Wiring it without `mlcl` (the sandbox):** the package is already
 *   installed under `node_modules` — add an `"@molecule/app-fonts-dm-serif-display"`
 *   dependency to the app's `package.json` (pin the version already installed
 *   there), then in `app/src/bonds/index.ts` call `setFont(serif)`.
 *   Preferred: import the webfont as an asset so nothing is copied —
 *   `import woff from '@molecule/app-fonts-dm-serif-display/fonts/DMSerifDisplay-Regular.ttf?url'` then
 *   `setFont({ ...serif, source: { type: 'local', faces: [{ file: woff,
 *   weight: 400 }] } })`. `setFont()` uses a `file` starting with
 *   `/`, `http` or `data:` as-is.
 *   Without an asset import, copy
 *   `node_modules/@molecule/app-fonts-dm-serif-display/fonts/DMSerifDisplay-Regular.ttf` to
 *   `app/public/fonts/DMSerifDisplay-Regular.ttf` and call `setFont(serif)` — a
 *   plain filename is served from `<basePath>fonts/<file>`.
 *
 * @module
 */

export * from './provider.js'
