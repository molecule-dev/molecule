/**
 * IBM Plex Mono font for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font as mono } from '@molecule/app-fonts-ibm-plex-mono'
 *
 * setFont(mono)   // once, at app startup — before first paint
 * ```
 *
 * @remarks
 * - **Wiring it without `mlcl` (the sandbox):** the package is already
 *   installed under `node_modules` — add an `"@molecule/app-fonts-ibm-plex-mono"`
 *   dependency to the app's `package.json` (pin the version already installed
 *   there), then in `app/src/bonds/index.ts` call `setFont(mono)`.
 *   Preferred: import each face as an asset so nothing is copied (one
 *   import per entry of `font.source.faces`) —
 *   `import face0 from '@molecule/app-fonts-ibm-plex-mono/fonts/IBMPlexMono-Regular.ttf?url'` then
 *   `setFont({ ...mono, source: { type: 'local', faces: [{ file: face0,
 *   weight: 400 }] } })`, one entry per import. `setFont()` uses a
 *   `file` starting with `/`, `http` or `data:` as-is.
 *   Without asset imports, copy
 *   `node_modules/@molecule/app-fonts-ibm-plex-mono/fonts/*` to `app/public/fonts/` and call
 *   `setFont(mono)` — plain filenames are served from
 *   `<basePath>fonts/<file>`.
 *
 * @module
 */

export * from './provider.js'
