/**
 * Tag resource for molecule.dev.
 *
 * Provides CRUD for tags (name, slug, color, description) and a join-table
 * system for tagging any entity. Includes popular-tag and slug-based lookups.
 *
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-tag'
 *
 * // Wire routes into your Express app via mlcl inject
 * // Routes: POST/GET/PATCH/DELETE /tags, GET /tags/popular,
 * //         GET /tags/:slug/resources, POST/DELETE /:resourceType/:resourceId/tags
 * ```
 *
 * @module
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
