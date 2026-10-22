/**
 * JetBrains Mono font bond for molecule.dev — a developer-focused monospace
 * font. Exports a ready-made `FontDefinition` (`font`, role `mono`) with
 * locally-served TTF faces (regular 400, bold 700, variable 100-800).
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font as mono } from '@molecule/app-fonts-jetbrains-mono'
 *
 * setFont(mono)   // once, at app startup — before first paint
 * ```
 *
 * @remarks
 * - **Fills the `mono` role only** (`--mol-font-mono` — code blocks, editors,
 *   terminals). It does not change the app's body font; pair with a sans bond
 *   (e.g. `@molecule/app-fonts-inter`) for UI text.
 * - **Wire with `setFont()` from `@molecule/app-fonts`, never a raw
 *   `bond('font', …)`** — `setFont()` sets the CSS variable and injects the
 *   `@font-face` rules; a raw bond renders nothing.
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
