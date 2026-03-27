/**
 * Shopping cart resource for molecule.dev.
 *
 * Provides a user-scoped singleton cart with item management, coupon support,
 * and computed totals (subtotal, discount, tax, total).
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-cart'
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
