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
 * - **Serve this package's `fonts/` directory at `/fonts/`** or every face
 *   silently 404s and the system monospace fallback renders.
 *
 * @module
 */

export * from './provider.js'
