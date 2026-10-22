/**
 * Arimo font bond for molecule.dev — a clean sans-serif, metrically compatible
 * with Arial. Exports a ready-made `FontDefinition` (`font`, role `sans`) with
 * locally-served TTF faces (regular 400, bold 700, variable 100-1000).
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font } from '@molecule/app-fonts-arimo'
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
