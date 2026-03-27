/**
 * Inventory resource for molecule.dev.
 *
 * Provides stock tracking with reservations, low-stock alerts,
 * movement history, and bulk update support.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-inventory'
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
