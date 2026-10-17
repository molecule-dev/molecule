/**
 * Inter font bond for molecule.dev — a modern sans-serif designed for screens.
 * Exports a ready-made `FontDefinition` (`font`, role `sans`) with
 * locally-served TTF faces (regular 400, bold 700, variable 100-900).
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font } from '@molecule/app-fonts-inter'
 *
 * setFont(font)   // once, at app startup — before first paint
 * ```
 *
 * @remarks
 * - **Wire with `setFont()` from `@molecule/app-fonts`, never a raw
 *   `bond('font', …)`** — `setFont()` is what sets the `--mol-font-sans` CSS
 *   variable and injects the `@font-face` rules; a raw bond registers the
 *   definition but renders nothing.
 * - Fills the `sans` role only — `serif`/`mono` stay on system stacks unless
 *   another font bond is wired. Consume via `var(--mol-font-sans)`, never a
 *   hardcoded `font-family`.
 * - **Wiring it without `mlcl` (the sandbox):** the package is already
 *   installed under `node_modules` — add an `"@molecule/app-fonts-inter"`
 *   dependency to the app's `package.json` (pin the version already installed
 *   there), then in `app/src/bonds/index.ts` call `setFont(font)`.
 *   Preferred: import each face as an asset so nothing is copied (one
 *   import per entry of `font.source.faces`) —
 *   `import face0 from '@molecule/app-fonts-inter/fonts/Inter-Regular.ttf?url'` then
 *   `setFont({ ...font, source: { type: 'local', faces: [{ file: face0,
 *   weight: 400 }] } })`, one entry per import. `setFont()` uses a
 *   `file` starting with `/`, `http` or `data:` as-is.
 *   Without asset imports, copy
 *   `node_modules/@molecule/app-fonts-inter/fonts/*` to `app/public/fonts/` and call
 *   `setFont(font)` — plain filenames are served from
 *   `<basePath>fonts/<file>`.
 *
 * @module
 */

export * from './provider.js'
