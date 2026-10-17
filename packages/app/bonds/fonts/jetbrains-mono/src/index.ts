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
 * - **Wiring it without `mlcl` (the sandbox):** the package is already
 *   installed under `node_modules` — add an `"@molecule/app-fonts-jetbrains-mono"`
 *   dependency to the app's `package.json` (pin the version already installed
 *   there), then in `app/src/bonds/index.ts` call `setFont(mono)`.
 *   Preferred: import each face as an asset so nothing is copied (one
 *   import per entry of `font.source.faces`) —
 *   `import face0 from '@molecule/app-fonts-jetbrains-mono/fonts/JetBrainsMono-Regular.ttf?url'` then
 *   `setFont({ ...mono, source: { type: 'local', faces: [{ file: face0,
 *   weight: 400 }] } })`, one entry per import. `setFont()` uses a
 *   `file` starting with `/`, `http` or `data:` as-is.
 *   Without asset imports, copy
 *   `node_modules/@molecule/app-fonts-jetbrains-mono/fonts/*` to `app/public/fonts/` and call
 *   `setFont(mono)` — plain filenames are served from
 *   `<basePath>fonts/<file>`.
 *
 * @module
 */

export * from './provider.js'
