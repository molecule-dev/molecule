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
 * - **Serve this package's `fonts/` directory at the public path `/fonts/`**
 *   (e.g. copy `node_modules/@molecule/app-fonts-inter/fonts/*` to the app's
 *   `public/fonts/`). Every `@font-face` src is `/fonts/<file>`; missing files
 *   silently 404 and the fallback stack renders instead.
 * - Fills the `sans` role only — `serif`/`mono` stay on system stacks unless
 *   another font bond is wired. Consume via `var(--mol-font-sans)`, never a
 *   hardcoded `font-family`.
 *
 * @module
 */

export * from './provider.js'
