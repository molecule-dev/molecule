/**
 * Lato font for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font } from '@molecule/app-fonts-lato'
 *
 * setFont(font)   // once, at app startup — before first paint
 * ```
 *
 * @remarks
 * - **Wiring it without `mlcl` (the sandbox):** the package is already
 *   installed under `node_modules` — add an `"@molecule/app-fonts-lato"`
 *   dependency to the app's `package.json` (pin the version already installed
 *   there), then in `app/src/bonds/index.ts` call `setFont(font)`.
 *   Preferred: import each face as an asset so nothing is copied (one
 *   import per entry of `font.source.faces`) —
 *   `import face0 from '@molecule/app-fonts-lato/fonts/Lato-Regular.ttf?url'` then
 *   `setFont({ ...font, source: { type: 'local', faces: [{ file: face0,
 *   weight: 400 }] } })`, one entry per import. `setFont()` uses a
 *   `file` starting with `/`, `http` or `data:` as-is.
 *   Without asset imports, copy
 *   `node_modules/@molecule/app-fonts-lato/fonts/*` to `app/public/fonts/` and call
 *   `setFont(font)` — plain filenames are served from
 *   `<basePath>fonts/<file>`.
 *
 * @module
 */

export * from './provider.js'
