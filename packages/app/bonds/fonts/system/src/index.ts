/**
 * System font bond for molecule.dev — the native OS font stack (`system-ui`
 * with platform fallbacks). Zero font files, zero network requests, instant
 * first paint. Exports a ready-made `FontDefinition` (`font`, role `sans`).
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font } from '@molecule/app-fonts-system'
 *
 * setFont(font)   // once, at app startup
 * ```
 *
 * @remarks
 * - Nothing to serve or copy — there are no font files; `setFont()` only sets
 *   `--mol-font-sans` to the system stack.
 * - **Wire with `setFont()` from `@molecule/app-fonts`, never a raw
 *   `bond('font', …)`** — the CSS variable is only set by `setFont()`.
 * - Fills the `sans` role only; `serif`/`mono` keep their own system defaults.
 *
 * @module
 */

export * from './provider.js'
