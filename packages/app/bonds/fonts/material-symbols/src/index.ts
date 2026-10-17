/**
 * Material Symbols Outlined font for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font as icons } from '@molecule/app-fonts-material-symbols'
 *
 * setFont(icons)   // once, at app startup — before first paint
 * ```
 *
 * Glyphs render through the `.material-symbols-outlined` utility class
 * (injected by `setFont()` with the `@font-face`), using ligature names:
 *
 * ```html
 * <span class="material-symbols-outlined">home</span>
 * ```
 *
 * @remarks
 * - **Wiring it without `mlcl` (the sandbox):** the package is already
 *   installed under `node_modules` — add an `"@molecule/app-fonts-material-symbols"`
 *   dependency to the app's `package.json` (pin the version already installed
 *   there), then in `app/src/bonds/index.ts` call `setFont(icons)`.
 *   Preferred: import the webfont as an asset so nothing is copied —
 *   `import woff from '@molecule/app-fonts-material-symbols/fonts/MaterialSymbolsOutlined.woff2?url'` then
 *   `setFont({ ...icons, source: { type: 'local', faces: [{ file: woff,
 *   weight: '100 700' }] } })`. `setFont()` uses a `file` starting with
 *   `/`, `http` or `data:` as-is.
 *   Without an asset import, copy
 *   `node_modules/@molecule/app-fonts-material-symbols/fonts/MaterialSymbolsOutlined.woff2` to
 *   `app/public/fonts/MaterialSymbolsOutlined.woff2` and call `setFont(icons)` — a
 *   plain filename is served from `<basePath>fonts/<file>`.
 *
 * @module
 */

export * from './provider.js'
