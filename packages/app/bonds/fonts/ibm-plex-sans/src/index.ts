/**
 * IBM Plex Sans font for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font } from '@molecule/app-fonts-ibm-plex-sans'
 *
 * setFont(font)   // once, at app startup — before first paint
 * ```
 *
 * @remarks
 * - **Wiring it without `mlcl` (the sandbox):** the package is already
 *   installed under `node_modules` — add an `"@molecule/app-fonts-ibm-plex-sans"`
 *   dependency to the app's `package.json` (pin the version already installed
 *   there), then in `app/src/bonds/index.ts` call `setFont(font)`.
 *   Preferred: import the webfont as an asset so nothing is copied —
 *   `import woff from '@molecule/app-fonts-ibm-plex-sans/fonts/IBMPlexSans-VariableFont.ttf?url'` then
 *   `setFont({ ...font, source: { type: 'local', faces: [{ file: woff,
 *   weight: '100 700' }] } })`. `setFont()` uses a `file` starting with
 *   `/`, `http` or `data:` as-is.
 *   Without an asset import, copy
 *   `node_modules/@molecule/app-fonts-ibm-plex-sans/fonts/IBMPlexSans-VariableFont.ttf` to
 *   `app/public/fonts/IBMPlexSans-VariableFont.ttf` and call `setFont(font)` — a
 *   plain filename is served from `<basePath>fonts/<file>`.
 *
 * @module
 */

export * from './provider.js'
