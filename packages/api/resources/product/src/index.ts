/**
 * Product catalog resource for molecule.dev.
 *
 * Provides CRUD handlers for products with soft-delete, pagination, status filtering,
 * and variant sub-resources. All user-facing text is i18n-ready via companion locale bonds.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-product'
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
