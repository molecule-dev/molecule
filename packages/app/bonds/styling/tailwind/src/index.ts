/**
 * Tailwind CSS styling utilities for molecule.dev.
 *
 * The Tailwind bond for `@molecule/app-styling`: registers `tailwind-merge` as the
 * class-conflict merger for `cn()`, converts molecule themes into Tailwind config
 * (`themeToTailwind`), and ships cva-based component presets (`buttonClasses`,
 * `inputClasses`, `cardClasses`, `badgeClasses`) plus responsive/state helpers
 * (`responsive`, `show`, `hide`, `dark`, `hover`, …).
 *
 * @example
 * ```typescript
 * // 1. App startup — register the merger so cn() resolves Tailwind conflicts:
 * import { registerTailwindClassMerger } from '@molecule/app-styling-tailwind'
 * registerTailwindClassMerger()
 *
 * // 2. tailwind.config.ts — derive the theme scale from the molecule theme:
 * import { themeToTailwind } from '@molecule/app-styling-tailwind'
 * import { lightTheme } from '@molecule/app-theme'
 * const tailwindConfig = { theme: { extend: themeToTailwind(lightTheme) } }
 * // …then `export default tailwindConfig` from tailwind.config.ts
 * ```
 *
 * @remarks
 * - **This is NOT the ClassMap bond.** Application components style via
 *   `getClassMap()` / `cm.*` from `@molecule/app-ui` (Tailwind ClassMap bond:
 *   `@molecule/app-ui-tailwind`). This package is infrastructure for styling/ClassMap
 *   bonds and shared-component plumbing — raw Tailwind class strings stay inside
 *   bond packages.
 * - **Call `registerTailwindClassMerger()` once at startup.** Without it,
 *   `cn()`/`cva()` from `@molecule/app-styling` just join strings — conflicting
 *   utilities (e.g. two `gap-*` classes) BOTH survive and "last class wins" silently
 *   doesn't apply.
 * - The cva presets emit semantic token classes (`bg-primary`, `bg-surface`, …) —
 *   they only resolve if the Tailwind config defines those colors; wire
 *   `themeToTailwind(theme)` into `theme.extend` as shown.
 *
 * @module
 */

export * from './presets.js'
export * from './responsive.js'
export * from './theme.js'
export * from './types.js'
export * from './utilities.js'
