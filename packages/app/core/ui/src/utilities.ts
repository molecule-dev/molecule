/**
 * UI utility functions for molecule.dev.
 *
 * @module
 */

import type { UIClassMap } from './types.js'

/**
 * Overrides for extending a UIClassMap.
 *
 * Can be a partial map of token replacements, or a function that receives
 * the base ClassMap and returns overrides (useful for extending resolver
 * functions while preserving the base behavior).
 *
 * @example Static overrides (replace tokens):
 * ```typescript
 * const overrides = {
 *   page: 'my-dark-page my-page-text',
 *   cardInteractive: 'my-card-hover my-card-transition',
 * }
 * ```
 *
 * @example Function overrides (extend resolvers):
 * ```typescript
 * const overrides = (base) => ({
 *   button: (opts) => base.cn(base.button(opts), 'my-rounded-button'),
 *   page: base.cn(base.page, 'my-monospace'),
 * })
 * ```
 */
export type ClassMapOverrides = Partial<UIClassMap> | ((base: UIClassMap) => Partial<UIClassMap>)

/**
 * Creates a new UIClassMap by extending a base ClassMap with overrides.
 *
 * Overrides can be a plain object (for replacing specific tokens/resolvers)
 * or a function that receives the base map (for extending resolvers while
 * preserving base behavior).
 *
 * @param base - The base UIClassMap to extend
 * @param overrides - Token overrides (object or function returning object)
 * @returns A new UIClassMap with overrides applied
 *
 * @example Replace static tokens:
 * ```typescript
 * import { classMap } from '`@molecule/app-ui-tailwind`'
 * import { extendClassMap, setClassMap } from '`@molecule/app-ui`'
 *
 * setClassMap(extendClassMap(classMap, {
 *   page: 'my-dark-page my-page-text',
 *   headerBar: 'my-header-dark my-header-border',
 *   cardInteractive: 'my-card-hover my-card-transition',
 * }))
 * ```
 *
 * @example Extend resolver functions:
 * ```typescript
 * setClassMap(extendClassMap(classMap, (base) => ({
 *   button: (opts) => base.cn(base.button(opts), 'my-rounded-button'),
 *   card: (opts) => base.cn(base.card(opts), 'my-elevated-card'),
 *   badge: (opts) => base.cn(base.badge(opts), 'my-monospace-badge'),
 * })))
 * ```
 *
 * @example Combine both patterns:
 * ```typescript
 * setClassMap(extendClassMap(classMap, (base) => ({
 *   // Extend a resolver (add to base output)
 *   button: (opts) => base.cn(base.button(opts), 'my-rounded-button'),
 *   // Replace a static token entirely
 *   page: 'my-dark-page my-green-text my-monospace',
 *   // Replace a resolver entirely
 *   spinner: () => 'my-pulse-animation my-spinner-size my-spinner-shape',
 * })))
 * ```
 */
export function extendClassMap(base: UIClassMap, overrides: ClassMapOverrides): UIClassMap {
  const resolved = typeof overrides === 'function' ? overrides(base) : overrides
  return { ...base, ...resolved }
}
