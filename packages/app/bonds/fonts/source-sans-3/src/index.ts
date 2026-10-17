/**
 * Source Sans Pro font for molecule.dev — the current upstream Source Sans 3
 * variable font, served locally under the family name `Source Sans Pro`.
 *
 * Use this for any stylesheet that asks for `'Source Sans Pro', sans-serif`
 * (the RealWorld/Conduit theme among others) instead of downloading the font
 * from a CDN or `npm pack`ing fontsource in the sandbox. The bond registers the
 * `sans` role and injects the `@font-face` for the packaged file.
 *
 * @example
 * ```typescript
 * import { setFont } from '@molecule/app-fonts'
 * import { font as sans } from '@molecule/app-fonts-source-sans-3'
 *
 * setFont(sans)   // once, at app startup — before first paint
 * ```
 *
 * @remarks
 * - The package name follows the font's current upstream name (Adobe renamed
 *   Source Sans Pro to Source Sans 3); the `family` is `Source Sans Pro` so the
 *   CSS family a shipped theme writes matches with no edit.
 * - The packaged `fonts/SourceSans3-VariableFont.ttf` is served from
 *   `<basePath>fonts/`, so a project that does not use the scaffold's font
 *   copy step must copy it into `public/fonts/` itself.
 *
 * @module
 */

export * from './provider.js'
