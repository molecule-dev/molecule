/**
 * NativeWind UIClassMap bond for React Native, and the Tailwind preset that gives its classes the
 * web's values on iOS, Android and Expo web.
 *
 * The ClassMap is the web ClassMap (`@molecule/app-ui-tailwind`) with every class a device cannot
 * apply rewritten: sibling spacing (`space-y-*`) becomes `gap-y-*`; `group`/`peer`, pseudo-element,
 * arbitrary-selector and divider classes are dropped; a border with no colour gets the text colour
 * the web draws it in. The preset (`@molecule/app-ui-nativewind/preset`) defines what the ClassMap
 * names: every theme colour as a CSS variable the theme bond (`@molecule/app-theme-nativewind`)
 * sets, the font roles, the animations and Tailwind 4's radius, shadow and blur scales.
 *
 * @example
 * ```typescript
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-nativewind'
 *
 * setClassMap(classMap) // once, at app startup
 * ```
 *
 * ```js
 * // tailwind.config.js
 * const molecule = require('@molecule/app-ui-nativewind/preset')
 *
 * module.exports = {
 *   content: ['./src/**\/*.{ts,tsx}', ...molecule.moleculeContent(__dirname)],
 *   presets: [require('nativewind/preset'), molecule],
 * }
 * ```
 *
 * @remarks
 * - Without the preset in `tailwind.config.js`, no theme colour class (`bg-surface`,
 *   `text-foreground`, …) generates a style: the screen renders with no colours.
 * - `moleculeContent(__dirname)` returns the ClassMap packages' `dist` folders wherever npm
 *   installed them. Literal `./node_modules/@molecule/...` globs match nothing once npm hoists
 *   the packages (any workspace).
 * - Pass `inlineRem: 16` to `withNativeWind` in `metro.config.js` so `rem` sizes match the web
 *   (NativeWind's default is 14).
 * - This package emits class strings: the app configures NativeWind v4 itself (Babel preset,
 *   `metro.config.js`, `tailwind.config.js`). `nativewind` is not a dependency of this package.
 * - No CSS grid (`grid()` approximates it with flex-wrap), no `hover:` (touch uses `active:`), no
 *   `backdrop-blur`, no `position: fixed`, no portals (RN `Modal` handles overlays), no `prose`.
 *   Animations run on Reanimated. Don't hand-write utilities in app code: go through
 *   `getClassMap()`.
 *
 * @module
 */

export * from './classMap.js'
