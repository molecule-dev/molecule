/**
 * Property resource for molecule.dev.
 *
 * Provides CRUD handlers for properties (apartments, houses, hotels) with soft-delete,
 * pagination, status / type / city filtering, and units, photos, and amenities sub-resources.
 * All user-facing text is i18n-ready via the companion `@molecule/api-locales-property` bond.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-property'
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
