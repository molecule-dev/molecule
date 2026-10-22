/**
 * Plus Jakarta Sans font for molecule.dev.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font } from '@molecule/app-fonts-plus-jakarta-sans'
 *
 * setFont(font)   // once, at app startup — before first paint
 * ```
 *
 * @remarks
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
