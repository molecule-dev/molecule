/**
 * Liquid glass ClassMap extension for Tailwind CSS.
 *
 * Extends the base Tailwind ClassMap with backdrop-filter blur and
 * saturation effects on surface components (cards, modals, headers,
 * dropdowns, tooltips, toasts, drawers). Designed to pair with
 * translucent theme colors for a frosted glass appearance.
 *
 * @example
 * ```typescript
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind-glass'
 *
 * // Use instead of @molecule/app-ui-tailwind's classMap
 * setClassMap(classMap)
 * ```
 *
 * @remarks
 * This package extends (not replaces) the base Tailwind ClassMap.
 * All component classes remain identical — only surface components
 * gain backdrop-filter effects. Pair with a translucent theme preset
 * (e.g. `@molecule/app-theme-css-variables-liquid-glass`) for the full effect.
 *
 * @module
 */

export * from './classMap.js'
